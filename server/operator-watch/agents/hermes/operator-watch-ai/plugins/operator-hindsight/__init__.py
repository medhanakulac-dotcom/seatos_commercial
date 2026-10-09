"""operator-hindsight — Hindsight memory for the operator-watch-ai profile, scoped per operator.

One shared bank (default `operator-watch`). Every memory is tagged from the backend's envelope header
(contracts/agent-envelope: `[[operator:<id>]] [[kind:…]] [[seatos:<n>]]`, see envelope.py), never from the model:
  recall  → this operator's memories OR `scope:global` lessons (unbound messages: global only)
  retain  → `operator:<id>`, `kind:<chat|case|decision|email>`; headerless (e.g. Slack) → `scope:unbound`
Topic tags (`topic:*`) are added server-side by the bank's entity labels (setup_bank.py), not here.
No retain tool is exposed, so the model cannot write memories with tags of its own.
Config (env): HINDSIGHT_API_URL, HINDSIGHT_API_KEY, OPERATOR_MEMORY_BANK, OPERATOR_MEMORY_RECALL_BUDGET.
"""
from __future__ import annotations

import json
import logging
import os
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from agent.memory_provider import MemoryProvider

from .envelope import Envelope, parse, recall_filter, tags_for
from .http_client import HindsightHttp

logger = logging.getLogger(__name__)

RECORD_ONLY_PREFIX = "Record only"
CASE_QUERY = "past assessments, outreach outcomes, decisions and the reasons behind them"
MAX_RECALL_TOKENS = 1500
TRIVIAL_CHARS = 12
#: Platforms where a person types the message directly: a header there could be forged, so it is ignored.
HUMAN_PLATFORMS = {"slack", "telegram", "discord", "whatsapp", "signal", "matrix"}


def _case_summary(messages: Optional[List[Dict[str, Any]]]) -> str:
    """The case the agent actually submitted this turn (submit_case arguments), if any."""
    for msg in reversed(messages or []):
        for call in msg.get("tool_calls") or []:
            fn = call.get("function") or {}
            if not str(fn.get("name", "")).endswith("submit_case"):
                continue
            try:
                args = json.loads(fn.get("arguments") or "{}")
            except (TypeError, ValueError):
                return ""
            parts = [
                f"Needs outreach: {args.get('needs_outreach')}",
                f"Analysis: {args.get('analysis', '')}",
                *(f"{k.replace('_', ' ').capitalize()}: {args[k]}" for k in ("next_step", "reason", "playbook", "play_type") if args.get(k)),
            ]
            return "\n".join(parts)
    return ""


def build_retain(env: Envelope, assistant: str, messages: Optional[List[Dict[str, Any]]]) -> Optional[str]:
    """What is worth remembering from one turn, or None. Operator briefs and acknowledgements are dropped."""
    if env.kind in ("decision", "email"):
        lines = [line for line in env.said.splitlines() if not line.startswith(RECORD_ONLY_PREFIX)]
        return "\n".join(lines).strip() or None
    if env.kind == "case":
        submitted = _case_summary(messages)
        return f"Operator Watch assessment.\n{submitted or assistant}".strip()
    if len(env.said) < TRIVIAL_CHARS and len(assistant) < 40:
        return None
    who = env.asker or "User"
    return f"{who}: {env.said}\nAssistant: {assistant}"


def format_recall(results: List[Any], operator_id: Optional[str]) -> str:
    if not results:
        return ""
    title = f"Long-term memory for operator {operator_id}" if operator_id else "Long-term team memory"
    lines = []
    for r in results:
        when = (getattr(r, "occurred_start", None) or getattr(r, "mentioned_at", None) or "")[:10]
        scope = "team-wide" if "scope:global" in (getattr(r, "tags", None) or []) else ""
        meta = ", ".join(x for x in (when, scope) if x)
        lines.append(f"- {r.text}" + (f" ({meta})" if meta else ""))
    return f"## {title} (recalled; may be outdated — prefer live data)\n" + "\n".join(lines)


class OperatorHindsightProvider(MemoryProvider):
    def __init__(self) -> None:
        self._client = None
        self._bank = os.environ.get("OPERATOR_MEMORY_BANK", "operator-watch")
        self._budget = os.environ.get("OPERATOR_MEMORY_RECALL_BUDGET", "low")
        self._platform = "unknown"
        self._writes = True
        self._lock = threading.Lock()

    @property
    def name(self) -> str:
        return "operator-hindsight"

    def is_available(self) -> bool:
        return bool(os.environ.get("HINDSIGHT_API_URL"))

    def unavailable_reason(self) -> str:
        return "Set HINDSIGHT_API_URL to enable operator memory."

    def initialize(self, session_id: str, **kwargs) -> None:
        self._platform = str(kwargs.get("platform") or "unknown")
        # Subagents, cron and flush runs must not write: only the primary conversation is the record.
        self._writes = kwargs.get("agent_context", "primary") == "primary"
        self._client = HindsightHttp(os.environ["HINDSIGHT_API_URL"], os.environ.get("HINDSIGHT_API_KEY") or None, timeout=10.0)

    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        return []

    # -- recall ------------------------------------------------------------------

    def _parse(self, message: str) -> Envelope:
        env = parse(message)
        if env.operator_id and self._platform in HUMAN_PLATFORMS:
            return Envelope(None, None, None, env.said)
        return env

    def prefetch(self, query: str, *, session_id: str = "") -> str:
        """Synchronous on purpose: the operator comes from THIS message's header, so a result primed for the
        previous turn could belong to a different binding."""
        env = self._parse(query)
        if self._client is None or env.kind in ("decision", "email"):
            return ""
        text = CASE_QUERY if env.kind == "case" else env.said
        if not text:
            return ""
        try:
            resp = self._client.recall(
                bank_id=self._bank, query=text[:800], budget=self._budget, max_tokens=MAX_RECALL_TOKENS,
                tag_groups=recall_filter(env),
            )
        except Exception as exc:  # memory must never break a turn
            logger.warning("operator-hindsight recall failed: %s", exc)
            return ""
        return format_recall(resp.results or [], env.operator_id)

    # -- retain ------------------------------------------------------------------

    def sync_turn(self, user_content: str, assistant_content: str, *, session_id: str = "",
                  messages: Optional[List[Dict[str, Any]]] = None) -> None:
        if self._client is None or not self._writes:
            return
        env = self._parse(user_content)
        content = build_retain(env, assistant_content or "", messages)
        if not content:
            return
        kind = env.kind or "chat"
        doc = f"{kind}-{env.operator_id or 'unbound'}-{uuid.uuid4().hex[:12]}"
        metadata = {k: v for k, v in {"session_id": session_id, "asker": env.asker or "", "kind": kind}.items() if v}
        tags = tags_for(env, self._platform)
        item = {
            "content": content,
            "tags": tags,
            "metadata": metadata,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "context": f"Operator Watch {kind}" + (f" about operator {env.operator_id}" if env.operator_id else ""),
            # Consolidate observations per operator, so facts about two operators never merge into one observation.
            "observation_scopes": [[tags[0]]],
        }
        try:
            with self._lock:  # Hermes already serializes sync_turn; this guards direct callers
                self._client.retain_batch(bank_id=self._bank, items=[item], document_id=doc, retain_async=True)
        except Exception as exc:
            logger.warning("operator-hindsight retain failed (%s, %s): %s", kind, env.operator_id, exc)

    def shutdown(self) -> None:
        client, self._client = self._client, None
        close = getattr(client, "close", None)
        if callable(close):
            try:
                close()
            except Exception:
                pass


def register(ctx) -> None:
    ctx.register_memory_provider(OperatorHindsightProvider())

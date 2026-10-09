"""Reader for the agent envelope (contracts/agent-envelope/README.md; tests run its vectors.json).

Line 1 is `[[key:value]]` tokens separated by single spaces, then a blank line, then the body. Keys used here:
`operator` (required), `kind` (required), `seatos` (optional). Unknown keys are ignored, so the backend can add
new ones without breaking this reader. Values come from the backend, never from the model.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

_TOKEN = r"\[\[[a-z][a-z0-9_-]*:[^\]\s]+\]\]"
HEADER = re.compile(rf"^({_TOKEN}(?: {_TOKEN})*)\n\n")
TOKEN = re.compile(r"\[\[([a-z][a-z0-9_-]*):([^\]\s]+)\]\]")
ASKS = re.compile(r"^(?P<asker>[^\n]{1,80}?) asks: ", re.MULTILINE)


@dataclass(frozen=True)
class Envelope:
    operator_id: Optional[str]
    kind: Optional[str]
    asker: Optional[str]
    #: What the speaker actually said, without the header or the operator brief (live facts must not become memory).
    said: str
    #: SeatOS (TMS) operator id, when the backend has resolved it.
    seatos_id: Optional[str] = None


def parse(message: str) -> Envelope:
    message = message or ""
    m = HEADER.match(message)
    tokens: dict[str, str] = {}
    if m:
        for key, value in TOKEN.findall(m.group(1)):
            tokens.setdefault(key, value)  # duplicate key: first wins
    if "operator" not in tokens or "kind" not in tokens:
        return Envelope(None, None, None, message.strip())
    operator_id, kind, seatos_id = tokens["operator"], tokens["kind"], tokens.get("seatos")
    body = message[m.end():]
    if kind == "chat":
        asks = ASKS.search(body)
        if asks:
            return Envelope(operator_id, kind, asks.group("asker"), body[asks.end():].strip(), seatos_id)
    return Envelope(operator_id, kind, None, body.strip(), seatos_id)


def tags_for(env: Envelope, platform: str) -> list[str]:
    """Retain tags. Messages without a header (e.g. Slack) are kept but scoped `unbound` until bound to an operator."""
    if not env.operator_id:
        return ["scope:unbound", f"channel:{platform or 'unknown'}"]
    tags = [f"operator:{env.operator_id}", f"kind:{env.kind}"]
    if env.seatos_id:
        tags.append(f"seatos:{env.seatos_id}")
    if env.kind == "chat":
        tags.append("channel:web")
    return tags


def recall_filter(env: Envelope) -> list[dict]:
    """Own operator's memories plus team-wide lessons; an unbound message only ever sees team-wide ones."""
    groups = [{"tags": ["scope:global"], "match": "any_strict"}]
    if env.operator_id:
        groups.insert(0, {"tags": [f"operator:{env.operator_id}"], "match": "any_strict"})
    return [{"or": groups}] if len(groups) > 1 else groups

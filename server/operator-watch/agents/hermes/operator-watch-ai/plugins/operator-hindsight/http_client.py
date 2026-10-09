"""Minimal synchronous Hindsight REST client (stdlib only).

hindsight_client's sync wrappers run aiohttp under the hood and fail inside Hermes' worker threads
("Timeout context manager should be used inside a task"), so the provider talks plain HTTP instead.
"""
from __future__ import annotations

import json
import urllib.request
from types import SimpleNamespace
from typing import Any, Dict, List, Optional
from urllib.parse import quote


class HindsightHttp:
    def __init__(self, base_url: str, api_key: Optional[str] = None, timeout: float = 10.0) -> None:
        self._base = base_url.rstrip("/")
        self._headers = {"Content-Type": "application/json", **({"Authorization": f"Bearer {api_key}"} if api_key else {})}
        self._timeout = timeout

    def _post(self, path: str, body: Dict[str, Any]) -> Dict[str, Any]:
        req = urllib.request.Request(f"{self._base}{path}", data=json.dumps(body).encode(), headers=self._headers, method="POST")
        with urllib.request.urlopen(req, timeout=self._timeout) as resp:
            raw = resp.read()
        return json.loads(raw) if raw else {}

    def recall(self, *, bank_id: str, query: str, budget: str = "low", max_tokens: int = 1500,
               tag_groups: Optional[List[dict]] = None) -> SimpleNamespace:
        body: Dict[str, Any] = {"query": query, "budget": budget, "max_tokens": max_tokens}
        if tag_groups:
            body["tag_groups"] = tag_groups
        data = self._post(f"/v1/default/banks/{quote(bank_id)}/memories/recall", body)
        return SimpleNamespace(results=[SimpleNamespace(**r) for r in data.get("results") or []])

    def retain_batch(self, *, bank_id: str, items: List[dict], document_id: Optional[str] = None,
                     retain_async: bool = True) -> Dict[str, Any]:
        if document_id:
            items = [{**item, "document_id": item.get("document_id") or document_id} for item in items]
        return self._post(f"/v1/default/banks/{quote(bank_id)}/memories", {"items": items, "async": retain_async})

    def close(self) -> None:
        pass

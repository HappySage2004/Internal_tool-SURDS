"""Test harness: run the FastAPI app against an in-memory repository.

No MongoDB is needed — `get_store` is overridden with a Store whose collections
are `InMemoryRepository` instances, and `get_current_user` is overridden with a
switchable stub so tests can act as different users.
"""
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_store, get_current_user
from app.repositories.factory import COLLECTIONS
from app.repositories.store import Store


class InMemoryRepository:
    """A dict-backed Repository matching the base.py Protocol. Returns copies so
    callers can't mutate stored docs in place (mirrors the Mongo behaviour)."""

    def __init__(self) -> None:
        self._docs: dict[str, dict[str, Any]] = {}

    async def find_all(self) -> list[dict[str, Any]]:
        return [dict(d) for d in self._docs.values()]

    async def find(self, **filters: Any) -> list[dict[str, Any]]:
        return [
            dict(d) for d in self._docs.values()
            if all(d.get(k) == v for k, v in filters.items())
        ]

    async def find_one(self, **filters: Any) -> dict[str, Any] | None:
        for d in self._docs.values():
            if all(d.get(k) == v for k, v in filters.items()):
                return dict(d)
        return None

    async def get(self, id: str) -> dict[str, Any] | None:
        d = self._docs.get(id)
        return dict(d) if d else None

    async def insert(self, doc: dict[str, Any]) -> dict[str, Any]:
        self._docs[doc["id"]] = dict(doc)
        return dict(doc)

    async def update(self, id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        if id not in self._docs:
            return None
        self._docs[id].update(updates)
        return dict(self._docs[id])

    async def replace(self, id: str, doc: dict[str, Any]) -> dict[str, Any] | None:
        if id not in self._docs:
            return None
        self._docs[id] = dict(doc)
        return dict(doc)

    async def delete(self, id: str) -> bool:
        return self._docs.pop(id, None) is not None


@pytest.fixture
def ctx():
    store = Store(**{name: InMemoryRepository() for name in COLLECTIONS})
    state = {"user": {"id": "u-alice"}}

    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_current_user] = lambda: state["user"]
    client = TestClient(app)
    try:
        yield SimpleNamespace(client=client, store=store, state=state)
    finally:
        app.dependency_overrides.clear()


def as_user(ctx, user_id: str) -> None:
    """Switch the acting user for subsequent requests."""
    ctx.state["user"] = {"id": user_id}

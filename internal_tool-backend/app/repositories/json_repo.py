import asyncio
import json
from pathlib import Path
from typing import Any


class JsonRepository:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._lock = asyncio.Lock()
        self._path.parent.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._path.write_text("[]", encoding="utf-8")

    # ------------------------------------------------------------------
    # Internal helpers (synchronous, always called under self._lock)
    # ------------------------------------------------------------------

    def _read(self) -> list[dict[str, Any]]:
        return json.loads(self._path.read_text(encoding="utf-8"))

    def _write(self, data: list[dict[str, Any]]) -> None:
        self._path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False, default=str),
            encoding="utf-8",
        )

    # ------------------------------------------------------------------
    # Repository protocol
    # ------------------------------------------------------------------

    async def find_all(self) -> list[dict[str, Any]]:
        async with self._lock:
            return list(self._read())

    async def find(self, **filters: Any) -> list[dict[str, Any]]:
        async with self._lock:
            docs = self._read()
            return [d for d in docs if all(d.get(k) == v for k, v in filters.items())]

    async def find_one(self, **filters: Any) -> dict[str, Any] | None:
        results = await self.find(**filters)
        return results[0] if results else None

    async def get(self, id: str) -> dict[str, Any] | None:
        return await self.find_one(id=id)

    async def insert(self, doc: dict[str, Any]) -> dict[str, Any]:
        async with self._lock:
            data = self._read()
            data.append(doc)
            self._write(data)
            return doc

    async def update(self, id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        async with self._lock:
            data = self._read()
            for i, doc in enumerate(data):
                if doc.get("id") == id:
                    merged = {**doc, **updates}
                    data[i] = merged
                    self._write(data)
                    return merged
            return None

    async def replace(self, id: str, doc: dict[str, Any]) -> dict[str, Any] | None:
        async with self._lock:
            data = self._read()
            for i, existing in enumerate(data):
                if existing.get("id") == id:
                    data[i] = doc
                    self._write(data)
                    return doc
            return None

    async def delete(self, id: str) -> bool:
        async with self._lock:
            data = self._read()
            filtered = [d for d in data if d.get("id") != id]
            if len(filtered) == len(data):
                return False
            self._write(filtered)
            return True

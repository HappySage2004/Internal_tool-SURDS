from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class Repository(Protocol):
    """
    Generic async document-store interface.
    One instance per collection.  IDs are always strings.
    `filters` kwargs are AND-ed equality checks.
    """

    async def find_all(self) -> list[dict[str, Any]]:
        """Return every document in the collection."""
        ...

    async def find(self, **filters: Any) -> list[dict[str, Any]]:
        """Return documents matching ALL provided field=value pairs."""
        ...

    async def find_one(self, **filters: Any) -> dict[str, Any] | None:
        """Return the first document matching all filters, or None."""
        ...

    async def get(self, id: str) -> dict[str, Any] | None:
        """Return document by id, or None."""
        ...

    async def insert(self, doc: dict[str, Any]) -> dict[str, Any]:
        """Persist a new document; return it as stored."""
        ...

    async def update(self, id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        """Merge `updates` into the document with `id`; return the updated doc, or None if not found."""
        ...

    async def replace(self, id: str, doc: dict[str, Any]) -> dict[str, Any] | None:
        """Replace the document at `id` wholesale; return it, or None if not found."""
        ...

    async def delete(self, id: str) -> bool:
        """Remove the document with `id`; return True if it existed."""
        ...

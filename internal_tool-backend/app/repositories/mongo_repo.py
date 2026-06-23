"""
MongoDB repository — implements the same Repository protocol as JsonRepository.
Requires: motor (pip install motor)
Activate: set STORAGE_BACKEND=mongo in .env
"""
from typing import Any


class MongoRepository:
    """
    Async MongoDB-backed repository using motor.
    One instance per collection; the Store holds one instance per
    collection name, identical to the JSON backend.
    """

    def __init__(self, collection: Any) -> None:
        # collection is an AsyncIOMotorCollection
        self._col = collection

    async def find_all(self) -> list[dict[str, Any]]:
        cursor = self._col.find({}, {"_id": 0})
        return await cursor.to_list(length=None)

    async def find(self, **filters: Any) -> list[dict[str, Any]]:
        cursor = self._col.find(filters, {"_id": 0})
        return await cursor.to_list(length=None)

    async def find_one(self, **filters: Any) -> dict[str, Any] | None:
        return await self._col.find_one(filters, {"_id": 0})

    async def get(self, id: str) -> dict[str, Any] | None:
        return await self._col.find_one({"id": id}, {"_id": 0})

    async def insert(self, doc: dict[str, Any]) -> dict[str, Any]:
        # Insert a copy so the caller's dict is not mutated by motor
        await self._col.insert_one({**doc})
        return doc

    async def update(self, id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        from motor.motor_asyncio import AsyncIOMotorCollection
        result = await self._col.find_one_and_update(
            {"id": id},
            {"$set": updates},
            return_document=True,
            projection={"_id": 0},
        )
        return result

    async def replace(self, id: str, doc: dict[str, Any]) -> dict[str, Any] | None:
        result = await self._col.find_one_and_replace(
            {"id": id},
            doc,
            return_document=True,
            projection={"_id": 0},
        )
        return result

    async def delete(self, id: str) -> bool:
        result = await self._col.delete_one({"id": id})
        return result.deleted_count > 0

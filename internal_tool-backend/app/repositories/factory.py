from pathlib import Path

from app.config import settings
from app.repositories.store import Store

COLLECTIONS = [
    "users", "goals", "spaces", "tasks",
    "documents", "thread_posts", "meetings", "inbox_items",
]


def create_store() -> Store:
    backend = settings.storage_backend.lower()

    if backend == "json":
        from app.repositories.json_repo import JsonRepository
        base = Path(settings.local_db_path)
        repos = {name: JsonRepository(base / f"{name}.json") for name in COLLECTIONS}
        return Store(**repos)

    elif backend == "mongo":
        from motor.motor_asyncio import AsyncIOMotorClient
        from app.repositories.mongo_repo import MongoRepository
        client = AsyncIOMotorClient(settings.mongo_uri)
        db = client[settings.mongo_db]
        repos = {name: MongoRepository(db[name]) for name in COLLECTIONS}
        return Store(**repos)

    raise ValueError(f"Unknown STORAGE_BACKEND: {backend!r}. Choose 'json' or 'mongo'.")

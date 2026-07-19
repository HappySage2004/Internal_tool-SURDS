from app.config import settings
from app.repositories.store import Store

COLLECTIONS = [
    "users", "goals", "spaces", "tasks",
    "documents", "thread_posts", "meetings", "inbox_items",
]


def create_store() -> Store:
    """Build the Store backed by MongoDB. All data lives in Mongo — there is no
    local-JSON fallback. Configure via MONGO_URI / MONGO_DB in .env."""
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.repositories.mongo_repo import MongoRepository

    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db]
    repos = {name: MongoRepository(db[name]) for name in COLLECTIONS}
    return Store(**repos)

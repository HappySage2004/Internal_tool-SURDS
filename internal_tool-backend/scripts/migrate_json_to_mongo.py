"""
One-off migration: load all local_DB/*.json files into MongoDB.

Usage:
    MONGO_URI=mongodb://localhost:27017 MONGO_DB=internal_tool python scripts/migrate_json_to_mongo.py

No transformation needed — JSON document shapes are identical to MongoDB documents.
Run once after standing up your MongoDB instance, then switch STORAGE_BACKEND=mongo in .env.
"""
import asyncio
import json
import os
import sys
from pathlib import Path

COLLECTIONS = [
    "users", "goals", "spaces", "tasks",
    "documents", "thread_posts", "meetings", "inbox_items",
]

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = os.getenv("MONGO_DB",  "internal_tool")
LOCAL_DB  = Path(__file__).parent.parent / "local_DB"


async def migrate() -> None:
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
    except ImportError:
        print("ERROR: motor is not installed. Run: pip install motor", file=sys.stderr)
        sys.exit(1)

    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    print(f"Connecting to {MONGO_URI} / database '{DB_NAME}'")

    total = 0
    for col_name in COLLECTIONS:
        path = LOCAL_DB / f"{col_name}.json"
        if not path.exists():
            print(f"  {col_name}: skip (file not found)")
            continue

        docs = json.loads(path.read_text(encoding="utf-8"))
        if not docs:
            print(f"  {col_name}: skip (empty)")
            continue

        col = db[col_name]
        await col.delete_many({})       # clear before re-import
        await col.insert_many(docs)
        print(f"  {col_name}: {len(docs)} documents imported")
        total += len(docs)

    client.close()
    print(f"\nDone — {total} documents total. Set STORAGE_BACKEND=mongo in .env to switch.")


if __name__ == "__main__":
    asyncio.run(migrate())

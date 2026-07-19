"""
DB_init_SCRIPT — initialise the MongoDB database for the internal tool.

What it does (idempotent — safe to re-run):
  1. Connects to MONGO_URI / MONGO_DB (read from the backend .env, or env vars).
  2. Ensures every collection the app uses exists (the 8 in factory.COLLECTIONS).
  3. Creates a UNIQUE index on `id` for each collection (the app keys on `id`,
     never Mongo's `_id`), plus a couple of common lookup indexes.
  4. Seeds the six demo users so authentication (get_current_user -> "aaryan")
     works. Users are upserted by `id`, so re-running never duplicates them.
  5. Drops a stray, empty, mis-cased `Users` collection if present (the app reads
     the lower-case `users`; Mongo collection names are case-sensitive).

It does NOT seed goals/spaces/tasks/etc. — those collections start empty and are
populated through the app/API.

Usage:
    cd internal_tool-backend
    python scripts/DB_init_SCRIPT.py

Configuration is read from (in order of precedence): real environment variables,
then the backend `.env` file. Never hardcodes credentials.
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from pymongo import MongoClient
    from pymongo.errors import CollectionInvalid, PyMongoError
except ImportError:
    print("ERROR: pymongo is not installed. Run: pip install pymongo dnspython", file=sys.stderr)
    sys.exit(1)

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.security import hash_password  # noqa: E402  (needs BACKEND_DIR on path first)

# Every collection the app touches — must stay in sync with
# app/repositories/factory.py::COLLECTIONS.
COLLECTIONS = [
    "users", "goals", "spaces", "tasks",
    "documents", "thread_posts", "meetings", "inbox_items",
]

# Extra (non-unique) lookup indexes that match the app's hottest query paths.
# `id` gets a UNIQUE index for every collection automatically (see below).
SECONDARY_INDEXES: dict[str, list[str]] = {
    "tasks":        ["space_id", "assignee_id", "created_by", "status", "parent_task_id"],
    "spaces":       ["mode", "owner_id"],
    "documents":    ["space_id", "owner_id"],
    "thread_posts": ["space_id", "kind"],
    "inbox_items":  ["user_id"],
}


def _load_dotenv(path: Path) -> None:
    """Minimal .env loader — sets os.environ for keys not already present."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _seed_users() -> list[dict]:
    """The six demo users (from UI.md §9). `aaryan` is the stubbed current user.

    Stored with the backend UserOut fields (id/name/email/is_admin/created_at)
    plus the UI's initials/color — extra fields are harmless (UserOut drops them).
    """
    now = _now_iso()
    people = [
        ("aaryan", "Aaryan", "AA", "#7C3AED", True),
        ("mara",   "Mara",   "MA", "#2563EB", False),
        ("devon",  "Devon",  "DE", "#059669", False),
        ("priya",  "Priya",  "PR", "#EA580C", False),
        ("sam",    "Sam",    "SA", "#DB2777", False),
        ("lena",   "Lena",   "LE", "#0D9488", False),
    ]
    return [
        {
            "id": uid,
            "name": name,
            "email": f"{uid}@example.com",
            "is_admin": is_admin,
            "initials": initials,
            "color": color,
            "created_at": now,
        }
        for uid, name, initials, color, is_admin in people
    ]


def main() -> int:
    _load_dotenv(BACKEND_DIR / ".env")

    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB", "Internal_tool_DEV")

    if not mongo_uri:
        print(
            "ERROR: MONGO_URI is not set. Put it in internal_tool-backend/.env or export it.",
            file=sys.stderr,
        )
        return 1

    # Mask credentials in the log line.
    safe_uri = mongo_uri
    if "@" in safe_uri:
        safe_uri = safe_uri.split("@", 1)[0].rsplit(":", 1)[0] + ":***@" + safe_uri.split("@", 1)[1]
    print(f"Connecting to {safe_uri}")
    print(f"Database: {db_name}\n")

    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
        client.admin.command("ping")
    except PyMongoError as exc:
        print(f"ERROR: could not connect to MongoDB: {exc}", file=sys.stderr)
        return 1

    db = client[db_name]
    existing = set(db.list_collection_names())

    # 1. Ensure collections exist.
    for name in COLLECTIONS:
        if name in existing:
            print(f"  collection '{name}': exists")
        else:
            try:
                db.create_collection(name)
                print(f"  collection '{name}': created")
            except CollectionInvalid:
                print(f"  collection '{name}': exists (race)")

    # 2. Unique index on `id` for every collection + secondary indexes.
    print()
    for name in COLLECTIONS:
        col = db[name]
        col.create_index("id", unique=True, name="uniq_id")
        for field in SECONDARY_INDEXES.get(name, []):
            col.create_index(field, name=f"idx_{field}")
        idx_count = 1 + len(SECONDARY_INDEXES.get(name, []))
        print(f"  indexes on '{name}': {idx_count} ensured (unique id + {idx_count - 1} lookup)")

    # 3. Seed users (upsert by id — idempotent). password_hash is intentionally
    #    NOT in the $set, so re-running never clobbers a changed password.
    print()
    users = _seed_users()
    for u in users:
        db["users"].update_one({"id": u["id"]}, {"$set": u}, upsert=True)
    print(f"  seeded {len(users)} users (upserted): {', '.join(u['id'] for u in users)}")

    # 3b. Backfill an initial password for any user missing one. The initial
    #     password equals the user id (e.g. "aaryan"); users should change it in
    #     the app. Only fills where absent, so existing passwords are preserved.
    print()
    seeded_pw = []
    for u in db["users"].find({"password_hash": {"$exists": False}}):
        uid = u["id"]
        db["users"].update_one({"id": uid}, {"$set": {"password_hash": hash_password(uid)}})
        seeded_pw.append(uid)
    if seeded_pw:
        print(f"  set initial password (== user id) for: {', '.join(seeded_pw)}")
        print("  → tell each person to sign in with that and change it in the app.")
    else:
        print("  all users already have a password — none changed.")

    # 4. Drop stray mis-cased 'Users' collection if empty.
    if "Users" in db.list_collection_names() and db["Users"].estimated_document_count() == 0:
        db.drop_collection("Users")
        print("  dropped stray empty 'Users' collection (app uses lower-case 'users')")

    # Summary.
    print("\nSummary:")
    for name in db.list_collection_names():
        print(f"  {name}: {db[name].estimated_document_count()} documents")

    client.close()
    print(f"\nDone — '{db_name}' initialised. Start the backend (uvicorn app.main:app).")
    return 0


if __name__ == "__main__":
    sys.exit(main())

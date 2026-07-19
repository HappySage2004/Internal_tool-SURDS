"""
set_password — admin tool to set/reset a user's password (no forgot-password flow).

Usage:
    cd internal_tool-backend
    python scripts/set_password.py <email-or-id> <new-password>

Looks the user up by email first, then by id. Writes a PBKDF2 hash (never
plaintext). Reads MONGO_URI / MONGO_DB from the backend .env or env vars.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    from pymongo import MongoClient
    from pymongo.errors import PyMongoError
except ImportError:
    print("ERROR: pymongo is not installed. Run: pip install pymongo dnspython", file=sys.stderr)
    sys.exit(1)

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.security import hash_password  # noqa: E402


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    identifier, new_password = sys.argv[1], sys.argv[2]
    if len(new_password) < 6:
        print("ERROR: password must be at least 6 characters.", file=sys.stderr)
        return 1

    _load_dotenv(BACKEND_DIR / ".env")
    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB", "Internal_tool_DEV")
    if not mongo_uri:
        print("ERROR: MONGO_URI is not set (put it in .env or export it).", file=sys.stderr)
        return 1

    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
        client.admin.command("ping")
    except PyMongoError as exc:
        print(f"ERROR: could not connect to MongoDB: {exc}", file=sys.stderr)
        return 1

    users = client[db_name]["users"]
    user = users.find_one({"email": identifier.strip().lower()}) or users.find_one({"id": identifier})
    if not user:
        print(f"ERROR: no user with email or id '{identifier}'.", file=sys.stderr)
        return 1

    users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(new_password)}})
    print(f"Password updated for {user['name']} <{user.get('email')}> (id={user['id']}).")
    client.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

from fastapi import Depends

from app.repositories.store import Store
from app.repositories.factory import create_store

# Module-level singleton — created once, reused across all requests.
_store: Store | None = None


def get_store() -> Store:
    global _store
    if _store is None:
        _store = create_store()
    return _store


async def get_current_user(store: Store = Depends(get_store)) -> dict:
    """
    Stub: always returns Aaryan.
    Replace with real JWT/session auth in a later phase — only this
    function needs to change; all business logic already uses its return value.
    """
    user = await store.users.get("aaryan")
    if not user:
        # Fallback if seed data is missing
        return {"id": "aaryan", "name": "Aaryan", "email": "aaryan@example.com", "is_admin": True}
    return user

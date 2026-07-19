from fastapi import Depends, Header, HTTPException

from app.repositories.store import Store
from app.repositories.factory import create_store
from app.security import verify_token

# Module-level singleton — created once, reused across all requests.
_store: Store | None = None


def get_store() -> Store:
    global _store
    if _store is None:
        _store = create_store()
    return _store


async def get_current_user(
    store: Store = Depends(get_store),
    authorization: str | None = Header(default=None),
) -> dict:
    """
    Resolve the current user from a signed bearer session token
    (`Authorization: Bearer <token>`). Returns 401 when the token is missing,
    malformed, expired, or names a user that no longer exists.

    Business logic downstream only ever sees the resolved user dict, so swapping
    the token scheme for a fuller auth provider later touches only this function.
    """
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = await store.users.get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

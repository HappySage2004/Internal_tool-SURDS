from fastapi import APIRouter, Depends

from app.dependencies import get_store, get_current_user
from app.repositories.store import Store

router = APIRouter(tags=["meta"])


@router.get("/health")
async def health_check(store: Store = Depends(get_store)):
    counts = {
        name: len(await getattr(store, name).find_all())
        for name in [
            "users", "goals", "spaces", "tasks",
            "documents", "thread_posts", "meetings", "inbox_items",
        ]
    }
    return {"status": "ok", "collections": counts}


@router.get("/me")
async def whoami(user: dict = Depends(get_current_user)):
    return user

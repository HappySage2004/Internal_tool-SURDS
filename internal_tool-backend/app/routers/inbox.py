from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_current_user, get_store
from app.repositories.store import Store
from app.schemas.schemas import InboxItemOut

router = APIRouter()


@router.get("", response_model=list[InboxItemOut])
async def list_inbox(
    unread_only: bool = Query(False),
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    items = await store.inbox_items.find(user_id=current_user["id"])
    if unread_only:
        items = [i for i in items if i.get("read_at") is None]
    items.sort(key=lambda i: i.get("created_at", ""), reverse=True)
    return items


# /read-all must be declared before /{item_id}/read so FastAPI doesn't
# try to match the literal string "read-all" as an item_id.
@router.post("/read-all", status_code=204)
async def mark_all_read(
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    items = await store.inbox_items.find(user_id=current_user["id"])
    now = datetime.now(timezone.utc).isoformat()
    for item in items:
        if item.get("read_at") is None:
            await store.inbox_items.update(item["id"], {"read_at": now})


@router.post("/{item_id}/read", response_model=InboxItemOut)
async def mark_read(
    item_id: str,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    item = await store.inbox_items.get(item_id)
    if not item or item.get("user_id") != current_user["id"]:
        raise HTTPException(404, "Inbox item not found.")
    now = datetime.now(timezone.utc).isoformat()
    return await store.inbox_items.update(item_id, {"read_at": now})

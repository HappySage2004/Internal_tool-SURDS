import re
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_current_user, get_store
from app.repositories.store import Store
from app.schemas.schemas import ThreadPostCreate, ThreadPostOut

router = APIRouter()


async def _notify_mentions(body: str, author_id: str, post_id: str, store: Store) -> None:
    """Parse @name tokens from body and create mention inbox items."""
    names = re.findall(r"@(\w+)", body)
    if not names:
        return
    all_users = await store.users.find_all()
    name_map = {u["name"].lower(): u["id"] for u in all_users}
    seen: set[str] = set()
    now = datetime.now(timezone.utc).isoformat()
    for name in names:
        uid = name_map.get(name.lower())
        if uid and uid != author_id and uid not in seen:
            seen.add(uid)
            await store.inbox_items.insert({
                "id": str(uuid4()),
                "user_id": uid,
                "type": "mention",
                "task_id": None,
                "document_id": None,
                "post_id": post_id,
                "read_at": None,
                "created_at": now,
            })


@router.get("", response_model=list[ThreadPostOut])
async def list_posts(
    space_id: str | None = Query(None, description="Omit for General thread; pass space id for a space thread"),
    all: bool = Query(False, description="Return every post across all threads (used by the frontend data layer)"),
    store: Store = Depends(get_store),
):
    posts = await store.thread_posts.find_all()
    if not all:
        posts = [p for p in posts if p.get("space_id") == space_id]
    posts.sort(key=lambda p: p.get("created_at", ""))
    return posts


@router.post("", response_model=ThreadPostOut, status_code=201)
async def create_post(
    body: ThreadPostCreate,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    # §6 rule 6: status posts require a space_id
    if body.kind == "status" and body.space_id is None:
        raise HTTPException(400, "Status posts must belong to a space (space_id required).")
    # General thread (space_id=null) is message-only
    if body.space_id is None and body.kind != "message":
        raise HTTPException(400, "The General thread only supports message posts.")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid4()),
        "space_id": body.space_id,
        "author_id": current_user["id"],
        "kind": body.kind,
        "body": body.body,
        "health": body.health if body.kind == "status" else None,
        "parent_post_id": body.parent_post_id,
        "period_label": body.period_label,
        "created_at": now,
    }
    await store.thread_posts.insert(doc)
    await _notify_mentions(body.body, current_user["id"], doc["id"], store)
    return doc


@router.delete("/{post_id}", status_code=204)
async def delete_post(
    post_id: str,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    post = await store.thread_posts.get(post_id)
    if not post:
        raise HTTPException(404, "Post not found.")
    if post.get("author_id") != current_user["id"]:
        raise HTTPException(403, "You can only delete your own posts.")
    await store.thread_posts.delete(post_id)

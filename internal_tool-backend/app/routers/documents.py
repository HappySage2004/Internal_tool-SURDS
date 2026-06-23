from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, get_store
from app.repositories.store import Store
from app.schemas.schemas import CommentIn, CommentOut, DocumentCreate, DocumentOut, DocumentUpdate

router = APIRouter()


# ---------------------------------------------------------------------------
# Privacy helper
# ---------------------------------------------------------------------------

def _check_visibility(doc: dict, current_user_id: str) -> bool:
    """Return True if this user may see this document."""
    if doc.get("space_id") is not None:
        return True                             # shared doc — everyone can see it
    return doc.get("owner_id") == current_user_id  # personal — owner only


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=list[DocumentOut])
async def list_documents(
    space_id: str | None = None,
    owner_id: str | None = None,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    all_docs = await store.documents.find_all()

    # 1. Exclude archived
    docs = [d for d in all_docs if d.get("archived_at") is None]

    # 2. Privacy filter
    docs = [d for d in docs if _check_visibility(d, current_user["id"])]

    # 3. space_id filter
    if space_id is not None:
        docs = [d for d in docs if d.get("space_id") == space_id]

    # 4. owner_id filter
    if owner_id is not None:
        docs = [d for d in docs if d.get("owner_id") == owner_id]

    return docs


@router.post("", response_model=DocumentOut, status_code=201)
async def create_document(
    body: DocumentCreate,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    data = body.model_dump()
    # Serialize enum
    if data.get("doc_type") is not None and hasattr(data["doc_type"], "value"):
        data["doc_type"] = data["doc_type"].value

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid4()),
        **data,
        "owner_id": current_user["id"],
        "linked_task_ids": [],
        "comments": [],
        "attachments": [],
        "created_at": now,
        "updated_at": now,
        "archived_at": None,
    }
    return await store.documents.insert(doc)


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(
    doc_id: str,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    doc = await store.documents.get(doc_id)
    if not doc or doc.get("archived_at") is not None or not _check_visibility(doc, current_user["id"]):
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.patch("/{doc_id}", response_model=DocumentOut)
async def update_document(
    doc_id: str,
    body: DocumentUpdate,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    doc = await store.documents.get(doc_id)
    if not doc or doc.get("archived_at") is not None or not _check_visibility(doc, current_user["id"]):
        raise HTTPException(status_code=404, detail="Document not found")

    changes = body.model_dump(exclude_none=True)
    # Serialize enum
    if "doc_type" in changes and hasattr(changes["doc_type"], "value"):
        changes["doc_type"] = changes["doc_type"].value

    now = datetime.now(timezone.utc).isoformat()
    changes["updated_at"] = now
    return await store.documents.update(doc_id, changes)


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    doc = await store.documents.get(doc_id)
    if not doc or doc.get("archived_at") is not None or not _check_visibility(doc, current_user["id"]):
        raise HTTPException(status_code=404, detail="Document not found")

    now = datetime.now(timezone.utc).isoformat()
    await store.documents.update(doc_id, {"archived_at": now})


# ---------------------------------------------------------------------------
# Comments (embedded)
# ---------------------------------------------------------------------------

@router.post("/{doc_id}/comments", response_model=CommentOut, status_code=201)
async def add_document_comment(
    doc_id: str,
    body: CommentIn,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    doc = await store.documents.get(doc_id)
    if not doc or doc.get("archived_at") is not None or not _check_visibility(doc, current_user["id"]):
        raise HTTPException(status_code=404, detail="Document not found")

    comment = {
        "id": str(uuid4()),
        "author_id": current_user["id"],
        "body": body.body,
        "parent_comment_id": body.parent_comment_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "edited_at": None,
    }
    updated_doc = {**doc, "comments": doc.get("comments", []) + [comment]}
    await store.documents.replace(doc_id, updated_doc)
    return comment


@router.patch("/{doc_id}/comments/{comment_id}", response_model=CommentOut)
async def edit_document_comment(
    doc_id: str,
    comment_id: str,
    body: CommentIn,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    doc = await store.documents.get(doc_id)
    if not doc or doc.get("archived_at") is not None or not _check_visibility(doc, current_user["id"]):
        raise HTTPException(status_code=404, detail="Document not found")

    comments = doc.get("comments", [])
    idx = next((i for i, c in enumerate(comments) if c.get("id") == comment_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    now = datetime.now(timezone.utc).isoformat()
    comments[idx] = {**comments[idx], "body": body.body, "edited_at": now}
    updated_doc = {**doc, "comments": comments}
    await store.documents.replace(doc_id, updated_doc)
    return comments[idx]


@router.delete("/{doc_id}/comments/{comment_id}", status_code=204)
async def delete_document_comment(
    doc_id: str,
    comment_id: str,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    doc = await store.documents.get(doc_id)
    if not doc or doc.get("archived_at") is not None or not _check_visibility(doc, current_user["id"]):
        raise HTTPException(status_code=404, detail="Document not found")

    comments = doc.get("comments", [])
    new_comments = [c for c in comments if c.get("id") != comment_id]
    updated_doc = {**doc, "comments": new_comments}
    await store.documents.replace(doc_id, updated_doc)

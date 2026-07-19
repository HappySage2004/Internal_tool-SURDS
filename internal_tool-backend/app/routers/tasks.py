from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, get_store
from app.repositories.store import Store
from app.schemas.schemas import CommentIn, CommentOut, GitLinkCreate, GitLinkOut, GitLinkStateUpdate, TaskCreate, TaskOut, TaskUpdate

router = APIRouter()


# ---------------------------------------------------------------------------
# Privacy helper
# ---------------------------------------------------------------------------

def _check_visibility(task: dict, current_user_id: str) -> bool:
    """Return True if this user may see this task."""
    if task.get("space_id") is not None:
        return True                              # shared task — everyone can see it
    return task.get("created_by") == current_user_id  # personal — owner only


async def _cascade_cancel_subtasks(store: Store, parent_id: str, now: str) -> None:
    """Cancel a parent's open sub-tasks when the parent is canceled (§6 #15).

    Sub-tasks that are already done or canceled are left untouched.
    """
    subtasks = await store.tasks.find(parent_task_id=parent_id)
    for st in subtasks:
        if st.get("status") not in ("done", "canceled"):
            await store.tasks.update(st["id"], {"status": "canceled", "updated_at": now})


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=list[TaskOut])
async def list_tasks(
    space_id: str | None = None,
    assignee_id: str | None = None,
    status: str | None = None,
    parent_task_id: str | None = None,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    all_tasks = await store.tasks.find_all()

    # 1. Privacy filter
    tasks = [t for t in all_tasks if _check_visibility(t, current_user["id"])]

    # 2. space_id filter
    if space_id is not None:
        tasks = [t for t in tasks if t.get("space_id") == space_id]

    # 3. assignee_id filter
    if assignee_id is not None:
        tasks = [t for t in tasks if t.get("assignee_id") == assignee_id]

    # 4. status filter
    if status is not None:
        tasks = [t for t in tasks if t.get("status") == status]

    # 5. parent filter — fetch a parent's sub-tasks. A sub-task inherits its
    #    parent's space (§6 #14) so it already passes the privacy filter above.
    if parent_task_id is not None:
        tasks = [t for t in tasks if t.get("parent_task_id") == parent_task_id]

    return tasks


@router.get("/my-work", response_model=list[TaskOut])
async def my_work(
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns tasks for the current user's 'My work' screen:
    - Shared tasks assigned to current user (space_id not null, assignee_id == me)
    - Personal tasks created by current user (space_id is null)
    Excludes done and canceled tasks.
    """
    all_tasks = await store.tasks.find_all()
    uid = current_user["id"]
    excluded_statuses = {"done", "canceled"}

    result = []
    for t in all_tasks:
        if t.get("status") in excluded_statuses:
            continue
        if t.get("space_id") is not None and t.get("assignee_id") == uid:
            result.append(t)
        elif t.get("space_id") is None and t.get("created_by") == uid:
            result.append(t)

    return result


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: str,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    task = await store.tasks.get(task_id)
    if not task or not _check_visibility(task, current_user["id"]):
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(
    body: TaskCreate,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    data = body.model_dump()
    parent_task_id = data.pop("parent_task_id", None)

    # Sub-task handling (§6 #13/#14): a sub-task inherits its parent's scope, so we
    # override any space_id/tag_space_id the client sent from the parent's values.
    if parent_task_id is not None:
        parent = await store.tasks.get(parent_task_id)
        if not parent or not _check_visibility(parent, current_user["id"]):
            raise HTTPException(status_code=404, detail="Parent task not found")
        # Invariant 13: one level of nesting only.
        if parent.get("parent_task_id"):
            raise HTTPException(
                status_code=409,
                detail="Sub-tasks are one level deep — a sub-task cannot have sub-tasks.",
            )
        # Invariant 14: inherit the parent's space (and thus its shared/personal nature).
        data["space_id"] = parent.get("space_id")
        data["tag_space_id"] = None

    # Invariant 1: must be shared or owned
    if not data.get("space_id") and not current_user["id"]:
        raise HTTPException(status_code=400, detail="Task must belong to a space or have an owner.")

    # Invariant 3: tag_space_id only on personal tasks
    if data.get("tag_space_id") and data.get("space_id"):
        raise HTTPException(
            status_code=400,
            detail="tag_space_id can only be set on personal tasks (space_id must be null).",
        )

    # Invariant 4: personal task cannot be assigned to someone else
    if not data.get("space_id") and data.get("assignee_id") and data["assignee_id"] != current_user["id"]:
        raise HTTPException(
            status_code=400,
            detail="A personal task can only be assigned to its owner.",
        )

    now = datetime.now(timezone.utc).isoformat()
    # Serialize enums
    if data.get("status") is not None and hasattr(data["status"], "value"):
        data["status"] = data["status"].value
    if data.get("priority") is not None and hasattr(data["priority"], "value"):
        data["priority"] = data["priority"].value

    doc = {
        "id": str(uuid4()),
        "key": None,
        "parent_task_id": parent_task_id,
        **data,
        "git_links": [],
        "comments": [],
        "attachments": [],
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
    }
    inserted = await store.tasks.insert(doc)

    # Inbox: notify assignee on assignment (if different from creator)
    if doc.get("assignee_id") and doc["assignee_id"] != current_user["id"]:
        await store.inbox_items.insert({
            "id": str(uuid4()),
            "user_id": doc["assignee_id"],
            "type": "assignment",
            "task_id": doc["id"],
            "document_id": None,
            "post_id": None,
            "read_at": None,
            "created_at": now,
        })

    return inserted


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: str,
    body: TaskUpdate,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    task = await store.tasks.get(task_id)
    if not task or not _check_visibility(task, current_user["id"]):
        raise HTTPException(status_code=404, detail="Task not found")

    # exclude_unset (not exclude_none) so the client can explicitly clear a field
    # by sending null (e.g. clear due_date, unassign) while omitted fields are left untouched.
    changes = body.model_dump(exclude_unset=True)
    # Serialize enums
    if "status" in changes and hasattr(changes["status"], "value"):
        changes["status"] = changes["status"].value
    if "priority" in changes and hasattr(changes["priority"], "value"):
        changes["priority"] = changes["priority"].value

    now = datetime.now(timezone.utc).isoformat()
    changes["updated_at"] = now

    # Merge to check invariants on full document
    merged = {**task, **changes}

    # Invariant 3: tag_space_id not allowed if space_id is not null
    if merged.get("tag_space_id") and merged.get("space_id"):
        raise HTTPException(
            status_code=400,
            detail="tag_space_id can only be set on personal tasks (space_id must be null).",
        )

    # Invariant 4: personal task cannot be assigned to someone else
    if (
        not merged.get("space_id")
        and merged.get("assignee_id")
        and merged["assignee_id"] != merged.get("created_by")
    ):
        raise HTTPException(
            status_code=400,
            detail="A personal task can only be assigned to its owner.",
        )

    # completed_at logic
    new_status = changes.get("status")
    old_status = task.get("status")
    if new_status and new_status != old_status:
        if new_status == "done":
            changes["completed_at"] = now
        elif old_status == "done":
            changes["completed_at"] = None

    updated = await store.tasks.update(task_id, changes)

    # §6 #15: canceling a parent cascades to its open sub-tasks.
    if new_status == "canceled" and old_status != "canceled" and not task.get("parent_task_id"):
        await _cascade_cancel_subtasks(store, task_id, now)

    return updated


@router.delete("/{task_id}", status_code=204)
async def cancel_task(
    task_id: str,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    task = await store.tasks.get(task_id)
    if not task or not _check_visibility(task, current_user["id"]):
        raise HTTPException(status_code=404, detail="Task not found")

    now = datetime.now(timezone.utc).isoformat()
    await store.tasks.update(task_id, {"status": "canceled", "updated_at": now})

    # §6 #15: canceling a parent cascades to its open sub-tasks.
    if not task.get("parent_task_id"):
        await _cascade_cancel_subtasks(store, task_id, now)


# ---------------------------------------------------------------------------
# Comments (embedded)
# ---------------------------------------------------------------------------

@router.post("/{task_id}/comments", response_model=CommentOut, status_code=201)
async def add_task_comment(
    task_id: str,
    body: CommentIn,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    task = await store.tasks.get(task_id)
    if not task or not _check_visibility(task, current_user["id"]):
        raise HTTPException(status_code=404, detail="Task not found")

    comment = {
        "id": str(uuid4()),
        "author_id": current_user["id"],
        "body": body.body,
        "parent_comment_id": body.parent_comment_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "edited_at": None,
    }
    updated_task = {**task, "comments": task.get("comments", []) + [comment]}
    await store.tasks.replace(task_id, updated_task)
    return comment


@router.patch("/{task_id}/comments/{comment_id}", response_model=CommentOut)
async def edit_task_comment(
    task_id: str,
    comment_id: str,
    body: CommentIn,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    task = await store.tasks.get(task_id)
    if not task or not _check_visibility(task, current_user["id"]):
        raise HTTPException(status_code=404, detail="Task not found")

    comments = task.get("comments", [])
    idx = next((i for i, c in enumerate(comments) if c.get("id") == comment_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    now = datetime.now(timezone.utc).isoformat()
    comments[idx] = {**comments[idx], "body": body.body, "edited_at": now}
    updated_task = {**task, "comments": comments}
    await store.tasks.replace(task_id, updated_task)
    return comments[idx]


@router.delete("/{task_id}/comments/{comment_id}", status_code=204)
async def delete_task_comment(
    task_id: str,
    comment_id: str,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    task = await store.tasks.get(task_id)
    if not task or not _check_visibility(task, current_user["id"]):
        raise HTTPException(status_code=404, detail="Task not found")

    comments = task.get("comments", [])
    new_comments = [c for c in comments if c.get("id") != comment_id]
    updated_task = {**task, "comments": new_comments}
    await store.tasks.replace(task_id, updated_task)


# ---------------------------------------------------------------------------
# Git links (embedded) — webhook entry-point for auto-status (§6 rule 12)
# ---------------------------------------------------------------------------

@router.post("/{task_id}/git-links", response_model=GitLinkOut, status_code=201)
async def add_git_link(
    task_id: str,
    body: GitLinkCreate,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    task = await store.tasks.get(task_id)
    if not task or not _check_visibility(task, current_user["id"]):
        raise HTTPException(status_code=404, detail="Task not found")

    link = {
        "ref_type": body.ref_type,
        "url": body.url,
        "external_id": body.external_id,
        "state": body.state,
    }
    updated_task = {**task, "git_links": task.get("git_links", []) + [link]}
    await store.tasks.replace(task_id, updated_task)
    return link


@router.patch("/{task_id}/git-links/{external_id}/state", response_model=TaskOut)
async def update_git_link_state(
    task_id: str,
    external_id: str,
    body: GitLinkStateUpdate,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    """
    Webhook entry-point. Advances task status based on git state (§6 rule 12):
      PR open   → in_progress/todo → in_review
      PR merged → done + completed_at
    `external_id` is the PR number / commit sha sent by the git provider.
    """
    task = await store.tasks.get(task_id)
    if not task or not _check_visibility(task, current_user["id"]):
        raise HTTPException(status_code=404, detail="Task not found")

    links = task.get("git_links", [])
    idx = next((i for i, l in enumerate(links) if l.get("external_id") == external_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Git link not found")

    links[idx] = {**links[idx], "state": body.state}

    now = datetime.now(timezone.utc).isoformat()
    status_changes: dict = {"git_links": links, "updated_at": now}

    current_status = task.get("status")
    if body.state == "merged":
        status_changes["status"] = "done"
        status_changes["completed_at"] = now
    elif body.state == "open" and current_status in ("todo", "in_progress"):
        status_changes["status"] = "in_review"

    updated = await store.tasks.update(task_id, status_changes)
    return updated

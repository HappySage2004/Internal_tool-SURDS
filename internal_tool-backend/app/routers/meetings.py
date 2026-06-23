from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, get_store
from app.repositories.store import Store
from app.schemas.schemas import (
    ActionItemIn, ActionItemOut, ActionItemUpdate,
    MeetingCreate, MeetingOut, MeetingUpdate, TaskCreate,
)

router = APIRouter()


async def _get_meeting_or_404(meeting_id: str, store: Store) -> dict:
    meeting = await store.meetings.get(meeting_id)
    if not meeting:
        raise HTTPException(404, "Meeting not found.")
    return meeting


# ---------------------------------------------------------------------------
# Meeting CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[MeetingOut])
async def list_meetings(store: Store = Depends(get_store)):
    meetings = await store.meetings.find_all()
    meetings.sort(key=lambda m: m.get("scheduled_at", ""), reverse=True)
    return meetings


@router.post("", response_model=MeetingOut, status_code=201)
async def create_meeting(
    body: MeetingCreate,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    now = datetime.now(timezone.utc).isoformat()
    action_items = [
        {"id": str(uuid4()), "text": ai.text, "done": False, "task_id": None}
        for ai in body.action_items
    ]
    doc = {
        "id": str(uuid4()),
        "title": body.title,
        "scheduled_at": body.scheduled_at,
        "attendee_ids": body.attendee_ids,
        "outcomes": body.outcomes,
        "action_items": action_items,
        "related_space_ids": body.related_space_ids,
        "related_goal_ids": body.related_goal_ids,
        "created_by": current_user["id"],
        "created_at": now,
    }
    return await store.meetings.insert(doc)


@router.get("/{meeting_id}", response_model=MeetingOut)
async def get_meeting(meeting_id: str, store: Store = Depends(get_store)):
    return await _get_meeting_or_404(meeting_id, store)


@router.patch("/{meeting_id}", response_model=MeetingOut)
async def update_meeting(
    meeting_id: str,
    body: MeetingUpdate,
    store: Store = Depends(get_store),
):
    await _get_meeting_or_404(meeting_id, store)
    changes = body.model_dump(exclude_none=True)
    return await store.meetings.update(meeting_id, changes)


@router.delete("/{meeting_id}", status_code=204)
async def delete_meeting(meeting_id: str, store: Store = Depends(get_store)):
    meeting = await store.meetings.get(meeting_id)
    if not meeting:
        raise HTTPException(404, "Meeting not found.")
    await store.meetings.delete(meeting_id)


# ---------------------------------------------------------------------------
# Action items (embedded in meeting document)
# ---------------------------------------------------------------------------

@router.post("/{meeting_id}/action-items", response_model=ActionItemOut, status_code=201)
async def add_action_item(
    meeting_id: str,
    body: ActionItemIn,
    store: Store = Depends(get_store),
):
    meeting = await _get_meeting_or_404(meeting_id, store)
    item = {"id": str(uuid4()), "text": body.text, "done": False, "task_id": None}
    updated = {**meeting, "action_items": meeting.get("action_items", []) + [item]}
    await store.meetings.replace(meeting_id, updated)
    return item


@router.patch("/{meeting_id}/action-items/{ai_id}", response_model=ActionItemOut)
async def update_action_item(
    meeting_id: str,
    ai_id: str,
    body: ActionItemUpdate,
    store: Store = Depends(get_store),
):
    meeting = await _get_meeting_or_404(meeting_id, store)
    items = meeting.get("action_items", [])
    idx = next((i for i, a in enumerate(items) if a.get("id") == ai_id), None)
    if idx is None:
        raise HTTPException(404, "Action item not found.")
    changes = body.model_dump(exclude_none=True)
    items[idx] = {**items[idx], **changes}
    await store.meetings.replace(meeting_id, {**meeting, "action_items": items})
    return items[idx]


@router.delete("/{meeting_id}/action-items/{ai_id}", status_code=204)
async def delete_action_item(
    meeting_id: str,
    ai_id: str,
    store: Store = Depends(get_store),
):
    meeting = await _get_meeting_or_404(meeting_id, store)
    items = [a for a in meeting.get("action_items", []) if a.get("id") != ai_id]
    await store.meetings.replace(meeting_id, {**meeting, "action_items": items})


@router.post("/{meeting_id}/action-items/{ai_id}/convert", response_model=ActionItemOut)
async def convert_action_item_to_task(
    meeting_id: str,
    ai_id: str,
    space_id: str | None = None,
    assignee_id: str | None = None,
    store: Store = Depends(get_store),
    current_user: dict = Depends(get_current_user),
):
    """
    §6 rule 11: converts an action item to a real task and links it back.
    Optional query params `space_id` and `assignee_id` place the task.
    """
    meeting = await _get_meeting_or_404(meeting_id, store)
    items = meeting.get("action_items", [])
    idx = next((i for i, a in enumerate(items) if a.get("id") == ai_id), None)
    if idx is None:
        raise HTTPException(404, "Action item not found.")

    item = items[idx]
    if item.get("task_id"):
        raise HTTPException(409, "Action item has already been converted to a task.")

    now = datetime.now(timezone.utc).isoformat()
    task_doc = {
        "id": str(uuid4()),
        "key": None,
        "space_id": space_id,
        "title": item["text"],
        "status": "todo",
        "description": f"Created from meeting: {meeting['title']}",
        "assignee_id": assignee_id,
        "priority": None,
        "due_date": None,
        "tag_space_id": None,
        "git_links": [],
        "comments": [],
        "attachments": [],
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
    }
    await store.tasks.insert(task_doc)

    # Write task_id back onto the action item (§6 rule 11)
    items[idx] = {**item, "task_id": task_doc["id"]}
    await store.meetings.replace(meeting_id, {**meeting, "action_items": items})

    # Notify assignee if different from creator
    if assignee_id and assignee_id != current_user["id"]:
        await store.inbox_items.insert({
            "id": str(uuid4()),
            "user_id": assignee_id,
            "type": "assignment",
            "task_id": task_doc["id"],
            "document_id": None,
            "post_id": None,
            "read_at": None,
            "created_at": now,
        })

    return items[idx]

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_store
from app.repositories.store import Store
from app.schemas.schemas import SpaceCreate, SpaceOut, SpaceUpdate

router = APIRouter()


@router.get("", response_model=list[SpaceOut])
async def list_spaces(
    mode: Optional[str] = Query(default=None),
    store: Store = Depends(get_store),
):
    all_spaces = await store.spaces.find_all()
    active = [s for s in all_spaces if s.get("archived_at") is None]
    if mode is not None:
        active = [s for s in active if s.get("mode") == mode]
    return active


@router.post("", response_model=SpaceOut, status_code=201)
async def create_space(body: SpaceCreate, store: Store = Depends(get_store)):
    # Validate every goal_id refers to an existing, non-archived goal
    for goal_id in body.goal_ids:
        goal = await store.goals.get(goal_id)
        if not goal or goal.get("archived_at") is not None:
            raise HTTPException(
                status_code=400,
                detail=f"Goal '{goal_id}' does not exist or is archived",
            )

    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "mode": body.mode.value,
        "description": body.description,
        "owner_id": body.owner_id,
        "member_ids": body.member_ids,
        "goal_ids": body.goal_ids,
        "update_cadence": body.update_cadence.value if body.update_cadence else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "archived_at": None,
    }
    return await store.spaces.insert(doc)


@router.get("/{space_id}", response_model=SpaceOut)
async def get_space(space_id: str, store: Store = Depends(get_store)):
    space = await store.spaces.get(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


@router.patch("/{space_id}", response_model=SpaceOut)
async def update_space(space_id: str, body: SpaceUpdate, store: Store = Depends(get_store)):
    space = await store.spaces.get(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    updates = body.model_dump(exclude_none=True)
    # Serialize enum values
    if "update_cadence" in updates and updates["update_cadence"] is not None:
        updates["update_cadence"] = updates["update_cadence"].value

    updated = await store.spaces.update(space_id, updates)
    return updated


@router.delete("/{space_id}", status_code=204)
async def delete_space(space_id: str, store: Store = Depends(get_store)):
    space = await store.spaces.get(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    await store.spaces.update(space_id, {"archived_at": datetime.now(timezone.utc).isoformat()})

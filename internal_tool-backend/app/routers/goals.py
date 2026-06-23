import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_store
from app.repositories.store import Store
from app.schemas.schemas import GoalCreate, GoalOut, GoalUpdate, KeyResultIn, KeyResultOut

router = APIRouter()


# ---------------------------------------------------------------------------
# Rollup response models (endpoint-specific)
# ---------------------------------------------------------------------------

class SpaceHealthSummary(BaseModel):
    space_id: str
    space_name: str
    health: Optional[str]
    body: Optional[str]
    created_at: Optional[str]


class GoalRollupOut(BaseModel):
    goal: GoalOut
    spaces: list[SpaceHealthSummary]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=list[GoalOut])
async def list_goals(store: Store = Depends(get_store)):
    all_goals = await store.goals.find_all()
    return [g for g in all_goals if g.get("archived_at") is None]


@router.post("", response_model=GoalOut, status_code=201)
async def create_goal(body: GoalCreate, store: Store = Depends(get_store)):
    key_results = [
        {"id": str(uuid.uuid4()), **kr.model_dump()}
        for kr in body.key_results
    ]
    doc = {
        "id": str(uuid.uuid4()),
        "title": body.title,
        "description": body.description,
        "status": body.status.value if body.status else None,
        "target_date": body.target_date,
        "key_results": key_results,
        "created_by": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "archived_at": None,
    }
    return await store.goals.insert(doc)


@router.get("/{goal_id}/rollup", response_model=GoalRollupOut)
async def goal_rollup(goal_id: str, store: Store = Depends(get_store)):
    goal = await store.goals.get(goal_id)
    if not goal or goal.get("archived_at") is not None:
        raise HTTPException(status_code=404, detail="Goal not found")

    all_spaces = await store.spaces.find_all()
    linked_spaces = [
        s for s in all_spaces
        if goal_id in s.get("goal_ids", []) and s.get("archived_at") is None
    ]

    all_posts = await store.thread_posts.find_all()
    status_posts = [p for p in all_posts if p.get("kind") == "status"]

    summaries: list[SpaceHealthSummary] = []
    for space in linked_spaces:
        space_posts = [
            p for p in status_posts
            if p.get("space_id") == space["id"]
        ]
        space_posts.sort(key=lambda p: p.get("created_at", ""), reverse=True)
        latest = space_posts[0] if space_posts else None
        summaries.append(SpaceHealthSummary(
            space_id=space["id"],
            space_name=space["name"],
            health=latest["health"] if latest else None,
            body=latest["body"] if latest else None,
            created_at=latest["created_at"] if latest else None,
        ))

    return GoalRollupOut(goal=GoalOut(**goal), spaces=summaries)


@router.get("/{goal_id}", response_model=GoalOut)
async def get_goal(goal_id: str, store: Store = Depends(get_store)):
    goal = await store.goals.get(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.patch("/{goal_id}", response_model=GoalOut)
async def update_goal(goal_id: str, body: GoalUpdate, store: Store = Depends(get_store)):
    goal = await store.goals.get(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    updates = body.model_dump(exclude_none=True)
    # Serialize enum values
    if "status" in updates and updates["status"] is not None:
        updates["status"] = updates["status"].value

    updated = await store.goals.update(goal_id, updates)
    return updated


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(goal_id: str, store: Store = Depends(get_store)):
    goal = await store.goals.get(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await store.goals.update(goal_id, {"archived_at": datetime.now(timezone.utc).isoformat()})


@router.post("/{goal_id}/key-results", response_model=GoalOut, status_code=201)
async def add_key_result(goal_id: str, body: KeyResultIn, store: Store = Depends(get_store)):
    goal = await store.goals.get(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    new_kr = {"id": str(uuid.uuid4()), **body.model_dump()}
    updated_goal = {**goal, "key_results": goal.get("key_results", []) + [new_kr]}
    result = await store.goals.replace(goal_id, updated_goal)
    return result


@router.patch("/{goal_id}/key-results/{kr_id}", response_model=GoalOut)
async def update_key_result(
    goal_id: str,
    kr_id: str,
    body: KeyResultIn,
    store: Store = Depends(get_store),
):
    goal = await store.goals.get(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    key_results = goal.get("key_results", [])
    kr_index = next((i for i, kr in enumerate(key_results) if kr.get("id") == kr_id), None)
    if kr_index is None:
        raise HTTPException(status_code=404, detail="Key result not found")

    updates = body.model_dump(exclude_none=True)
    key_results[kr_index] = {**key_results[kr_index], **updates}
    updated_goal = {**goal, "key_results": key_results}
    result = await store.goals.replace(goal_id, updated_goal)
    return result

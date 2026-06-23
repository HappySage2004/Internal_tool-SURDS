import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_store
from app.repositories.store import Store
from app.schemas.schemas import UserCreate, UserOut

router = APIRouter()


@router.get("", response_model=list[UserOut])
async def list_users(store: Store = Depends(get_store)):
    return await store.users.find_all()


@router.post("", response_model=UserOut, status_code=201)
async def create_user(body: UserCreate, store: Store = Depends(get_store)):
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "email": body.email,
        "is_admin": body.is_admin,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return await store.users.insert(doc)


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: str, store: Store = Depends(get_store)):
    user = await store.users.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

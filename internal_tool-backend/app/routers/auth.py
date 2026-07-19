from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, get_store
from app.repositories.store import Store
from app.schemas.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    UserOut,
)
from app.security import create_token, hash_password, verify_password

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, store: Store = Depends(get_store)):
    # Email match is case-insensitive; the store filters by exact value, so
    # normalise to lower-case (seed emails are stored lower-case).
    user = await store.users.find_one(email=body.email.strip().lower())
    if not user or not verify_password(body.password, user.get("password_hash")):
        # Same message for "no such user" and "wrong password" — don't leak which.
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": create_token(user["id"]), "user": user}


@router.get("/me", response_model=UserOut)
async def me(current=Depends(get_current_user)):
    return current


@router.post("/change-password", status_code=204)
async def change_password(
    body: ChangePasswordRequest,
    store: Store = Depends(get_store),
    current=Depends(get_current_user),
):
    if not verify_password(body.current_password, current.get("password_hash")):
        raise HTTPException(status_code=403, detail="Current password is incorrect")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=422, detail="New password must be at least 6 characters")
    await store.users.update(current["id"], {"password_hash": hash_password(body.new_password)})

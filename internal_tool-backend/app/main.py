from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import health, users, goals, spaces, tasks, documents, thread_posts, inbox, meetings

app = FastAPI(
    title="Internal tool API",
    version="0.1.0",
    description="Phase 3: Tasks, Documents, and embedded comments.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(users.router,     prefix="/users",     tags=["users"])
app.include_router(goals.router,     prefix="/goals",     tags=["goals"])
app.include_router(spaces.router,    prefix="/spaces",    tags=["spaces"])
app.include_router(tasks.router,     prefix="/tasks",     tags=["tasks"])
app.include_router(documents.router,    prefix="/documents",    tags=["documents"])
app.include_router(thread_posts.router, prefix="/thread-posts", tags=["threads"])
app.include_router(inbox.router,        prefix="/inbox",         tags=["inbox"])
app.include_router(meetings.router,     prefix="/meetings",      tags=["meetings"])

# Serve uploaded PDF/image bytes read-only.
_uploads_dir = Path(settings.uploads_path)
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")

app.description = "Internal tool API — all phases complete."

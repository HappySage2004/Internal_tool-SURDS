from pathlib import Path

from pydantic_settings import BaseSettings

# Repo root = two levels up from this file (app/config.py -> app -> backend -> repo).
_REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    storage_backend: str = "mongo"         # "json" | "mongo"
    local_db_path: str = "local_DB"        # used when storage_backend=json
    # Single staging folder (at repo root) for ALL document bytes: markdown bodies
    # (<id>.md) and uploaded pdf/image files (<id>.<ext>). Served only through the
    # privacy-gated GET /documents/{id}/file endpoint — never mounted statically.
    documents_stage_path: str = str(_REPO_ROOT / "Documents_Stage")
    # used when storage_backend=mongo — the real Atlas URI belongs in .env (git-ignored),
    # never hardcoded here. This localhost default is only a safe fallback.
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "Internal_tool_DEV"
    secret_key: str = "dev-secret"

    class Config:
        env_file = ".env"


settings = Settings()

from pathlib import Path

from pydantic_settings import BaseSettings

# Repo root = two levels up from this file (app/config.py -> app -> backend -> repo).
_REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    storage_backend: str = "json"          # "json" | "mongo"
    local_db_path: str = "local_DB"        # used when storage_backend=json
    # Markdown bytes for documents live here as one .md file per doc, at repo root.
    documents_stage_path: str = str(_REPO_ROOT / "Documents_Stage")
    mongo_uri: str = "mongodb://localhost:27017"  # used when storage_backend=mongo
    mongo_db: str = "internal_tool"
    secret_key: str = "dev-secret"

    class Config:
        env_file = ".env"


settings = Settings()

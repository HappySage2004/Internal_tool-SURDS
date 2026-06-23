from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    storage_backend: str = "json"          # "json" | "mongo"
    local_db_path: str = "local_DB"        # used when storage_backend=json
    mongo_uri: str = "mongodb://localhost:27017"  # used when storage_backend=mongo
    mongo_db: str = "internal_tool"
    secret_key: str = "dev-secret"

    class Config:
        env_file = ".env"


settings = Settings()

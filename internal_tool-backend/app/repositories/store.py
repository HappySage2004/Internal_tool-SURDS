from app.repositories.base import Repository


class Store:
    """One Repository per collection. Injected via FastAPI dependency."""
    users:        Repository
    goals:        Repository
    spaces:       Repository
    tasks:        Repository
    documents:    Repository
    thread_posts: Repository
    meetings:     Repository
    inbox_items:  Repository

    def __init__(self, **collections: Repository) -> None:
        for name, repo in collections.items():
            setattr(self, name, repo)

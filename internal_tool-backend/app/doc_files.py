"""File storage for document markdown bodies.

Document *metadata* lives in the JSON/Mongo collection; the markdown *body*
lives on disk as one `<id>.md` file under `Documents_Stage/` (see config).
Each file carries a small YAML front-matter header so the folder is
human-browsable; the header is stripped on read so content round-trips cleanly.

Link documents (those with a `url`) are bookmarks with no body, so no file is
written for them.
"""

from __future__ import annotations

import re
from pathlib import Path

from app.config import settings

_FRONT_MATTER = re.compile(r"^---\n.*?\n---\n", re.DOTALL)


def _stage_dir() -> Path:
    return Path(settings.documents_stage_path)


def doc_file_path(doc_id: str) -> Path:
    return _stage_dir() / f"{doc_id}.md"


def write_document_file(doc: dict, content: str) -> None:
    """Write (or overwrite) the staged markdown file for a document."""
    directory = _stage_dir()
    directory.mkdir(parents=True, exist_ok=True)
    front_matter = (
        "---\n"
        f"id: {doc.get('id', '')}\n"
        f"title: {doc.get('title', 'Untitled')}\n"
        f"space_id: {doc.get('space_id') or ''}\n"
        f"owner_id: {doc.get('owner_id', '')}\n"
        f"updated_at: {doc.get('updated_at', '')}\n"
        "---\n"
    )
    doc_file_path(doc["id"]).write_text(front_matter + (content or ""), encoding="utf-8")


def read_document_content(doc_id: str) -> str | None:
    """Return the markdown body (front matter stripped), or None if no file."""
    path = doc_file_path(doc_id)
    if not path.exists():
        return None
    raw = path.read_text(encoding="utf-8")
    return _FRONT_MATTER.sub("", raw, count=1)


def delete_document_file(doc_id: str) -> None:
    path = doc_file_path(doc_id)
    if path.exists():
        path.unlink()

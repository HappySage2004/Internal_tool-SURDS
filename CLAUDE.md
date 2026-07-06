# CLAUDE.md — Engineering Guide

This file tells the Claude Code agents how to build the internal work & communication tool. It is one of three canonical documents; read all three before writing code.

| File | What it is |
|---|---|
| `internal-tool-design.md` | Product rationale, **data model (§5)**, **invariants (§6)**, scope. The data/rules contract. |
| `UI.md` | The complete UI/UX brief: visual language, every screen, components, and demo data. The look/interaction contract. |
| `CLAUDE.md` (this file) | Stack, repository layout, the data-access pattern, coding conventions, run/migrate instructions. |

There is no other spec and no prior context beyond these files. If something isn't covered, prefer the simplest choice consistent with the principles below, and leave a `// TODO(confirm):` note rather than inventing scope.

---

## 1. The product in one paragraph

A fast, minimal internal tool for a startup under 10 people. It unifies tasks, documents, asynchronous communication (threads), and a meeting log. Engineering teams run git-linked **projects**; ops/sales/finance run **workstreams** — both are the same `Space` object in two modes, both ladder up to company **Goals**. Each person works from a personal **My work** screen. Full detail is in `internal-tool-design.md`; every screen is specified in `UI.md`.

## 2. Golden rules (do not violate)

1. **Build to the specs.** Data shapes and rules come from `internal-tool-design.md` §5/§6; layout and interaction from `UI.md`. Don't redesign either.
2. **Minimal options.** Exactly the enums in design §3 — five task statuses, three priorities, two space modes. Don't add settings or options not in the spec.
3. **Everything optional except required fields** (design §3). The create-task form takes a title and nothing else.
4. **Enforce privacy and invariants server-side** (design §6). The store enforces nothing; the backend must. Never return a private task/doc to anyone but its owner.
5. **Speed is the feature.** Optimistic UI updates, no spinners for local actions, keyboard-first (`⌘K`, `C`). See `UI.md` §3–§4.
6. **Don't build deferred scope** (design §7): no real auth/permissions for the demo, no file types beyond markdown/PDF/image, no real-time chat, no external meeting integrations.

## 3. Stack

- **Frontend:** React (TypeScript recommended so types mirror the API). Vite dev server.
- **Backend:** FastAPI (Python 3.11+), Pydantic v2 for request/response models and validation.
- **Storage now:** local JSON files in `local_DB/` — one file per collection, each an array of documents matching design §5.
- **Storage target:** MongoDB (preferred). **Fallback:** PostgreSQL. The migration is a config flip plus one repository implementation (see §9).
- **Files:** markdown / PDF / image only. **All document bytes live in one staging folder** — `Documents_Stage/<id>.md` for markdown bodies, `Documents_Stage/<id>.<ext>` for uploaded pdf/image — at repo root. The collection record holds metadata only; the markdown body is injected on read, and uploaded bytes are served through a **privacy-gated** endpoint (`GET /documents/{id}/file`), never a static mount, so §6 personal-doc privacy holds for files too. Link bookmarks carry a `url` and have no file. Config: `DOCUMENTS_STAGE_PATH`. (This single folder is the local stand-in for object storage / GridFS on migration.)
- **Markdown rendering:** the frontend renders doc bodies with `react-markdown` + `remark-gfm` (GFM). Store raw markdown, never rendered HTML.

## 4. Repository layout

```
/
├── CLAUDE.md                  # this file
├── internal-tool-design.md    # data model + rules
├── UI.md                      # UI brief
├── local_DB/                  # interim JSON "database" (git-ignored except seed)
│   ├── users.json
│   ├── goals.json
│   ├── spaces.json
│   ├── tasks.json
│   ├── documents.json
│   ├── thread_posts.json
│   ├── meetings.json
│   └── inbox_items.json
├── Documents_Stage/           # ALL document bytes: <id>.md bodies + uploaded <id>.<ext> files (git-ignored)
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, router registration
│   │   ├── config.py          # env-driven settings (STORAGE_BACKEND, paths, origins)
│   │   ├── deps.py            # dependency providers (current user, repositories)
│   │   ├── models/            # Pydantic models — mirror design §5 shapes
│   │   ├── routers/           # one module per resource (tasks, spaces, goals, ...)
│   │   ├── services/          # business logic + the design §6 invariants live HERE
│   │   └── repositories/      # data access ONLY
│   │       ├── base.py        # Repository protocol/ABC (CRUD + query)
│   │       ├── json_repo.py   # reads/writes local_DB/*.json  (current)
│   │       └── mongo_repo.py  # MongoDB implementation        (later)
│   ├── requirements.txt
│   └── tests/
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── api/               # thin typed client to the backend
    │   ├── types/             # shared data types (mirror design §5)
    │   ├── components/        # reusable UI pieces (UI.md §7); incl. panels/DocumentViewer (markdown render/edit)
    │   ├── screens/           # one per UI.md §6 screen
    │   ├── lib/               # keyboard shortcuts, formatting, hooks; incl. linkProvider (URL → provider icon)
    │   └── styles/            # tokens from UI.md §4
    ├── index.html
    └── package.json
```

## 5. Backend conventions

- **Layering is strict:** `routers` (HTTP) → `services` (rules) → `repositories` (storage). Routers never touch storage directly; services never read files or the DB directly — only through a repository.
- **Repository pattern is mandatory** because storage will migrate (JSON → Mongo/Postgres). Define one interface in `base.py`:
  ```python
  class Repository(Protocol):
      async def get(self, collection: str, id: str) -> dict | None: ...
      async def list(self, collection: str, where: dict | None = None) -> list[dict]: ...
      async def create(self, collection: str, doc: dict) -> dict: ...
      async def update(self, collection: str, id: str, patch: dict) -> dict: ...
      async def delete(self, collection: str, id: str) -> None: ...
  ```
  `JsonRepository` implements it over `local_DB/*.json`; `MongoRepository` implements the same interface later. Keep the interface **async** even though the JSON version is effectively synchronous, so `motor` (async Mongo) drops in unchanged. Inject the active repository via `deps.py`, chosen by `config.STORAGE_BACKEND`.
- **`local_DB` JSON handling:** each file is a JSON array. Load-all / filter-in-memory / save-all is fine at this scale (<10 users). **Write atomically**: serialize to a temp file in the same dir, then `os.replace()` — never partial-write a JSON file. Use a process-level lock around writes to avoid concurrent corruption.
- **Pydantic models mirror design §5** field-for-field, including which fields are optional. Use them for both validation and serialization. Keep the enum definitions in one module and reuse them.
- **Document bodies on disk:** the `documents` collection stores metadata only; the markdown body is written to `Documents_Stage/<id>.md` (with a small stripped-on-read front-matter header) and re-attached to `content` on read, falling back to any inline `content` for seed data. Link bookmarks (`url` set) get no file. Isolate this in one small module (e.g. `doc_files.py`) so the Mongo backend can swap it for GridFS/object storage without touching routers.
- **Uploaded docs (pdf/image):** `POST /documents/upload` (multipart) validates the kind (pdf/image only — reject others 415, per §6 #9), writes bytes into the staging folder (`Documents_Stage/<id>.<ext>`), and creates a document with one `attachments` entry (empty `content`). Bytes are served by `GET /documents/{id}/file`, which runs the **same §6 visibility check** as the doc (so a personal doc's file isn't public) and returns them `inline`; the frontend uses `<API base>/documents/{id}/file` as the file URL. **Do not** statically mount the staging folder — that would bypass the privacy filter.
- **Invariants (design §6) live in services**, applied on every relevant write and read. In particular, every list/get of tasks and documents must filter by the current user so private items never leak. Put this in one helper that all read paths call.
- **Current user:** provide it via a dependency (`deps.get_current_user`). For the demo, accept an `X-User-Id` header or fall back to a seeded dev user. Do **not** build real auth — but route every request through this dependency so a real auth layer can replace it later without touching services.
- **API shape:** REST, plural nouns (`/tasks`, `/spaces/{id}/tasks`, `/threads/general/posts`, `/meetings`). JSON bodies. Correct status codes (201 on create, 404 missing, 422 validation, 409 invariant violation). Consistent error body:
  ```json
  { "error": { "code": "string", "message": "human-readable" } }
  ```
  No pagination needed at this scale. Enable CORS for the Vite origin (`config.FRONTEND_ORIGIN`).
- **Side effects:** writing a comment that @mentions someone, assigning a task, or requesting review must also create an `inbox_items` row (design §6 #?, see §6 broadly). Merging a git link advances task status (mock the git event in the demo via an endpoint).

## 6. Frontend conventions

- **React function components + hooks.** TypeScript recommended; put shared shapes in `src/types/` mirroring design §5 so the client and server agree.
- **Follow `UI.md` exactly** for layout, the multi-column screens (main + Docs column + Thread column; the Spaces hub is the same shape at org level, no tabs), navigation (sidebar + Spaces hub + standalone Meetings), and the visual language: Inter for UI text, **JetBrains Mono** for task keys / KR numbers / timestamps, a single indigo accent, flat hairline borders, sentence case everywhere, no gradients or shadows (focus ring only). Don't invent styling — `UI.md` §4 is the token system.
- **Markdown docs:** render bodies with `react-markdown` + `remark-gfm` inside the document viewer (`.markdown-body` styles in `index.css`, built from the §4 tokens). External-link docs (Document with a `url`) render a provider icon via `lib/linkProvider` and open in a new tab instead of the viewer.
- **Data layer:** a thin typed client in `src/api/`. Use optimistic updates for status changes, task creation, and posting to threads (revert on error) to hit the speed bar. A lightweight cache (e.g. React Query) is fine; avoid heavy global state.
- **Keyboard-first:** global `⌘K` command palette and `C` quick-create (`UI.md` §6F/§6H). Visible focus on every interactive element; respect `prefers-reduced-motion`; responsive down to tablet (right rails collapse to overlays).
- **Screens map 1:1 to `UI.md` §6** (My work, Spaces hub, Space detail, Goals rollup, Task detail panel, Quick-create, Document editor, Command palette, Meetings). Components map to `UI.md` §7.
- **No localStorage for app data** — state comes from the API. Local UI prefs (collapsed rails, theme) may use localStorage.

## 7. The shared data contract

The document shapes in `internal-tool-design.md` §5 are the single contract. Backend Pydantic models and frontend TypeScript types both derive from them; enum values come from design §3 and must match exactly on both sides. When a shape changes, change it in the design doc first, then both code sides.

## 8. Config, env, and running locally

`.env` (never hardcode):
```
STORAGE_BACKEND=json          # json | mongo
LOCAL_DB_PATH=./local_DB
DOCUMENTS_STAGE_PATH=         # all document bytes (md bodies + uploaded files); defaults to <repo root>/Documents_Stage
MONGO_URI=                     # set when STORAGE_BACKEND=mongo
FRONTEND_ORIGIN=http://localhost:5173
```

Run:
```
# backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend
cd frontend && npm install && npm run dev   # serves on :5173, proxies API to :8000
```

Seed `local_DB/` from the demo data in `UI.md` §9 on first run if the files are empty, so no screen is ever blank.

## 9. Migration plan (JSON → Mongo / Postgres)

- **To MongoDB:** implement `MongoRepository` against the `Repository` interface (use `motor`). Write a one-off `scripts/import_json_to_mongo.py` that loads each `local_DB/*.json` array into the same-named collection — shapes are identical, so no transformation. Set `STORAGE_BACKEND=mongo` and `MONGO_URI`. Nothing in `services`/`routers` changes.
- **To PostgreSQL (fallback):** see `internal-tool-design.md` §8. Collections → tables, embedded arrays → child tables or `jsonb`, the §6 invariants → `CHECK` constraints + row-level security, enums → Postgres enum types. Implement a `PostgresRepository` behind the same interface.

## 10. Testing & tooling

- **Backend:** `pytest`. Prioritize the repository layer and the §6 invariants — especially privacy (a private task/doc must never appear for another user). Test the goal-rollup logic (latest status post per Space) and the task-status transitions.
- **Frontend:** keep light; a few component/interaction tests for the task list, quick-create, and the goals rollup are enough.
- **Style:** Python — Ruff + Black, full type hints, Pydantic v2. JS/TS — ESLint + Prettier. Small, focused modules.

## 11. Build order

Follow `UI.md` §10 priorities:

- **P0:** My work · Goals rollup · one engineering Space detail (tasks + right rail with docs and thread) · quick-create modal · task detail panel. Backend: users, spaces, tasks (incl. personal + privacy), goals + rollup, thread_posts, inbox.
- **P1:** Spaces hub (three columns: Spaces list + Docs rail + General thread) · standalone Meetings area · workstream Space variant · command palette.
- **P2:** Document editor · richer meetings (integrations) · dark mode polish · settings.

Build P0 end-to-end (backend + frontend) before starting P1.

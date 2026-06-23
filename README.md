# SURDS — internal work & communication tool

A fast, minimal internal tool for a small (<10 person) startup. It unifies
**tasks**, **documents**, asynchronous **threads**, **goals**, and a **meeting
log** in one keyboard-first workspace. Engineering teams run git-linked
**projects**; ops/sales/finance run **workstreams** — both are the same `Space`
object in two modes, and both ladder up to company **Goals**.

## Documentation

The product is fully specified across three canonical docs — read them before
changing anything:

| Doc | What it covers |
|---|---|
| [internal-tool-design.md](internal-tool-design.md) | Product rationale, data model (§5), invariants (§6), scope |
| [UI.md](UI.md) | Visual language, every screen, components, demo data |
| [CLAUDE.md](CLAUDE.md) | Stack, repo layout, data-access pattern, conventions, run steps |

## Stack

- **Backend:** FastAPI (Python 3.11+), Pydantic v2 — `internal_tool-backend/`
- **Frontend:** React + TypeScript, Vite — `internal_tool-ui/`
- **Storage:** local JSON files in `local_DB/` now; MongoDB later (config flip + one repository impl)

## Running locally

```bash
# backend  →  http://localhost:8000
cd internal_tool-backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend →  http://localhost:5173
cd internal_tool-ui
npm install
npm run dev
```

Copy `.env.example` to `.env` and adjust if needed. On first run the backend
seeds `local_DB/` from the demo data so no screen is ever blank.

## Status

Early build — see CLAUDE.md §11 for the P0 → P2 build order.

---
name: auth-setup
description: How the internal tool's simple per-user auth works (added 2026-07-19) — tokens, password hashing, initial passwords, reset script
metadata:
  type: project
---

Simple per-user auth was added on 2026-07-19 (the user explicitly asked for it, deviating from CLAUDE.md's "no real auth for the demo" note). Design goals: minimal, no forgot-password flow, rare re-login.

**Backend** (stdlib only — no bcrypt/Rust deps, deliberately):
- `app/security.py` — PBKDF2-HMAC-SHA256 password hashing (`hash_password`/`verify_password`) + stateless HMAC-signed session tokens (`create_token`/`verify_token`), signed with `settings.secret_key`. Tokens carry `{uid, exp}` and last **60 days**.
- `app/routers/auth.py` — `POST /auth/login` (email+password → `{token, user}`), `GET /auth/me`, `POST /auth/change-password`.
- `dependencies.get_current_user` now **requires** `Authorization: Bearer <token>` and returns 401 otherwise (previously a stub returning "aaryan"). All routers already flow through it.
- Passwords stored as `password_hash` on the user doc; never returned (UserOut omits it).

**Initial passwords:** `DB_init_SCRIPT.py` backfills any user lacking a password with **initial password == their user id** (e.g. aaryan's is "aaryan"); users should change it in-app. Admin resets: `python scripts/set_password.py <email-or-id> <new-password>`. There is intentionally no forgot-password flow.

**Frontend:**
- `src/context/AuthContext.tsx` (`useAuth`) holds `currentUser`/`userId`; `src/components/screens/Login.tsx` is the gate; `main.tsx` shows Login until authed, then mounts DataProvider.
- `src/api/client.ts` sends the bearer token (localStorage key `surds.token`) and on 401 fires `surds:unauthorized` → logout. Sidebar has a sign-out button.
- The old hardcoded `'aaryan'` current-user id (see [[blank-screen-fragility]]) is now `useAuth().userId` everywhere.

**IMPORTANT:** set a strong `SECRET_KEY` in `internal_tool-backend/.env` — the `settings.secret_key` default is `"dev-secret"`, and anyone who knows it can forge tokens.

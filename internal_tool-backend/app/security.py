"""
Password hashing and session tokens — stdlib only (no native/Rust build deps).

Passwords are stored as PBKDF2-HMAC-SHA256 hashes (never plaintext).
Sessions are stateless HMAC-signed tokens carrying the user id and an expiry,
so no server-side session store is needed. Both are signed/keyed with
`settings.secret_key` — set a strong SECRET_KEY in .env for anything real.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time

from app.config import settings

# ─── Password hashing (PBKDF2-HMAC-SHA256) ──────────────────────────────────

_PBKDF2_ITERATIONS = 240_000
_PBKDF2_ALGO = "sha256"


def hash_password(password: str) -> str:
    """Return a self-describing hash string: pbkdf2_sha256$<iters>$<salt>$<hash>."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac(_PBKDF2_ALGO, password.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(
        _PBKDF2_ITERATIONS,
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(dk).decode("ascii"),
    )


def verify_password(password: str, stored: str | None) -> bool:
    """Constant-time verify of `password` against a stored hash string."""
    if not stored:
        return False
    try:
        algo, iters_s, salt_b64, hash_b64 = stored.split("$", 3)
        if algo != "pbkdf2_sha256":
            return False
        iters = int(iters_s)
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
    except (ValueError, TypeError):
        return False
    dk = hashlib.pbkdf2_hmac(_PBKDF2_ALGO, password.encode("utf-8"), salt, iters)
    return hmac.compare_digest(dk, expected)


# ─── Session tokens (stateless, HMAC-signed) ────────────────────────────────

_TOKEN_DEFAULT_DAYS = 60


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def _sign(payload_b64: str) -> str:
    sig = hmac.new(settings.secret_key.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256).digest()
    return _b64url_encode(sig)


def create_token(user_id: str, days: int = _TOKEN_DEFAULT_DAYS) -> str:
    """Create a signed `<payload>.<sig>` token that expires in `days` days."""
    payload = {"uid": user_id, "exp": int(time.time()) + days * 86_400}
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    return f"{payload_b64}.{_sign(payload_b64)}"


def verify_token(token: str | None) -> str | None:
    """Return the user id if the token is well-formed, unexpired, and correctly
    signed; otherwise None."""
    if not token or "." not in token:
        return None
    payload_b64, _, sig = token.partition(".")
    if not hmac.compare_digest(_sign(payload_b64), sig):
        return None
    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except (ValueError, TypeError):
        return None
    if not isinstance(payload, dict) or "uid" not in payload or "exp" not in payload:
        return None
    if int(payload["exp"]) < int(time.time()):
        return None
    return str(payload["uid"])

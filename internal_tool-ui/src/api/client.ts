const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

// Base for static assets served by the backend (e.g. /uploads/<file>).
export const ASSET_BASE = BASE

// ─── Session token ──────────────────────────────────────────────────────────
// The bearer token from /auth/login, persisted so a ~60-day session survives
// reloads. Every request carries it; a 401 clears it and signals a re-login.

const TOKEN_KEY = 'surds.token'

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token: string): void {
  try { localStorage.setItem(TOKEN_KEY, token) } catch { /* ignore */ }
}

export function clearToken(): void {
  try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// A 401 means the session is gone/expired: drop the token and let the app
// (AuthContext) fall back to the login screen.
function handleUnauthorized(): void {
  clearToken()
  window.dispatchEvent(new Event('surds:unauthorized'))
}

// Recursively convert snake_case object keys to camelCase
function toCamel(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(toCamel)
  if (val !== null && typeof val === 'object') {
    return Object.fromEntries(
      Object.entries(val as Record<string, unknown>).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
        toCamel(v),
      ]),
    )
  }
  return val
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...init?.headers },
  })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}: ${detail}`)
  }
  if (res.status === 204) return undefined as T
  return toCamel(await res.json()) as T
}

export const get  = <T>(path: string)                  => request<T>(path)
export const post = <T>(path: string, body?: unknown)  => request<T>(path, { method: 'POST',  body: body ? JSON.stringify(body) : undefined })

// Multipart POST — no JSON Content-Type (the browser sets the boundary).
export async function postForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body: form, headers: authHeaders() })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`POST ${path} → ${res.status}: ${detail}`)
  }
  return toCamel(await res.json()) as T
}
export const patch = <T>(path: string, body: unknown)  => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
export const del  = (path: string)                     => request<void>(path, { method: 'DELETE' })

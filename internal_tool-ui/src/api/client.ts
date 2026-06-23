const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

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
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}: ${detail}`)
  }
  if (res.status === 204) return undefined as T
  return toCamel(await res.json()) as T
}

export const get  = <T>(path: string)                  => request<T>(path)
export const post = <T>(path: string, body?: unknown)  => request<T>(path, { method: 'POST',  body: body ? JSON.stringify(body) : undefined })
export const patch = <T>(path: string, body: unknown)  => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
export const del  = (path: string)                     => request<void>(path, { method: 'DELETE' })

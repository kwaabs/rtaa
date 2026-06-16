import { authStore } from '@/stores/authStore'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:9833'

type FetchOptions = RequestInit & { params?: Record<string, string> }

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const session = authStore.getState().session
  const token = session?.access_token

  const url = new URL(`${API_BASE}${path}`)
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(url.toString(), { ...options, headers })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }

  const json = await res.json()
  // Unwrap envelope: { data: T }
  return (json as { data: T }).data ?? json
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) =>
    apiFetch<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

const TOKEN_STORAGE_KEY = 'fptn-panel:token'
const MUST_CHANGE_PASSWORD_KEY = 'fptn-panel:must-change-password'

export const getToken = (): string | null =>
  localStorage.getItem(TOKEN_STORAGE_KEY)

export const setToken = (token: string): void =>
  localStorage.setItem(TOKEN_STORAGE_KEY, token)

export const clearToken = (): void => localStorage.removeItem(TOKEN_STORAGE_KEY)

export const getMustChangePassword = (): boolean =>
  localStorage.getItem(MUST_CHANGE_PASSWORD_KEY) === 'true'

export const setMustChangePassword = (value: boolean): void => {
  if (value) {
    localStorage.setItem(MUST_CHANGE_PASSWORD_KEY, 'true')
  } else {
    localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY)
  }
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  auth?: boolean
}

const extractErrorMessage = async (response: Response): Promise<string> => {
  const data: unknown = await response.json().catch(() => null)
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    const text = record.message ?? record.detail
    if (typeof text === 'string') return text
  }
  return response.statusText || `Request failed with status ${response.status}`
}

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { method = 'GET', body, auth = true } = options

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

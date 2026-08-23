import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  apiRequest,
  clearToken,
  getMustChangePassword,
  getToken,
  setMustChangePassword,
  setToken
} from './client'

describe('token storage', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips the auth token through localStorage', () => {
    expect(getToken()).toBeNull()
    setToken('jwt-123')
    expect(getToken()).toBe('jwt-123')
    clearToken()
    expect(getToken()).toBeNull()
  })

  it('round-trips the must-change-password flag', () => {
    expect(getMustChangePassword()).toBe(false)
    setMustChangePassword(true)
    expect(getMustChangePassword()).toBe(true)
    setMustChangePassword(false)
    expect(getMustChangePassword()).toBe(false)
  })
})

describe('apiRequest', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('attaches the bearer token when one is stored', async () => {
    setToken('jwt-abc')
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))

    await apiRequest('/ping')

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      'Bearer jwt-abc'
    )
  })

  it('omits the Authorization header when auth is disabled', async () => {
    setToken('jwt-abc')
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))

    await apiRequest('/login', { auth: false })

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(
      (init?.headers as Record<string, string>).Authorization
    ).toBeUndefined()
  })

  it('serializes the body as JSON and sends the method', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))

    await apiRequest('/users', { method: 'POST', body: { username: 'x' } })

    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain('/users')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ username: 'x' }))
  })

  it('returns undefined for a 204 response without parsing a body', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

    await expect(
      apiRequest('/servers/regular/x', { method: 'DELETE' })
    ).resolves.toBeUndefined()
  })

  it('resolves with the parsed JSON body on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ totalUsers: 3 }), { status: 200 })
    )

    await expect(apiRequest('/dashboard/highlights')).resolves.toEqual({
      totalUsers: 3
    })
  })

  it('throws an ApiError using the backend "message" field', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Server S1 already exists' }), {
        status: 409
      })
    )

    await expect(
      apiRequest('/servers', { method: 'POST' })
    ).rejects.toMatchObject({
      status: 409,
      message: 'Server S1 already exists'
    })
  })

  it('falls back to the "detail" field for non-fptn backends', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Not authenticated' }), {
        status: 401
      })
    )

    await expect(apiRequest('/users')).rejects.toMatchObject({
      message: 'Not authenticated'
    })
  })

  it('falls back to the status text when the error body has neither field', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('not json', {
        status: 500,
        statusText: 'Internal Server Error'
      })
    )

    await expect(apiRequest('/users')).rejects.toMatchObject({
      message: 'Internal Server Error'
    })
  })

  it('rejects with an ApiError instance', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 404 }))

    await expect(apiRequest('/users/ghost')).rejects.toBeInstanceOf(ApiError)
  })
})

import { ReactElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, setToken } from '../api/client'
import { AuthProvider, useAuth } from './AuthContext'

const Probe = (): ReactElement => {
  const { isAuthenticated } = useAuth()
  return <span>{isAuthenticated ? 'authenticated' : 'anonymous'}</span>
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts authenticated when a token is already stored', () => {
    setToken('jwt-abc')
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )
    expect(screen.getByText('authenticated')).toBeInTheDocument()
  })

  it('flips to anonymous when an API call comes back with an expired session', async () => {
    setToken('jwt-abc')
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    )
    expect(screen.getByText('authenticated')).toBeInTheDocument()

    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 401 }))
    void apiRequest('/users').catch(() => undefined)

    await waitFor(() =>
      expect(screen.getByText('anonymous')).toBeInTheDocument()
    )
  })
})

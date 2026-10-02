import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '../api/client'
import { createUser, issueToken, listUsers, VpnUser } from '../api/users'
import { getHighlights } from '../api/dashboard'
import Users from './Users'

vi.mock('../api/users', async () => {
  const actual = await vi.importActual<typeof import('../api/users')>(
    '../api/users'
  )
  return {
    ...actual,
    listUsers: vi.fn(),
    updateUser: vi.fn(),
    createUser: vi.fn(),
    issueToken: vi.fn()
  }
})

vi.mock('../api/dashboard', () => ({
  getHighlights: vi.fn()
}))

const submitButton = (): HTMLElement => {
  const buttons = screen.getAllByRole('button', { name: /^add user$/i })
  return buttons[buttons.length - 1]
}

const someUser: VpnUser = {
  username: 'existing1',
  blocked: false,
  premiumAccess: false,
  maxSpeed: 20
}

describe('Users page — create user', () => {
  beforeEach(() => {
    vi.mocked(listUsers).mockResolvedValue({ users: [someUser], total: 1 })
    vi.mocked(getHighlights).mockResolvedValue({
      totalUsers: 1,
      premiumUsers: 0,
      blockedUsers: 0
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('opens the modal with a default max speed of 20', async () => {
    const user = userEvent.setup()
    render(<Users />)

    await user.click(await screen.findByRole('button', { name: /add user/i }))

    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^max speed$/i)).toHaveValue(20)
  })

  it('submits the trimmed username, chosen speed and premium flag', async () => {
    vi.mocked(createUser).mockResolvedValue({
      username: '12345',
      blocked: false,
      premiumAccess: true,
      maxSpeed: 50,
      token: 'fptn:abc123'
    })
    const user = userEvent.setup()
    render(<Users />)

    await user.click(await screen.findByRole('button', { name: /add user/i }))
    await user.type(screen.getByLabelText(/^username$/i), '  12345  ')
    await user.clear(screen.getByLabelText(/^max speed$/i))
    await user.type(screen.getByLabelText(/^max speed$/i), '50')
    await user.click(screen.getByLabelText(/premium access/i))
    await user.click(submitButton())

    await waitFor(() =>
      expect(createUser).toHaveBeenCalledWith({
        username: '12345',
        maxSpeed: 50,
        premiumAccess: true
      })
    )
    // The modal stays open and now shows the access token for the admin to copy.
    expect(await screen.findByText('fptn:abc123')).toBeInTheDocument()
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument()
    // the password itself is still never surfaced, only the token
    expect(submitButton()).toBeDisabled()
  })

  it('copies the token and closes the modal from the Done button', async () => {
    vi.mocked(createUser).mockResolvedValue({
      username: '12345',
      blocked: false,
      premiumAccess: false,
      maxSpeed: 20,
      token: 'fptn:abc123'
    })
    const user = userEvent.setup()
    const writeText = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true
    })
    render(<Users />)

    await user.click(await screen.findByRole('button', { name: /add user/i }))
    await user.type(screen.getByLabelText(/^username$/i), '12345')
    await user.click(submitButton())
    await screen.findByText('fptn:abc123')

    await user.click(screen.getByRole('button', { name: /copy/i }))
    expect(writeText).toHaveBeenCalledWith('fptn:abc123')
    expect(await screen.findByText(/copied/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /done/i }))
    expect(screen.queryByText('fptn:abc123')).not.toBeInTheDocument()
  })

  it('rejects a non-alphanumeric username without calling the API', async () => {
    const user = userEvent.setup()
    render(<Users />)

    await user.click(await screen.findByRole('button', { name: /add user/i }))
    await user.type(screen.getByLabelText(/^username$/i), 'bad name!')
    await user.click(submitButton())

    expect(
      await screen.findByText(/only letters and numbers/i)
    ).toBeInTheDocument()
    expect(createUser).not.toHaveBeenCalled()
  })

  it('shows the backend message when the username already exists', async () => {
    vi.mocked(createUser).mockRejectedValue(
      new ApiError(409, 'User 12345 already exists')
    )
    const user = userEvent.setup()
    render(<Users />)

    await user.click(await screen.findByRole('button', { name: /add user/i }))
    await user.type(screen.getByLabelText(/^username$/i), '12345')
    await user.click(submitButton())

    expect(
      await screen.findByText('User 12345 already exists')
    ).toBeInTheDocument()
  })
})

describe('Users page — issue a new token', () => {
  beforeEach(() => {
    vi.mocked(listUsers).mockResolvedValue({ users: [someUser], total: 1 })
    vi.mocked(getHighlights).mockResolvedValue({
      totalUsers: 1,
      premiumUsers: 0,
      blockedUsers: 0
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('warns before issuing and only calls the API after confirming', async () => {
    vi.mocked(issueToken).mockResolvedValue({ token: 'fptn:new-token' })
    const user = userEvent.setup()
    render(<Users />)

    await user.click(
      await screen.findByRole('button', {
        name: /issue a new token for existing1/i
      })
    )

    expect(
      screen.getByText(/old access token for existing1 will stop working/i)
    ).toBeInTheDocument()
    expect(issueToken).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /^issue$/i }))

    expect(issueToken).toHaveBeenCalledWith('existing1')
    expect(await screen.findByText('fptn:new-token')).toBeInTheDocument()
  })

  it('closes without issuing when cancelled', async () => {
    const user = userEvent.setup()
    render(<Users />)

    await user.click(
      await screen.findByRole('button', {
        name: /issue a new token for existing1/i
      })
    )
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(issueToken).not.toHaveBeenCalled()
    expect(
      screen.queryByText(/old access token for existing1 will stop working/i)
    ).not.toBeInTheDocument()
  })

  it('shows the backend error when issuing fails', async () => {
    vi.mocked(issueToken).mockRejectedValue(new ApiError(404, 'User not found'))
    const user = userEvent.setup()
    render(<Users />)

    await user.click(
      await screen.findByRole('button', {
        name: /issue a new token for existing1/i
      })
    )
    await user.click(screen.getByRole('button', { name: /^issue$/i }))

    expect(await screen.findByText('User not found')).toBeInTheDocument()
  })
})

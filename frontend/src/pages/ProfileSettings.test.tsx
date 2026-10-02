import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '../api/client'
import { getCurrentAdmin, updateProfile } from '../api/auth'
import ProfileSettings from './ProfileSettings'

vi.mock('../api/auth', () => ({
  getCurrentAdmin: vi.fn(),
  updateProfile: vi.fn()
}))

const mockRefreshProfile = vi.fn().mockResolvedValue(undefined)
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ refreshProfile: mockRefreshProfile })
}))

describe('ProfileSettings', () => {
  beforeEach(() => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({ username: 'admin' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('prefills the username field with the current admin login', async () => {
    render(<ProfileSettings />)

    expect(await screen.findByLabelText(/username/i)).toHaveValue('admin')
  })

  it('refuses to submit when nothing changed', async () => {
    const user = userEvent.setup()
    render(<ProfileSettings />)
    await screen.findByLabelText(/username/i)

    await user.type(screen.getByLabelText(/current password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(
      await screen.findByText(/change the username or set a new password/i)
    ).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('rejects mismatched password confirmation', async () => {
    const user = userEvent.setup()
    render(<ProfileSettings />)
    await screen.findByLabelText(/username/i)

    await user.type(screen.getByLabelText(/^new password$/i), 'brandnew1')
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      'different1'
    )
    await user.type(screen.getByLabelText(/current password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('submits the new username and password, then refreshes the session', async () => {
    vi.mocked(updateProfile).mockResolvedValue({
      access_token: 'new-jwt',
      token_type: 'bearer',
      mustChangePassword: false
    })
    const user = userEvent.setup()
    render(<ProfileSettings />)
    const usernameInput = await screen.findByLabelText(/username/i)

    await user.clear(usernameInput)
    await user.type(usernameInput, 'newlogin')
    await user.type(screen.getByLabelText(/^new password$/i), 'brandnew1')
    await user.type(screen.getByLabelText(/confirm new password/i), 'brandnew1')
    await user.type(screen.getByLabelText(/current password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        currentPassword: 'secret',
        newUsername: 'newlogin',
        newPassword: 'brandnew1'
      })
    )
    expect(mockRefreshProfile).toHaveBeenCalled()
    expect(await screen.findByText(/profile updated/i)).toBeInTheDocument()
  })

  it('shows the backend error when the current password is wrong', async () => {
    vi.mocked(updateProfile).mockRejectedValue(
      new ApiError(401, 'Current password is incorrect')
    )
    const user = userEvent.setup()
    render(<ProfileSettings />)
    const usernameInput = await screen.findByLabelText(/username/i)

    await user.clear(usernameInput)
    await user.type(usernameInput, 'newlogin')
    await user.type(screen.getByLabelText(/current password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(
      await screen.findByText('Current password is incorrect')
    ).toBeInTheDocument()
  })
})

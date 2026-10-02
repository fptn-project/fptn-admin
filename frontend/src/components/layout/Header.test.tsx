import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Header from './Header'
import { LayoutProvider } from './LayoutContext'
import { ThemeProvider } from '../../theme/ThemeProvider'

const mockLogout = vi.fn()
const mockUsername: string | null = 'anna'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout, username: mockUsername })
}))

const renderHeader = (): ReturnType<typeof render> =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <ThemeProvider>
        <LayoutProvider>
          <Header />
          <Routes>
            <Route path="/" element={<div>home-page</div>} />
            <Route path="/profile" element={<div>profile-page</div>} />
          </Routes>
        </LayoutProvider>
      </ThemeProvider>
    </MemoryRouter>
  )

describe('Header user menu', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
  })

  it('shows the real signed-in username instead of a hardcoded "admin"', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(screen.getByText('AN'))

    expect(screen.getByText('anna')).toBeInTheDocument()
    expect(screen.queryByText('admin')).not.toBeInTheDocument()
  })

  it('navigates to the profile settings page from the user menu', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(screen.getByText('AN'))
    await user.click(screen.getByRole('button', { name: /profile settings/i }))

    expect(screen.getByText('profile-page')).toBeInTheDocument()
  })
})

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import LanguageSwitcher from './LanguageSwitcher'

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  afterEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('en')
  })

  it('shows the current language code', () => {
    render(<LanguageSwitcher />)

    expect(screen.getByRole('button')).toHaveTextContent('en')
  })

  it('switches to the other supported language on click', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await user.click(screen.getByRole('button'))

    await waitFor(() => expect(i18n.language).toBe('ru'))
    expect(screen.getByRole('button')).toHaveTextContent('ru')
  })

  it('toggles back on a second click', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await user.click(screen.getByRole('button'))
    await waitFor(() => expect(i18n.language).toBe('ru'))
    await user.click(screen.getByRole('button'))

    await waitFor(() => expect(i18n.language).toBe('en'))
  })

  it('persists the choice to localStorage so it survives a reload', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await user.click(screen.getByRole('button'))

    await waitFor(() =>
      expect(localStorage.getItem('fptn-panel:language')).toBe('ru')
    )
  })
})

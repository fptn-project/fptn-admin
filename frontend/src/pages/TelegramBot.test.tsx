import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BotSettings, getBotSettings } from '../api/settings'
import TelegramBot from './TelegramBot'

vi.mock('../api/settings', () => ({
  getBotSettings: vi.fn(),
  updateBotSettings: vi.fn(),
  updateBotEnabled: vi.fn()
}))

const baseSettings: BotSettings = {
  telegramToken: '****ubvs',
  botEnabled: false,
  botRunning: false,
  maxUserSpeedLimit: 30,
  serviceName: 'fptn',
  welcomeMessageEn: 'Hi EN',
  welcomeMessageRu: 'Привет RU'
}

describe('TelegramBot settings', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('leaves the fields editable when the bot is disabled', async () => {
    vi.mocked(getBotSettings).mockResolvedValue({
      ...baseSettings,
      botEnabled: false
    })
    render(<TelegramBot />)

    expect(await screen.findByLabelText(/service name/i)).toBeEnabled()
    expect(screen.getByLabelText(/telegram bot token/i)).toBeEnabled()
    expect(screen.getByLabelText(/default speed limit/i)).toBeEnabled()
    expect(screen.getByLabelText(/welcome message \(en\)/i)).toBeEnabled()
    expect(screen.getByLabelText(/welcome message \(ru\)/i)).toBeEnabled()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeEnabled()
  })

  it('also leaves the fields editable while the bot is enabled', async () => {
    vi.mocked(getBotSettings).mockResolvedValue({
      ...baseSettings,
      botEnabled: true,
      botRunning: true
    })
    render(<TelegramBot />)

    expect(await screen.findByLabelText(/service name/i)).toBeEnabled()
    expect(screen.getByLabelText(/telegram bot token/i)).toBeEnabled()
    expect(screen.getByLabelText(/default speed limit/i)).toBeEnabled()
    expect(screen.getByLabelText(/welcome message \(en\)/i)).toBeEnabled()
    expect(screen.getByLabelText(/welcome message \(ru\)/i)).toBeEnabled()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeEnabled()
    expect(screen.getByRole('switch')).toBeEnabled()
  })
})

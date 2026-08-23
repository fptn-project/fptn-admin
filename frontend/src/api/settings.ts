import { apiRequest } from './client'

export interface BotSettings {
  telegramToken: string
  botEnabled: boolean
  botRunning: boolean
  maxUserSpeedLimit: number
  serviceName: string
  welcomeMessageEn: string
  welcomeMessageRu: string
}

export interface BotSettingsUpdatePayload {
  telegramToken?: string
  maxUserSpeedLimit?: number
  serviceName?: string
  welcomeMessageEn?: string
  welcomeMessageRu?: string
}

export const getBotSettings = async (): Promise<BotSettings> =>
  apiRequest<BotSettings>('/settings')

export const updateBotSettings = async (
  payload: BotSettingsUpdatePayload
): Promise<BotSettings> =>
  apiRequest<BotSettings>('/settings', { method: 'PUT', body: payload })

export const updateBotEnabled = async (
  enabled: boolean
): Promise<BotSettings> =>
  apiRequest<BotSettings>('/settings/bot-enabled', {
    method: 'PUT',
    body: { enabled }
  })

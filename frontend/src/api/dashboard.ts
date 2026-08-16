import { apiRequest } from './client'

export interface Highlights {
  totalUsers: number
  premiumUsers: number
  blockedUsers: number
}

export const getHighlights = async (): Promise<Highlights> =>
  apiRequest<Highlights>('/dashboard/highlights')

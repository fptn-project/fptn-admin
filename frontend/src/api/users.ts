import { apiRequest } from './client'

export interface VpnUser {
  username: string
  blocked: boolean
  premiumAccess: boolean
  maxSpeed: number
}

export type UserFilter = 'all' | 'blocked' | 'premium'

export interface ListUsersParams {
  page: number
  pageSize: number
  search?: string
  filter?: UserFilter
}

export interface UsersPage {
  users: VpnUser[]
  total: number
}

export const getUser = async (username: string): Promise<VpnUser> =>
  apiRequest<VpnUser>(`/users/${encodeURIComponent(username)}`)

export const listUsers = async ({
  page,
  pageSize,
  search,
  filter = 'all'
}: ListUsersParams): Promise<UsersPage> => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    filter
  })
  if (search) params.set('search', search)

  return apiRequest<UsersPage>(`/users?${params.toString()}`)
}

export interface UserUpdatePayload {
  username?: string
  maxSpeed?: number
  blocked?: boolean
  premiumAccess?: boolean
}

export const updateUser = async (
  username: string,
  patch: UserUpdatePayload
): Promise<VpnUser> =>
  apiRequest<VpnUser>(`/users/${encodeURIComponent(username)}`, {
    method: 'PUT',
    body: patch
  })

export interface UserCreatePayload {
  username: string
  maxSpeed: number
  premiumAccess: boolean
}

export interface UserCreated extends VpnUser {
  token: string
}

export const createUser = async (
  payload: UserCreatePayload
): Promise<UserCreated> =>
  apiRequest<UserCreated>('/users', { method: 'POST', body: payload })

export interface UserToken {
  token: string
}

export const issueToken = async (username: string): Promise<UserToken> =>
  apiRequest<UserToken>(`/users/${encodeURIComponent(username)}/token`, {
    method: 'POST'
  })

import {
  apiRequest,
  clearToken,
  setMustChangePassword,
  setToken
} from './client'

export interface LoginResponse {
  access_token: string
  token_type: string
  mustChangePassword: boolean
}

export const login = async (
  username: string,
  password: string
): Promise<LoginResponse> => {
  const data = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { username, password },
    auth: false
  })
  setToken(data.access_token)
  setMustChangePassword(data.mustChangePassword)
  return data
}

export const logout = (): void => {
  clearToken()
  setMustChangePassword(false)
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export const changePassword = async (
  payload: ChangePasswordPayload
): Promise<void> => {
  await apiRequest<void>('/auth/change-password', {
    method: 'POST',
    body: payload
  })
  setMustChangePassword(false)
}

export interface AdminProfile {
  username: string
}

export const getCurrentAdmin = async (): Promise<AdminProfile> =>
  apiRequest<AdminProfile>('/auth/me')

export interface ProfileUpdatePayload {
  currentPassword: string
  newUsername?: string
  newPassword?: string
}

export const updateProfile = async (
  payload: ProfileUpdatePayload
): Promise<LoginResponse> => {
  const data = await apiRequest<LoginResponse>('/auth/profile', {
    method: 'PUT',
    body: payload
  })
  setToken(data.access_token)
  setMustChangePassword(data.mustChangePassword)
  return data
}

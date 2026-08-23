import { apiRequest } from './client'

export interface Server {
  name: string
  host: string
  md5_fingerprint: string
  port: number
  ping: number
}

export interface ServersList {
  regular: Server[]
  premium: Server[]
  censoredZone: Server[]
}

export type ServerKind = 'regular' | 'premium' | 'censored'

export interface ServerCreatePayload {
  name: string
  host: string
  port?: number
  md5_fingerprint?: string
  kind: ServerKind
}

export interface ServerUpdatePayload {
  name?: string
  host?: string
  port?: number
  md5_fingerprint?: string
}

export const listServers = async (): Promise<ServersList> =>
  apiRequest<ServersList>('/servers')

export const createServer = async (
  payload: ServerCreatePayload
): Promise<Server> =>
  apiRequest<Server>('/servers', { method: 'POST', body: payload })

export const updateServer = async (
  kind: ServerKind,
  name: string,
  payload: ServerUpdatePayload
): Promise<Server> =>
  apiRequest<Server>(`/servers/${kind}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: payload
  })

export const deleteServer = async (
  kind: ServerKind,
  name: string
): Promise<void> =>
  apiRequest<void>(`/servers/${kind}/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  })

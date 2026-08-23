import brotliPromise from 'brotli-wasm'

const COMPRESSED_PREFIX = 'fptnb:'
const PLAIN_PREFIX = 'fptn:'

let brotli: Awaited<typeof brotliPromise> | null = null

const getBrotli = async (): Promise<Awaited<typeof brotliPromise>> => {
  if (!brotli) {
    brotli = await brotliPromise
  }
  return brotli
}

const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const padBase64 = (value: string): string => {
  const paddingNeeded = (4 - (value.length % 4)) % 4
  return value + '='.repeat(paddingNeeded)
}

const extractUsername = (payload: unknown): string | null => {
  if (typeof payload !== 'object' || payload === null) return null
  const username = (payload as Record<string, unknown>).username
  return typeof username === 'string' ? username : null
}

export interface DecodedFptnToken {
  username: string | null
  payload: unknown
}

export const decodeFptnToken = async (
  rawToken: string
): Promise<DecodedFptnToken> => {
  const trimmed = rawToken.trim()

  let stripped: string
  let compressed: boolean
  if (trimmed.startsWith(COMPRESSED_PREFIX)) {
    stripped = trimmed.slice(COMPRESSED_PREFIX.length)
    compressed = true
  } else if (trimmed.startsWith(PLAIN_PREFIX)) {
    stripped = trimmed.slice(PLAIN_PREFIX.length)
    compressed = false
  } else {
    throw new Error('Unrecognized token format')
  }

  if (!stripped) throw new Error('Empty token')

  const bytes = base64ToBytes(padBase64(stripped))
  const decodedBytes = compressed
    ? (await getBrotli()).decompress(bytes)
    : bytes
  const text = new TextDecoder().decode(decodedBytes)

  let payload: unknown = text
  try {
    payload = JSON.parse(text)
  } catch {
    payload = text
  }

  return { username: extractUsername(payload), payload }
}

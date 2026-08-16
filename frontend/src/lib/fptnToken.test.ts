import { describe, expect, it, vi } from 'vitest'

// The real brotli-wasm package loads a .wasm binary via fetch(), which
// doesn't work under Node/Vitest. Stand in a fake (de)compressor that
// prepends/strips a marker byte, so the test still proves decodeFptnToken
// routes fptnb: tokens through compress/decompress rather than the plain
// path, without depending on brotli-wasm's browser-only loader.
vi.mock('brotli-wasm', () => ({
  default: Promise.resolve({
    compress: (buf: Uint8Array) => new Uint8Array([0xff, ...buf]),
    decompress: (buf: Uint8Array) => {
      if (buf[0] !== 0xff) throw new Error('not compressed')
      return buf.slice(1)
    }
  })
}))

const { decodeFptnToken } = await import('./fptnToken')
const brotliPromise = (await import('brotli-wasm')).default

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/=+$/, '')
}

const encodePlain = (payload: unknown): string =>
  `fptn:${bytesToBase64(new TextEncoder().encode(JSON.stringify(payload)))}`

const encodeCompressed = async (payload: unknown): Promise<string> => {
  const brotli = await brotliPromise
  const compressed = brotli.compress(
    new TextEncoder().encode(JSON.stringify(payload))
  )
  return `fptnb:${bytesToBase64(compressed)}`
}

describe('decodeFptnToken', () => {
  it('decodes a plain fptn: token and extracts the username', async () => {
    const token = encodePlain({
      username: 'alice',
      password: 'secret',
      version: 1
    })

    const result = await decodeFptnToken(token)

    expect(result.username).toBe('alice')
    expect(result.payload).toEqual({
      username: 'alice',
      password: 'secret',
      version: 1
    })
  })

  it('decodes a brotli-compressed fptnb: token', async () => {
    const token = await encodeCompressed({
      username: 'bob',
      servers: [{ name: 'S1', host: '1.2.3.4' }]
    })

    const result = await decodeFptnToken(token)

    expect(result.username).toBe('bob')
    expect(result.payload).toMatchObject({ username: 'bob' })
  })

  it('trims surrounding whitespace before decoding', async () => {
    const token = encodePlain({ username: 'carol' })

    const result = await decodeFptnToken(`  ${token}  \n`)

    expect(result.username).toBe('carol')
  })

  it('tolerates base64 without padding, same as the backend emits', async () => {
    const raw = btoa(JSON.stringify({ username: 'dave' })).replace(/=+$/, '')
    expect(raw.endsWith('=')).toBe(false)

    const result = await decodeFptnToken(`fptn:${raw}`)

    expect(result.username).toBe('dave')
  })

  it('returns a null username when the payload has none', async () => {
    const result = await decodeFptnToken(encodePlain({ foo: 'bar' }))

    expect(result.username).toBeNull()
  })

  it('falls back to the raw text when the payload is not JSON', async () => {
    const token = `fptn:${bytesToBase64(new TextEncoder().encode('not json'))}`

    const result = await decodeFptnToken(token)

    expect(result.username).toBeNull()
    expect(result.payload).toBe('not json')
  })

  it('rejects an unrecognized prefix', async () => {
    await expect(decodeFptnToken('nope:abc')).rejects.toThrow(
      'Unrecognized token format'
    )
  })

  it('rejects an empty token body', async () => {
    await expect(decodeFptnToken('fptn:')).rejects.toThrow('Empty token')
  })
})

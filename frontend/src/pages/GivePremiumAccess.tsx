import React, { ReactElement, useState } from 'react'
import { AlertCircle, Sparkles } from 'lucide-react'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { decodeFptnToken } from '../lib/fptnToken'
import { ApiError } from '../api/client'
import { getUser, updateUser } from '../api/users'

interface TokenResult {
  token: string
  username: string | null
  error: string | null
  notFound: boolean
  premiumAccess: boolean
  granting: boolean
}

const GivePremiumAccess = (): ReactElement => {
  const [value, setValue] = useState('')
  const [results, setResults] = useState<TokenResult[] | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  const handleChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ): void => {
    setValue(event.target.value)
    setResults(null)
  }

  const handleApply = async (): Promise<void> => {
    const tokens = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    setIsApplying(true)
    const decoded = await Promise.all(
      tokens.map(async (token): Promise<TokenResult> => {
        let username: string | null = null
        try {
          const decoded = await decodeFptnToken(token)
          username = decoded.username
        } catch {
          return {
            token,
            username: null,
            error: 'Could not decode token',
            notFound: false,
            premiumAccess: false,
            granting: false
          }
        }

        if (!username) {
          return {
            token,
            username: null,
            error: 'No username found in token',
            notFound: false,
            premiumAccess: false,
            granting: false
          }
        }

        try {
          const user = await getUser(username)
          return {
            token,
            username,
            error: null,
            notFound: false,
            premiumAccess: user.premiumAccess,
            granting: false
          }
        } catch (err) {
          const notFound = err instanceof ApiError && err.status === 404
          return {
            token,
            username,
            error: notFound
              ? 'User not found'
              : err instanceof ApiError
              ? err.message
              : 'Failed to check user',
            notFound,
            premiumAccess: false,
            granting: false
          }
        }
      })
    )
    setResults(decoded)
    setIsApplying(false)
  }

  const grantPremiumAccess = async (username: string): Promise<void> => {
    setResults(
      (prev) =>
        prev?.map((r) =>
          r.username === username ? { ...r, granting: true } : r
        ) ?? null
    )
    try {
      const updated = await updateUser(username, { premiumAccess: true })
      setResults(
        (prev) =>
          prev?.map((r) =>
            r.username === username
              ? { ...r, premiumAccess: updated.premiumAccess, granting: false }
              : r
          ) ?? null
      )
    } catch (err) {
      setResults(
        (prev) =>
          prev?.map((r) =>
            r.username === username
              ? {
                  ...r,
                  granting: false,
                  error:
                    err instanceof ApiError
                      ? err.message
                      : 'Failed to grant premium access'
                }
              : r
          ) ?? null
      )
    }
  }

  const validCount = results?.filter((r) => r.username && !r.error).length ?? 0

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Give premium access
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste tokens, one per line. Valid tokens are decoded to a username,
          ready to grant premium access.
        </p>
      </div>

      <textarea
        value={value}
        onChange={handleChange}
        rows={16}
        placeholder="fptnb:H1QPAKyLN4ap..."
        className="w-full resize-y rounded-lg border border-border bg-card p-4 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleApply} disabled={!value.trim() || isApplying}>
          {isApplying && <Spinner className="h-4 w-4" />}
          Apply
        </Button>
        {results && (
          <span className="text-sm text-muted-foreground">
            {validCount} of {results.length} token
            {results.length === 1 ? '' : 's'} valid
          </span>
        )}
      </div>

      {results && results.length > 0 && (
        <ul className="mt-4 space-y-2">
          {results.map((result, index) => {
            if (!result.username) {
              return (
                <li
                  key={`${result.token}-${index}`}
                  className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-sm"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                  <div className="min-w-0">
                    <p className="text-destructive">{result.error}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {result.token}
                    </p>
                  </div>
                </li>
              )
            }

            const username = result.username

            return (
              <li
                key={`${result.token}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm"
              >
                <span className="text-foreground">
                  Username: <span className="font-medium">{username}</span>
                </span>
                {result.notFound ? (
                  <span className="text-xs text-destructive">
                    User not found
                  </span>
                ) : result.error ? (
                  <span className="text-xs text-destructive">
                    {result.error}
                  </span>
                ) : result.premiumAccess ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    Premium granted
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => void grantPremiumAccess(username)}
                    disabled={result.granting}
                  >
                    {result.granting ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Give premium access
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default GivePremiumAccess

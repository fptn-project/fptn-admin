import React, { ReactElement, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../api/client'
import { getCurrentAdmin, updateProfile } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

const ProfileSettings = (): ReactElement => {
  const { t } = useTranslation()
  const { refreshProfile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [originalUsername, setOriginalUsername] = useState('')
  const [username, setUsername] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getCurrentAdmin()
      .then((profile) => {
        if (cancelled) return
        setOriginalUsername(profile.username)
        setUsername(profile.username)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(
          err instanceof ApiError ? err.message : t('profile.loadError')
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    setFormError(null)
    setSuccess(false)

    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      setFormError(t('profile.usernameRequired'))
      return
    }
    if (newPassword && newPassword !== confirmPassword) {
      setFormError(t('profile.passwordsMismatch'))
      return
    }

    const usernameChanged = trimmedUsername !== originalUsername
    if (!usernameChanged && !newPassword) {
      setFormError(t('profile.nothingToChange'))
      return
    }

    setSubmitting(true)
    try {
      await updateProfile({
        currentPassword,
        newUsername: usernameChanged ? trimmedUsername : undefined,
        newPassword: newPassword || undefined
      })
      await refreshProfile()
      setOriginalUsername(trimmedUsername)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess(true)
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : t('profile.updateError')
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          {t('profile.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('profile.subtitle')}
        </p>
      </div>

      {loadError && (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="max-w-md space-y-4 rounded-xl border border-border bg-card p-6"
        >
          <div>
            <label
              htmlFor="profile-username"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('profile.username')}
            </label>
            <input
              id="profile-username"
              type="text"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="profile-current-password"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('profile.currentPassword')}
            </label>
            <input
              id="profile-current-password"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('profile.currentPasswordHint')}
            </p>
          </div>

          <div>
            <label
              htmlFor="profile-new-password"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('profile.newPassword')}
            </label>
            <input
              id="profile-new-password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={t('profile.newPasswordPlaceholder')}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {newPassword && (
            <div>
              <label
                htmlFor="profile-confirm-password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                {t('profile.confirmPassword')}
              </label>
              <input
                id="profile-confirm-password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}

          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}

          {success && (
            <p className="text-sm text-success" role="status">
              {t('profile.success')}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner className="h-4 w-4" />}
              {submitting ? t('profile.submitting') : t('profile.submit')}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default ProfileSettings

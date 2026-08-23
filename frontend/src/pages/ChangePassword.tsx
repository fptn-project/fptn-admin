import React, { ReactElement, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../api/client'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { useAuth } from '../context/AuthContext'

const ChangePassword = (): ReactElement => {
  const { t } = useTranslation()
  const { mustChangePassword, changePassword } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!mustChangePassword) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError(t('changePassword.passwordsMismatch'))
      return
    }

    setIsSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.genericError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 dark:bg-background">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            F
          </span>
          <h1 className="text-xl font-bold text-foreground">
            {t('changePassword.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('changePassword.subtitle')}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="currentPassword"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('changePassword.currentPassword')}
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('changePassword.newPassword')}
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={t('changePassword.newPasswordPlaceholder')}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('changePassword.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full justify-center"
            disabled={isSubmitting}
          >
            {isSubmitting && <Spinner className="h-4 w-4" />}
            {isSubmitting
              ? t('changePassword.submitting')
              : t('changePassword.submit')}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default ChangePassword

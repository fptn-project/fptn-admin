import React, { ReactElement, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { ApiError } from '../api/client'
import {
  BotSettings,
  getBotSettings,
  updateBotEnabled,
  updateBotSettings
} from '../api/settings'

const inputClass =
  'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const labelClass = 'mb-1.5 block text-sm font-medium text-foreground'

const Toggle = ({
  checked,
  onChange,
  disabled
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}): ReactElement => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${
      checked ? 'bg-primary' : 'bg-muted'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
)

const emptyForm = {
  serviceName: '',
  maxUserSpeedLimit: '0',
  welcomeMessageEn: '',
  welcomeMessageRu: ''
}

const TelegramBot = (): ReactElement => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [maskedToken, setMaskedToken] = useState('')
  const [botRunning, setBotRunning] = useState(false)
  const [botEnabled, setBotEnabled] = useState(false)
  const [togglePending, setTogglePending] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [tokenInput, setTokenInput] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const applyStatus = (data: BotSettings): void => {
    setMaskedToken(data.telegramToken)
    setBotRunning(data.botRunning)
    setBotEnabled(data.botEnabled)
  }

  useEffect(() => {
    let cancelled = false
    getBotSettings()
      .then((data) => {
        if (cancelled) return
        applyStatus(data)
        setForm({
          serviceName: data.serviceName,
          maxUserSpeedLimit: String(data.maxUserSpeedLimit),
          welcomeMessageEn: data.welcomeMessageEn,
          welcomeMessageRu: data.welcomeMessageRu
        })
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError ? err.message : t('telegramBot.loadError')
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleToggleBotEnabled = async (checked: boolean): Promise<void> => {
    setToggleError(null)
    setTogglePending(true)
    try {
      applyStatus(await updateBotEnabled(checked))
    } catch (err) {
      setToggleError(
        err instanceof ApiError ? err.message : t('telegramBot.toggleError')
      )
    } finally {
      setTogglePending(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    setSaveError(null)
    setSaved(false)

    const speed = Number(form.maxUserSpeedLimit)
    if (!Number.isInteger(speed) || speed < 0) {
      setSaveError(t('telegramBot.speedInvalid'))
      return
    }

    setSaving(true)
    try {
      const updated = await updateBotSettings({
        serviceName: form.serviceName.trim(),
        maxUserSpeedLimit: speed,
        welcomeMessageEn: form.welcomeMessageEn,
        welcomeMessageRu: form.welcomeMessageRu,
        ...(tokenInput.trim() ? { telegramToken: tokenInput.trim() } : {})
      })
      applyStatus(updated)
      setForm({
        serviceName: updated.serviceName,
        maxUserSpeedLimit: String(updated.maxUserSpeedLimit),
        welcomeMessageEn: updated.welcomeMessageEn,
        welcomeMessageRu: updated.welcomeMessageRu
      })
      setTokenInput('')
      setSaved(true)
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : t('telegramBot.saveError')
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('telegramBot.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('telegramBot.subtitle')}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
            botRunning
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              botRunning ? 'bg-success' : 'bg-muted-foreground'
            }`}
          />
          {botRunning
            ? t('telegramBot.statusRunning')
            : t('telegramBot.statusStopped')}
        </span>
      </div>

      {loadError && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {loadError}
        </p>
      )}

      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-foreground">
            {t('telegramBot.enabledLabel')}
          </p>
          <Toggle
            checked={botEnabled}
            disabled={togglePending}
            onChange={(checked) => void handleToggleBotEnabled(checked)}
          />
        </div>
        {toggleError && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {toggleError}
          </p>
        )}
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-6"
      >
        <div className="rounded-xl border border-border bg-card p-5">
          <label htmlFor="telegram-token" className={labelClass}>
            {t('telegramBot.tokenLabel')}
          </label>
          <input
            id="telegram-token"
            type="text"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder={t('telegramBot.tokenPlaceholder')}
            className={`${inputClass} font-mono`}
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {maskedToken
              ? t('telegramBot.tokenCurrentMasked', { token: maskedToken })
              : t('telegramBot.tokenCurrentEmpty')}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <label htmlFor="service-name" className={labelClass}>
              {t('telegramBot.serviceNameLabel')}
            </label>
            <input
              id="service-name"
              type="text"
              required
              value={form.serviceName}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  serviceName: event.target.value
                }))
              }
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="max-speed" className={labelClass}>
              {t('telegramBot.maxUserSpeedLimitLabel')}
            </label>
            <input
              id="max-speed"
              type="number"
              min={0}
              required
              value={form.maxUserSpeedLimit}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  maxUserSpeedLimit: event.target.value
                }))
              }
              className={inputClass}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <label htmlFor="welcome-en" className={labelClass}>
              {t('telegramBot.welcomeMessageEnLabel')}
            </label>
            <textarea
              id="welcome-en"
              rows={4}
              value={form.welcomeMessageEn}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  welcomeMessageEn: event.target.value
                }))
              }
              className={`${inputClass} resize-y`}
            />
          </div>

          <div>
            <label htmlFor="welcome-ru" className={labelClass}>
              {t('telegramBot.welcomeMessageRuLabel')}
            </label>
            <textarea
              id="welcome-ru"
              rows={4}
              value={form.welcomeMessageRu}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  welcomeMessageRu: event.target.value
                }))
              }
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>

        {saveError && (
          <p className="text-sm text-destructive" role="alert">
            {saveError}
          </p>
        )}
        {saved && !saveError && (
          <p className="text-sm text-success" role="status">
            {t('telegramBot.saveSuccess')}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? t('telegramBot.saving') : t('telegramBot.save')}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default TelegramBot

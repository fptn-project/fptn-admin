import React, { ReactElement, useEffect, useState } from 'react'
import { Bot, Crown, Users, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../api/client'
import { getHighlights } from '../api/dashboard'
import { getBotSettings } from '../api/settings'
import Spinner from '../components/ui/Spinner'

interface HighlightData {
  totalUsers: number
  premiumUsers: number
  telegramBotEnabled: boolean
}

const Dashboard = (): ReactElement => {
  const { t } = useTranslation()
  const [data, setData] = useState<HighlightData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([getHighlights(), getBotSettings()])
      .then(([highlights, botSettings]) => {
        if (cancelled) return
        setData({
          totalUsers: highlights.totalUsers,
          premiumUsers: highlights.premiumUsers,
          telegramBotEnabled: botSettings.botEnabled
        })
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof ApiError ? err.message : t('dashboard.loadError')
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const highlights: {
    key: string
    label: string
    value?: string
    indicator?: boolean
    icon: LucideIcon
  }[] = data
    ? [
        {
          key: 'totalUsers',
          label: t('dashboard.totalUsers'),
          value: data.totalUsers.toLocaleString(),
          icon: Users
        },
        {
          key: 'premiumUsers',
          label: t('dashboard.premiumUsers'),
          value: data.premiumUsers.toLocaleString(),
          icon: Crown
        },
        {
          key: 'telegramBot',
          label: t('dashboard.telegramBot'),
          indicator: data.telegramBotEnabled,
          icon: Bot
        }
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t('dashboard.title')}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2"></div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((highlight) => (
            <div
              key={highlight.key}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <highlight.icon className="h-5 w-5 text-foreground" />
                </span>
              </div>
              {highlight.indicator === undefined ? (
                <p className="text-2xl font-semibold text-foreground">
                  {highlight.value}
                </p>
              ) : (
                <div className="flex h-8 items-center gap-2">
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full ${
                      highlight.indicator ? 'bg-success' : 'bg-muted-foreground'
                    }`}
                  />
                  <p className="text-2xl font-semibold text-foreground">
                    {highlight.indicator
                      ? t('dashboard.telegramBotEnabled')
                      : t('dashboard.telegramBotDisabled')}
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">{highlight.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard

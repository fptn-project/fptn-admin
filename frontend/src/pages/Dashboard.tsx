import React, { ReactElement, useEffect, useState } from 'react'
import { Crown, Users, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../api/client'
import { getHighlights } from '../api/dashboard'
import Spinner from '../components/ui/Spinner'

interface HighlightData {
  totalUsers: number
  premiumUsers: number
}

const Dashboard = (): ReactElement => {
  const { t } = useTranslation()
  const [data, setData] = useState<HighlightData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getHighlights()
      .then((result) => {
        if (cancelled) return
        setData({
          totalUsers: result.totalUsers,
          premiumUsers: result.premiumUsers
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
    value: string
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
              <p className="text-2xl font-semibold text-foreground">
                {highlight.value}
              </p>
              <p className="text-sm text-muted-foreground">{highlight.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard

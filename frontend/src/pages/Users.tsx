import React, { ReactElement, useEffect, useState } from 'react'
import {
  Ban,
  Check,
  Gauge,
  Pencil,
  Search,
  Sparkles,
  X,
  type LucideIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/Table'
import Pagination from '../components/ui/Pagination'
import Spinner from '../components/ui/Spinner'
import { ApiError } from '../api/client'
import { getHighlights } from '../api/dashboard'
import { listUsers, updateUser, VpnUser, UserFilter } from '../api/users'

const PAGE_SIZE = 20
const MIN_SPEED = 1
const MAX_SPEED = 300
const SEARCH_DEBOUNCE_MS = 300

const filterTabs: { id: UserFilter; labelKey: string }[] = [
  { id: 'all', labelKey: 'users.filterAll' },
  { id: 'blocked', labelKey: 'users.filterBlocked' },
  { id: 'premium', labelKey: 'users.filterPremium' }
]

const badgeTones = {
  premium:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-destructive/10 text-destructive',
  off: 'bg-muted text-muted-foreground'
}

const ToggleBadge = ({
  active,
  label,
  icon: Icon,
  tone,
  pending,
  onClick
}: {
  active: boolean
  label: string
  icon: LucideIcon
  tone: 'premium' | 'danger'
  pending?: boolean
  onClick?: () => void
}): ReactElement => (
  <button
    type="button"
    onClick={onClick}
    disabled={pending}
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-60 ${
      active ? badgeTones[tone] : badgeTones.off
    }`}
  >
    {pending ? (
      <Spinner className="h-3.5 w-3.5" />
    ) : (
      <Icon className="h-3.5 w-3.5" />
    )}
    {label}
  </button>
)

const Users = (): ReactElement => {
  const { t } = useTranslation()
  const [users, setUsers] = useState<VpnUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stats, setStats] = useState({ total: 0, blocked: 0, premium: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<UserFilter>('all')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const [pendingToggle, setPendingToggle] = useState<string | null>(null)

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    listUsers({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      filter: tab
    })
      .then((data) => {
        if (cancelled) return
        setUsers(data.users)
        setTotal(data.total)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : t('users.loadError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page, search, tab, t])

  const refreshStats = (): void => {
    getHighlights()
      .then((highlights) => {
        setStats({
          total: highlights.totalUsers,
          premium: highlights.premiumUsers,
          blocked: highlights.blockedUsers
        })
      })
      .catch(() => undefined)
      .finally(() => setStatsLoading(false))
  }

  useEffect(() => {
    refreshStats()
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageStart = (page - 1) * PAGE_SIZE

  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setSearchInput(event.target.value)
  }

  const handleTabChange = (nextTab: UserFilter): void => {
    setTab(nextTab)
    setPage(1)
  }

  const startEditingSpeed = (user: VpnUser): void => {
    setEditingId(user.username)
    setEditValue(String(user.maxSpeed))
  }

  const cancelEditingSpeed = (): void => {
    setEditingId(null)
    setEditValue('')
  }

  const saveEditingSpeed = async (username: string): Promise<void> => {
    const parsed = Math.round(Number(editValue))
    setEditingId(null)
    setEditValue('')
    if (Number.isNaN(parsed)) return

    const clamped = Math.min(MAX_SPEED, Math.max(MIN_SPEED, parsed))
    try {
      const updated = await updateUser(username, { maxSpeed: clamped })
      setUsers((prev) =>
        prev.map((user) => (user.username === username ? updated : user))
      )
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('users.updateSpeedError')
      )
    }
  }

  const toggleField = async (
    user: VpnUser,
    field: 'premiumAccess' | 'blocked'
  ): Promise<void> => {
    const key = `${user.username}:${field}`
    setPendingToggle(key)
    try {
      const patch =
        field === 'premiumAccess'
          ? { premiumAccess: !user.premiumAccess }
          : { blocked: !user.blocked }
      const updated = await updateUser(user.username, patch)
      setUsers((prev) =>
        prev.map((u) => (u.username === user.username ? updated : u))
      )
      refreshStats()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : field === 'premiumAccess'
          ? t('users.updatePremiumError')
          : t('users.updateBlockedError')
      )
    } finally {
      setPendingToggle(null)
    }
  }

  const statsList = [
    { label: t('users.statsTotal'), value: stats.total },
    { label: t('users.statsBlocked'), value: stats.blocked },
    { label: t('users.statsPremium'), value: stats.premium }
  ]

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('users.title')}
          </h1>
        </div>
        <div className="flex items-center gap-3"></div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statsList.map((stat, index) => (
          <div
            key={stat.label}
            className={`rounded-xl p-5 ${
              index === 0
                ? 'bg-primary/5 dark:bg-primary/10'
                : 'border border-border bg-card'
            }`}
          >
            <p className="mb-1 text-sm text-muted-foreground">{stat.label}</p>
            {statsLoading ? (
              <Spinner className="h-5 w-5 text-muted-foreground" />
            ) : (
              <span className="text-3xl font-bold text-foreground">
                {stat.value}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mb-4">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          {t('users.allUsers')}
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder={t('users.searchPlaceholder')}
                className="w-56 rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1 dark:bg-muted/30">
            {filterTabs.map((filterTab) => (
              <button
                key={filterTab.id}
                type="button"
                onClick={() => handleTabChange(filterTab.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === filterTab.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(filterTab.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[260px]">
              {t('users.colTelegramId')}
            </TableHead>
            <TableHead className="w-[170px]">
              {t('users.colPremiumAccess')}
            </TableHead>
            <TableHead className="w-[230px]">
              {t('users.colMaxSpeed')}
            </TableHead>
            <TableHead className="w-[140px]">{t('users.colBlocked')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={4} className="py-10">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="h-4 w-4" />
                  {t('users.loading')}
                </div>
              </TableCell>
            </TableRow>
          )}
          {!loading && users.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {search
                  ? t('users.noMatchSearch', { search })
                  : t('users.noMatchFilter')}
              </TableCell>
            </TableRow>
          )}
          {!loading &&
            users.map((user) => (
              <TableRow key={user.username}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {user.username}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <ToggleBadge
                    active={user.premiumAccess}
                    label={
                      user.premiumAccess ? t('users.premium') : t('users.no')
                    }
                    icon={user.premiumAccess ? Sparkles : X}
                    tone="premium"
                    pending={pendingToggle === `${user.username}:premiumAccess`}
                    onClick={() => void toggleField(user, 'premiumAccess')}
                  />
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  {editingId === user.username ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={MIN_SPEED}
                        max={MAX_SPEED}
                        autoFocus
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            void saveEditingSpeed(user.username)
                          }
                          if (event.key === 'Escape') cancelEditingSpeed()
                        }}
                        className="w-16 rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <span className="text-sm text-muted-foreground">
                        {t('users.mbps')}
                      </span>
                      <button
                        type="button"
                        onClick={() => void saveEditingSpeed(user.username)}
                        aria-label={t('users.saveMaxSpeed')}
                        className="rounded-md p-1 text-success transition-colors hover:bg-muted"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditingSpeed}
                        aria-label={t('users.cancelEditing')}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      {user.maxSpeed}{' '}
                      <span className="text-muted-foreground">
                        {t('users.mbps')}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditingSpeed(user)}
                        aria-label={t('users.editMaxSpeed')}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </TableCell>

                <TableCell>
                  <ToggleBadge
                    active={user.blocked}
                    label={
                      user.blocked ? t('users.blocked') : t('users.notBlocked')
                    }
                    icon={user.blocked ? Ban : X}
                    tone="danger"
                    pending={pendingToggle === `${user.username}:blocked`}
                    onClick={() => void toggleField(user, 'blocked')}
                  />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? t('users.showingZero')
            : t('users.showingRange', {
                from: pageStart + 1,
                to: Math.min(pageStart + PAGE_SIZE, total),
                total
              })}
        </p>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}

export default Users

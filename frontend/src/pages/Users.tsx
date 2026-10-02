import React, { ReactElement, useEffect, useState } from 'react'
import {
  Ban,
  Check,
  Gauge,
  KeyRound,
  Pencil,
  Plus,
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
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Pagination from '../components/ui/Pagination'
import Spinner from '../components/ui/Spinner'
import { ApiError } from '../api/client'
import { getHighlights } from '../api/dashboard'
import {
  createUser,
  issueToken,
  listUsers,
  updateUser,
  VpnUser,
  UserFilter
} from '../api/users'

const PAGE_SIZE = 20
const MIN_SPEED = 1
const MAX_SPEED = 300
const DEFAULT_NEW_USER_SPEED = 20
const SEARCH_DEBOUNCE_MS = 300
const USERNAME_REGEX = /^[a-zA-Z0-9]+$/

const emptyCreateForm = {
  username: '',
  maxSpeed: String(DEFAULT_NEW_USER_SPEED),
  premiumAccess: false
}

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
  const [reloadToken, setReloadToken] = useState(0)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [createFormError, setCreateFormError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)

  const [issueTarget, setIssueTarget] = useState<VpnUser | null>(null)
  const [issuedToken, setIssuedToken] = useState<string | null>(null)
  const [issuedTokenCopied, setIssuedTokenCopied] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [issueError, setIssueError] = useState<string | null>(null)

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
  }, [page, search, tab, t, reloadToken])

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

  const openCreateModal = (): void => {
    setCreateForm(emptyCreateForm)
    setCreateFormError(null)
    setCreatedToken(null)
    setTokenCopied(false)
    setCreateModalOpen(true)
  }

  const closeCreateModal = (): void => {
    if (creating) return
    setCreateModalOpen(false)
    setCreatedToken(null)
    setTokenCopied(false)
  }

  const handleCopyToken = (): void => {
    if (!createdToken) return
    void navigator.clipboard.writeText(createdToken)
    setTokenCopied(true)
  }

  const handleCreateUser = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault()
    const username = createForm.username.trim()
    if (!username) {
      setCreateFormError(t('users.usernameRequired'))
      return
    }
    if (!USERNAME_REGEX.test(username)) {
      setCreateFormError(t('users.usernameInvalid'))
      return
    }

    const maxSpeed = Math.round(Number(createForm.maxSpeed))
    if (!Number.isFinite(maxSpeed) || maxSpeed < MIN_SPEED) {
      setCreateFormError(t('users.speedInvalid'))
      return
    }

    setCreating(true)
    setCreateFormError(null)
    try {
      const created = await createUser({
        username,
        maxSpeed,
        premiumAccess: createForm.premiumAccess
      })
      setCreatedToken(created.token)
      setReloadToken((prev) => prev + 1)
      refreshStats()
    } catch (err) {
      setCreateFormError(
        err instanceof ApiError ? err.message : t('users.createError')
      )
    } finally {
      setCreating(false)
    }
  }

  const openIssueTokenModal = (user: VpnUser): void => {
    setIssueTarget(user)
    setIssuedToken(null)
    setIssuedTokenCopied(false)
    setIssueError(null)
  }

  const closeIssueTokenModal = (): void => {
    if (issuing) return
    setIssueTarget(null)
    setIssuedToken(null)
    setIssuedTokenCopied(false)
    setIssueError(null)
  }

  const handleCopyIssuedToken = (): void => {
    if (!issuedToken) return
    void navigator.clipboard.writeText(issuedToken)
    setIssuedTokenCopied(true)
  }

  const handleIssueToken = async (): Promise<void> => {
    if (!issueTarget) return
    setIssuing(true)
    setIssueError(null)
    try {
      const result = await issueToken(issueTarget.username)
      setIssuedToken(result.token)
    } catch (err) {
      setIssueError(
        err instanceof ApiError ? err.message : t('users.issueTokenError')
      )
    } finally {
      setIssuing(false)
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
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          {t('users.addUser')}
        </Button>
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
            <TableHead className="w-[150px]">
              {t('users.colIssueToken')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={5} className="py-10">
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
                colSpan={5}
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

                <TableCell>
                  <button
                    type="button"
                    onClick={() => openIssueTokenModal(user)}
                    aria-label={t('users.issueTokenFor', {
                      name: user.username
                    })}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <KeyRound className="h-4 w-4" />
                    {t('users.issueToken')}
                  </button>
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

      <Modal
        open={createModalOpen}
        onClose={closeCreateModal}
        title={t('users.addUser')}
      >
        <form
          onSubmit={(event) => void handleCreateUser(event)}
          className="mx-auto max-w-md space-y-4"
        >
          <div>
            <label
              htmlFor="user-username"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('users.fieldUsername')}
            </label>
            <input
              id="user-username"
              type="text"
              required
              autoFocus
              value={createForm.username}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  username: event.target.value
                }))
              }
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="user-max-speed"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('users.fieldMaxSpeed')}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="user-max-speed"
                type="number"
                min={MIN_SPEED}
                max={MAX_SPEED}
                required
                value={createForm.maxSpeed}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    maxSpeed: event.target.value
                  }))
                }
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-sm text-muted-foreground">
                {t('users.mbps')}
              </span>
            </div>
          </div>

          <label
            htmlFor="user-premium-access"
            className="flex cursor-pointer items-center gap-2"
          >
            <input
              id="user-premium-access"
              type="checkbox"
              checked={createForm.premiumAccess}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  premiumAccess: event.target.checked
                }))
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-sm font-medium text-foreground">
              {t('users.fieldPremiumAccess')}
            </span>
          </label>

          {createFormError && (
            <p className="text-sm text-destructive" role="alert">
              {createFormError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeCreateModal}
              disabled={creating}
            >
              {createdToken ? t('users.done') : t('users.cancel')}
            </Button>
            <Button type="submit" disabled={creating || createdToken !== null}>
              {creating && <Spinner className="h-4 w-4" />}
              {t('users.addUser')}
            </Button>
          </div>

          {createdToken && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">
                {t('users.tokenReadyTitle')}
              </p>
              <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
                {t('users.tokenReadyHint')}
              </p>
              <div className="flex items-start gap-2">
                <code className="flex-1 break-all rounded-md bg-card px-2 py-1.5 font-mono text-xs text-foreground">
                  {createdToken}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyToken}
                >
                  {tokenCopied ? t('users.copied') : t('users.copyToken')}
                </Button>
              </div>
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={issueTarget !== null}
        onClose={closeIssueTokenModal}
        title={t('users.issueTokenConfirmTitle')}
      >
        <div className="mx-auto max-w-md space-y-4">
          {!issuedToken && (
            <p className="text-sm text-muted-foreground">
              {t('users.issueTokenWarning', {
                name: issueTarget?.username ?? ''
              })}
            </p>
          )}

          {issueError && (
            <p className="text-sm text-destructive" role="alert">
              {issueError}
            </p>
          )}

          {issuedToken && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">
                {t('users.tokenReadyTitle')}
              </p>
              <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
                {t('users.tokenReadyHint')}
              </p>
              <div className="flex items-start gap-2">
                <code className="flex-1 break-all rounded-md bg-card px-2 py-1.5 font-mono text-xs text-foreground">
                  {issuedToken}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyIssuedToken}
                >
                  {issuedTokenCopied ? t('users.copied') : t('users.copyToken')}
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeIssueTokenModal}
              disabled={issuing}
            >
              {issuedToken ? t('users.done') : t('users.cancel')}
            </Button>
            {!issuedToken && (
              <Button
                type="button"
                onClick={() => void handleIssueToken()}
                disabled={issuing}
              >
                {issuing && <Spinner className="h-4 w-4" />}
                {t('users.issue')}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Users

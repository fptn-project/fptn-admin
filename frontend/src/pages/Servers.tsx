import React, { ReactElement, useEffect, useState } from 'react'
import {
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Radar,
  Trash2
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
import Spinner from '../components/ui/Spinner'
import { ApiError } from '../api/client'
import {
  createServer,
  deleteServer,
  listServers,
  updateServer,
  Server,
  ServerKind
} from '../api/servers'

type ServerRowKind = 'regular' | 'premium' | 'censoredZone'

interface ServerRow extends Server {
  kind: ServerRowKind
}

const rowKind: Record<ServerKind, ServerRowKind> = {
  regular: 'regular',
  premium: 'premium',
  censored: 'censoredZone'
}

const deleteKind: Record<ServerRowKind, ServerKind> = {
  regular: 'regular',
  premium: 'premium',
  censoredZone: 'censored'
}

const emptyForm = {
  name: '',
  host: '',
  port: '443',
  md5_fingerprint: '',
  kind: 'regular' as ServerKind
}

const emptyEditForm = {
  name: '',
  host: '',
  port: '443',
  md5_fingerprint: ''
}

const IPV4_REGEX =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

// Some keyboard layouts type "," where an IPv4 address needs ".".
const normalizeHost = (value: string): string => value.replace(/,/g, '.')

type KindFilter = ServerRowKind | 'all'

const kindFilterTabs: { id: KindFilter; labelKey: string }[] = [
  { id: 'all', labelKey: 'servers.filterAll' },
  { id: 'regular', labelKey: 'servers.kindRegular' },
  { id: 'premium', labelKey: 'servers.kindPremium' },
  { id: 'censoredZone', labelKey: 'servers.kindCensored' }
]

const kindConfig: Record<
  ServerRowKind,
  { labelKey: string; className: string }
> = {
  regular: {
    labelKey: 'servers.kindRegular',
    className: 'bg-muted text-muted-foreground'
  },
  premium: {
    labelKey: 'servers.kindPremium',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  },
  censoredZone: {
    labelKey: 'servers.kindCensored',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
  }
}

const KindBadge = ({ kind }: { kind: ServerRowKind }): ReactElement => {
  const { t } = useTranslation()
  const { labelKey, className } = kindConfig[kind]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {t(labelKey)}
    </span>
  )
}

const PingBadge = ({ ping }: { ping: number }): ReactElement => {
  const className =
    ping >= 150
      ? 'text-destructive'
      : ping >= 80
      ? 'text-warning'
      : 'text-success'

  return <span className={`text-sm tabular-nums ${className}`}>{ping} ms</span>
}

const Servers = (): ReactElement => {
  const { t } = useTranslation()
  const [servers, setServers] = useState<ServerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [editTarget, setEditTarget] = useState<ServerRow | null>(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    listServers()
      .then((data) => {
        if (cancelled) return
        setServers([
          ...data.regular.map((s) => ({ ...s, kind: 'regular' as const })),
          ...data.premium.map((s) => ({ ...s, kind: 'premium' as const })),
          ...data.censoredZone.map((s) => ({
            ...s,
            kind: 'censoredZone' as const
          }))
        ])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : t('servers.loadError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleDelete = async (server: ServerRow): Promise<void> => {
    const key = `${server.kind}-${server.name}`
    setPendingDelete(key)
    try {
      await deleteServer(deleteKind[server.kind], server.name)
      setServers((prev) =>
        prev.filter((s) => !(s.kind === server.kind && s.name === server.name))
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('servers.deleteError'))
    } finally {
      setPendingDelete(null)
    }
  }

  const openModal = (): void => {
    setForm(emptyForm)
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = (): void => {
    if (submitting) return
    setModalOpen(false)
  }

  const handleCreate = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault()
    const name = form.name.trim()
    const host = form.host.trim()
    if (!name) {
      setFormError(t('servers.nameRequired'))
      return
    }
    if (!IPV4_REGEX.test(host)) {
      setFormError(t('servers.hostInvalid'))
      return
    }

    const port = Number(form.port)
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      setFormError(t('servers.portInvalid'))
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      const created = await createServer({
        name,
        host,
        port,
        md5_fingerprint: form.md5_fingerprint.trim() || undefined,
        kind: form.kind
      })
      setServers((prev) => [...prev, { ...created, kind: rowKind[form.kind] }])
      setModalOpen(false)
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : t('servers.createError')
      )
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (server: ServerRow): void => {
    setEditTarget(server)
    setEditForm({
      name: server.name,
      host: server.host,
      port: String(server.port),
      md5_fingerprint: server.md5_fingerprint
    })
    setEditFormError(null)
  }

  const closeEditModal = (): void => {
    if (editSubmitting) return
    setEditTarget(null)
  }

  const handleEditSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault()
    if (!editTarget) return

    const name = editForm.name.trim()
    const host = editForm.host.trim()
    if (!name) {
      setEditFormError(t('servers.nameRequired'))
      return
    }
    if (!IPV4_REGEX.test(host)) {
      setEditFormError(t('servers.hostInvalid'))
      return
    }

    const port = Number(editForm.port)
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      setEditFormError(t('servers.portInvalid'))
      return
    }

    setEditSubmitting(true)
    setEditFormError(null)
    try {
      const updated = await updateServer(
        deleteKind[editTarget.kind],
        editTarget.name,
        { name, host, port, md5_fingerprint: editForm.md5_fingerprint.trim() }
      )
      setServers((prev) =>
        prev.map((s) =>
          s.kind === editTarget.kind && s.name === editTarget.name
            ? { ...updated, kind: editTarget.kind }
            : s
        )
      )
      setEditTarget(null)
    } catch (err) {
      setEditFormError(
        err instanceof ApiError ? err.message : t('servers.updateError')
      )
    } finally {
      setEditSubmitting(false)
    }
  }

  const query = search.trim().toLowerCase()
  const filteredServers = servers.filter((server) => {
    const matchesKind = kindFilter === 'all' || server.kind === kindFilter
    const matchesSearch =
      !query ||
      server.name.toLowerCase().includes(query) ||
      server.host.toLowerCase().includes(query)
    return matchesKind && matchesSearch
  })

  const stats = [
    {
      label: t('servers.statsTotal'),
      value: servers.length,
      icon: Radar
    },
    {
      label: t('servers.statsPremium'),
      value: servers.filter((s) => s.kind === 'premium').length,
      icon: Sparkles
    },
    {
      label: t('servers.statsCensored'),
      value: servers.filter((s) => s.kind === 'censoredZone').length,
      icon: ShieldCheck
    }
  ]

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('servers.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('servers.subtitle')}
          </p>
        </div>
        <Button onClick={openModal}>
          <Plus className="h-4 w-4" />
          {t('servers.addServer')}
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`rounded-xl p-5 ${
              index === 0
                ? 'bg-primary/5 dark:bg-primary/10'
                : 'border border-border bg-card'
            }`}
          >
            <p className="mb-1 text-sm text-muted-foreground">{stat.label}</p>
            {loading ? (
              <Spinner className="h-5 w-5 text-muted-foreground" />
            ) : (
              <span className="text-3xl font-bold text-foreground">
                {stat.value.toLocaleString()}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mb-4">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          {t('servers.allServers')}
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('servers.searchPlaceholder')}
                className="w-56 rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1 dark:bg-muted/30">
            {kindFilterTabs.map((filterTab) => (
              <button
                key={filterTab.id}
                type="button"
                onClick={() => setKindFilter(filterTab.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  kindFilter === filterTab.id
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('servers.colServer')}</TableHead>
            <TableHead>{t('servers.colKind')}</TableHead>
            <TableHead>{t('servers.colHost')}</TableHead>
            <TableHead>{t('servers.colPort')}</TableHead>
            <TableHead>{t('servers.colPing')}</TableHead>
            <TableHead>{t('servers.colFingerprint')}</TableHead>
            <TableHead>{t('servers.colActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={7} className="py-10">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="h-4 w-4" />
                  {t('servers.loading')}
                </div>
              </TableCell>
            </TableRow>
          )}
          {!loading && servers.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {t('servers.noServers')}
              </TableCell>
            </TableRow>
          )}
          {!loading && servers.length > 0 && filteredServers.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                {search
                  ? t('servers.noMatchSearch', { search })
                  : t('servers.noMatchFilter')}
              </TableCell>
            </TableRow>
          )}
          {!loading &&
            filteredServers.map((server) => (
              <TableRow key={`${server.kind}-${server.name}`}>
                <TableCell>
                  <span className="font-mono text-sm font-medium text-foreground">
                    {server.name}
                  </span>
                </TableCell>
                <TableCell>
                  <KindBadge kind={server.kind} />
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-muted-foreground">
                    {server.host}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-foreground">{server.port}</span>
                </TableCell>
                <TableCell>
                  <PingBadge ping={server.ping} />
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {server.md5_fingerprint || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(server)}
                      aria-label={t('servers.editServer', {
                        name: server.name
                      })}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(server)}
                      disabled={
                        pendingDelete === `${server.kind}-${server.name}`
                      }
                      aria-label={t('servers.deleteServer', {
                        name: server.name
                      })}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-wait disabled:opacity-60"
                    >
                      {pendingDelete === `${server.kind}-${server.name}` ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={t('servers.addServer')}
      >
        <form
          onSubmit={(event) => void handleCreate(event)}
          className="mx-auto max-w-md space-y-4"
        >
          <div>
            <label
              htmlFor="server-name"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('servers.fieldName')}
            </label>
            <input
              id="server-name"
              type="text"
              required
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="server-host"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('servers.fieldHost')}
            </label>
            <input
              id="server-host"
              type="text"
              required
              value={form.host}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  host: normalizeHost(event.target.value)
                }))
              }
              onBlur={(event) => {
                const value = event.target.value.trim()
                if (value && !IPV4_REGEX.test(value)) {
                  setFormError(t('servers.hostInvalid'))
                }
              }}
              placeholder="1.2.3.4"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="server-port"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('servers.fieldPort')}
            </label>
            <input
              id="server-port"
              type="number"
              min={1}
              max={65535}
              required
              value={form.port}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, port: event.target.value }))
              }
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="server-fingerprint"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('servers.fieldFingerprint')}
            </label>
            <input
              id="server-fingerprint"
              type="text"
              value={form.md5_fingerprint}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  md5_fingerprint: event.target.value
                }))
              }
              placeholder={t('servers.fieldFingerprintPlaceholder')}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm text-foreground placeholder:font-sans placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="server-kind"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('servers.fieldKind')}
            </label>
            <select
              id="server-kind"
              value={form.kind}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  kind: event.target.value as ServerKind
                }))
              }
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="regular">{t('servers.kindRegular')}</option>
              <option value="premium">{t('servers.kindPremium')}</option>
              <option value="censored">{t('servers.kindCensored')}</option>
            </select>
          </div>

          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeModal}
              disabled={submitting}
            >
              {t('servers.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner className="h-4 w-4" />}
              {t('servers.addServer')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editTarget !== null}
        onClose={closeEditModal}
        title={t('servers.editServerTitle')}
      >
        <form
          onSubmit={(event) => void handleEditSubmit(event)}
          className="mx-auto max-w-md space-y-4"
        >
          <div>
            <label
              htmlFor="edit-server-name"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('servers.fieldName')}
            </label>
            <input
              id="edit-server-name"
              type="text"
              required
              value={editForm.name}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="edit-server-host"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('servers.fieldHost')}
            </label>
            <input
              id="edit-server-host"
              type="text"
              required
              value={editForm.host}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  host: normalizeHost(event.target.value)
                }))
              }
              onBlur={(event) => {
                const value = event.target.value.trim()
                if (value && !IPV4_REGEX.test(value)) {
                  setEditFormError(t('servers.hostInvalid'))
                }
              }}
              placeholder="1.2.3.4"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="edit-server-port"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('servers.fieldPort')}
            </label>
            <input
              id="edit-server-port"
              type="number"
              min={1}
              max={65535}
              required
              value={editForm.port}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, port: event.target.value }))
              }
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="edit-server-fingerprint"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('servers.fieldFingerprint')}
            </label>
            <input
              id="edit-server-fingerprint"
              type="text"
              value={editForm.md5_fingerprint}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  md5_fingerprint: event.target.value
                }))
              }
              placeholder={t('servers.fieldFingerprintPlaceholder')}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm text-foreground placeholder:font-sans placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {editFormError && (
            <p className="text-sm text-destructive" role="alert">
              {editFormError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeEditModal}
              disabled={editSubmitting}
            >
              {t('servers.cancel')}
            </Button>
            <Button type="submit" disabled={editSubmitting}>
              {editSubmitting && <Spinner className="h-4 w-4" />}
              {t('servers.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Servers

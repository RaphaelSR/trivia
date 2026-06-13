/**
 * ImportLocalSessions
 *
 * Componente para listar sessões locais do navegador e importá-las para a
 * conta do usuário autenticado via importLocalSession().
 *
 * Regras:
 *  - Lê sessões dos dois repositórios locais (offline + online-cache).
 *  - Deduplica por id.
 *  - Para cada sessão mostra um botão "Importar" que abre um mini-form com
 *    os participantes e campos de e-mail opcionais.
 *  - Após importar com sucesso: feedback, recarrega lista de partidas e
 *    marca sessão como importada em memória (evita reimportar na mesma sessão).
 *  - Gateado por isSupabaseConfigured() — sem config, não renderiza nada.
 */

import { useState, useEffect, useCallback } from 'react'
import { Upload, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '../../../shared/services/supabase.client'
import { LocalSessionRepository } from '../../game/infrastructure/local-session.repository'
import { OnlineCacheSessionRepository } from '../../game/infrastructure/online-cache-session.repository'
import type { SessionRecord } from '../../game/infrastructure/session.repository'
import { importLocalSession, listNormalizedGames } from '../services/normalized-history.service'
import type { NormalizedGameSummary } from '../services/normalized-history.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDatePtBR(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function loadAllLocalRecords(): SessionRecord[] {
  const local = new LocalSessionRepository()
  const onlineCache = new OnlineCacheSessionRepository()

  const localHistory = local.loadSessionHistory()
  const onlineHistory = onlineCache.loadSessionHistory()
  const localActive = local.loadActiveSession()
  const onlineActive = onlineCache.loadActiveSession()

  const seen = new Set<string>()
  const records: SessionRecord[] = []

  const addRecord = (r: SessionRecord | null) => {
    if (!r || seen.has(r.metadata.id)) return
    seen.add(r.metadata.id)
    records.push(r)
  }

  // Inclui a sessão ativa primeiro (mais recente)
  addRecord(localActive)
  addRecord(onlineActive)

  // Depois o histórico — carrega cada uma pelo id
  for (const meta of [...localHistory, ...onlineHistory]) {
    if (seen.has(meta.id)) continue
    // Tenta local primeiro, depois online-cache
    const session = local.loadSession(meta.id) ?? onlineCache.loadSession(meta.id)
    if (session) {
      seen.add(meta.id)
      records.push({ metadata: meta, session })
    }
  }

  return records
}

// ---------------------------------------------------------------------------
// Sub-componente: formulário de e-mails por participante
// ---------------------------------------------------------------------------

interface EmailFormProps {
  record: SessionRecord
  onConfirm: (emailsByClientId: Record<string, string>) => void
  onCancel: () => void
  importing: boolean
}

function EmailForm({ record, onConfirm, onCancel, importing }: EmailFormProps) {
  const [emails, setEmails] = useState<Record<string, string>>({})

  const participants = record.session.participants

  function handleChange(clientId: string, value: string) {
    setEmails((prev) => ({ ...prev, [clientId]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Remove entradas vazias
    const filtered: Record<string, string> = {}
    for (const [id, email] of Object.entries(emails)) {
      if (email.trim()) filtered[id] = email.trim()
    }
    onConfirm(filtered)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2">
      <p className="text-[10px] leading-relaxed text-[var(--color-muted)]">
        Informe o e-mail de cada participante para vinculá-los à conta deles (opcional).
      </p>
      <ul className="flex flex-col gap-2">
        {participants.map((p) => (
          <li key={p.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="shrink-0 truncate text-[10px] font-medium text-[var(--color-muted)] sm:w-24">
              {p.name}
            </span>
            <input
              type="email"
              placeholder="email@opcional.com"
              value={emails[p.id] ?? ''}
              onChange={(e) => handleChange(p.id, e.target.value)}
              className="min-w-0 flex-1 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] text-[var(--color-text)] placeholder-[var(--color-muted)] outline-none focus:border-[var(--color-primary)]/40"
            />
          </li>
        ))}
      </ul>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={importing}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] py-2 text-[11px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {importing && <Loader2 className="h-3 w-3 animate-spin" />}
          {importing ? 'Importando…' : 'Confirmar importação'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={importing}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)] disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Props do componente principal
// ---------------------------------------------------------------------------

interface ImportLocalSessionsProps {
  user: User
  onHistoryRefresh: (entries: NormalizedGameSummary[]) => void
}

// ---------------------------------------------------------------------------
// ImportLocalSessions
// ---------------------------------------------------------------------------

export function ImportLocalSessions({ user, onHistoryRefresh }: ImportLocalSessionsProps) {
  if (!isSupabaseConfigured()) return null

  return <ImportLocalSessionsInner user={user} onHistoryRefresh={onHistoryRefresh} />
}

function ImportLocalSessionsInner({ user, onHistoryRefresh }: ImportLocalSessionsProps) {
  const [records, setRecords] = useState<SessionRecord[]>([])
  const [expanded, setExpanded] = useState(false)
  // IDs já importados nesta sessão do browser (evita reimportar)
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())
  // ID da sessão com form de e-mail aberto
  const [formOpenId, setFormOpenId] = useState<string | null>(null)
  // Estado de importação por id
  const [importingId, setImportingId] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [errorById, setErrorById] = useState<Record<string, string>>({})

  useEffect(() => {
    const loaded = loadAllLocalRecords()
    setRecords(loaded)
  }, [])

  const unimported = records.filter((r) => !importedIds.has(r.metadata.id))

  const handleImport = useCallback(
    async (record: SessionRecord, emailsByClientId: Record<string, string>) => {
      setImportingId(record.metadata.id)
      setErrorById((prev) => {
        const next = { ...prev }
        delete next[record.metadata.id]
        return next
      })

      const result = await importLocalSession(record, {
        emailsByClientId,
        selfProfileId: user.id,
      })

      setImportingId(null)

      if (result.error) {
        setErrorById((prev) => ({ ...prev, [record.metadata.id]: result.error! }))
        return
      }

      // Sucesso
      setImportedIds((prev) => new Set([...prev, record.metadata.id]))
      setSuccessId(record.metadata.id)
      setFormOpenId(null)

      // Recarrega histórico
      try {
        const entries = await listNormalizedGames()
        onHistoryRefresh(entries)
      } catch {
        // Não bloqueia o feedback de sucesso
      }

      // Remove indicador de sucesso após 3s
      setTimeout(() => {
        setSuccessId((prev) => (prev === record.metadata.id ? null : prev))
      }, 3000)
    },
    [user.id, onHistoryRefresh],
  )

  if (unimported.length === 0 && importedIds.size === 0) return null

  return (
    <section aria-label="Importar sessões locais" className="mt-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
        aria-expanded={expanded}
      >
        <span>Sessões locais{unimported.length > 0 ? ` (${unimported.length})` : ''}</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="mt-2">
          {unimported.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)]">
              Todas as sessões locais já foram importadas.
            </p>
          ) : (
            <ul className="flex flex-col gap-2" role="list">
              {unimported.map((record) => {
                const isFormOpen = formOpenId === record.metadata.id
                const isImporting = importingId === record.metadata.id
                const isSuccess = successId === record.metadata.id
                const errMsg = errorById[record.metadata.id]
                const teamCount = record.session.teams.length
                const questionCount = record.session.board.reduce(
                  (acc, col) => acc + col.tiles.length,
                  0,
                )

                return (
                  <li
                    key={record.metadata.id}
                    className="rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-[var(--color-text)]">
                          {record.metadata.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                          {formatDatePtBR(record.metadata.lastModified)} · {teamCount} time
                          {teamCount !== 1 ? 's' : ''} · {questionCount} questão
                          {questionCount !== 1 ? 'ões' : ''}
                        </p>
                      </div>

                      {!isFormOpen && (
                        <button
                          onClick={() => setFormOpenId(record.metadata.id)}
                          disabled={isImporting}
                          className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] text-[var(--color-muted)] transition-colors hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] disabled:opacity-50"
                          aria-label={`Importar sessão ${record.metadata.name}`}
                        >
                          <Upload className="h-3 w-3" />
                          Importar
                        </button>
                      )}
                    </div>

                    {isSuccess && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Partida vinculada à sua conta!
                      </div>
                    )}

                    {errMsg && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        {errMsg}
                      </div>
                    )}

                    {isFormOpen && (
                      <EmailForm
                        record={record}
                        onConfirm={(emailsByClientId) =>
                          void handleImport(record, emailsByClientId)
                        }
                        onCancel={() => setFormOpenId(null)}
                        importing={isImporting}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

import { Cloud, HardDrive, Loader2, Play, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { describeMove } from '@/modules/game/infrastructure/session-checkpoint.service'
import {
  compareSessionVersions,
  summarizeSessionStart,
  type SessionVersionRelation,
} from '@/modules/game/domain/session-start'
import type { SessionStartCandidate, SessionStartupStatus } from '@/modules/game/application/useSessionStartup'
import { useTranslation } from '@/shared/i18n'

type SessionStartModalProps = {
  status: SessionStartupStatus
  candidates: SessionStartCandidate[]
  activeDevice: SessionStartCandidate | null
  activeCloud: SessionStartCandidate | null
  cloudUnavailable: boolean
  busy?: boolean
  onRetry: () => void
  onChoose: (candidate: SessionStartCandidate) => void
  onNew: () => void
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CandidateCard({
  candidate,
  recommended,
  busy,
  onChoose,
}: {
  candidate: SessionStartCandidate
  recommended: boolean
  busy: boolean
  onChoose: () => void
}) {
  const { t, i18n } = useTranslation('control')
  const locale = i18n.resolvedLanguage ?? i18n.language
  const { session, metadata } = candidate.record
  const summary = summarizeSessionStart(session)
  const lastMove = describeMove(summary.lastEvent ?? undefined)
  const teamName = session.teams.find((team) => team.id === summary.lastEvent?.teamId)?.name
  let lastAction: string = t('sessionStart.noActions')
  if (summary.lastEvent) {
    if (lastMove.type === 'mimica') {
      lastAction = t('sessionStart.lastAction.mimica', { team: teamName ?? t('sessionStart.teamFallback'), points: lastMove.points })
    } else if (lastMove.type === 'trivia-void') {
      lastAction = t('sessionStart.lastAction.void', { film: lastMove.film ?? t('sessionStart.filmFallback') })
    } else if (lastMove.type === 'trivia-answer') {
      lastAction = t('sessionStart.lastAction.answer', {
        team: teamName ?? t('sessionStart.teamFallback'),
        film: lastMove.film ?? t('sessionStart.filmFallback'),
        points: lastMove.points,
      })
    }
  }

  return (
    <article className={`flex min-w-0 flex-col rounded-2xl border p-4 ${recommended ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/7' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            {candidate.source === 'cloud' ? <Cloud size={18} /> : <HardDrive size={18} />}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              {candidate.source === 'cloud' ? t('sessionStart.cloud') : t('sessionStart.device')}
            </p>
            <h3 className="mt-1 truncate text-base font-semibold text-[var(--color-text)]">{session.title || metadata.name}</h3>
          </div>
        </div>
        {recommended ? (
          <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-on-primary)]">
            {t('sessionStart.recommended')}
          </span>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-black/5 px-3 py-2 dark:bg-white/5">
          <dt className="text-[var(--color-muted)]">{t('sessionStart.questions')}</dt>
          <dd className="mt-0.5 font-semibold text-[var(--color-text)]">{summary.answered}/{summary.totalQuestions}</dd>
        </div>
        <div className="rounded-xl bg-black/5 px-3 py-2 dark:bg-white/5">
          <dt className="text-[var(--color-muted)]">{t('sessionStart.score')}</dt>
          <dd className="mt-0.5 font-semibold text-[var(--color-text)]">{t('sessionStart.points', { count: summary.score })}</dd>
        </div>
        <div className="rounded-xl bg-black/5 px-3 py-2 dark:bg-white/5">
          <dt className="text-[var(--color-muted)]">{t('sessionStart.teams')}</dt>
          <dd className="mt-0.5 font-semibold text-[var(--color-text)]">{summary.teams}</dd>
        </div>
        <div className="rounded-xl bg-black/5 px-3 py-2 dark:bg-white/5">
          <dt className="text-[var(--color-muted)]">{t('sessionStart.updated')}</dt>
          <dd className="mt-0.5 font-semibold text-[var(--color-text)]">{formatDate(metadata.lastModified, locale)}</dd>
        </div>
      </dl>

      <div className="mt-3 rounded-xl border border-[var(--color-border)] px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">{t('sessionStart.lastActionLabel')}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--color-text)]">{lastAction}</p>
      </div>

      <Button onClick={onChoose} disabled={busy} className="mt-4 min-h-11 w-full">
        <Play size={16} />
        {candidate.active ? t('sessionStart.continue') : t('sessionStart.resume')}
      </Button>
    </article>
  )
}

function recommendationFor(
  relation: SessionVersionRelation | null,
  candidate: SessionStartCandidate,
): boolean {
  if (relation === 'local-ahead') return candidate.source === 'device'
  if (relation === 'cloud-ahead') return candidate.source === 'cloud'
  if (relation === 'same') return candidate.source === 'device'
  return false
}

export function SessionStartModal({
  status,
  candidates,
  activeDevice,
  activeCloud,
  cloudUnavailable,
  busy = false,
  onRetry,
  onChoose,
  onNew,
}: SessionStartModalProps) {
  const { t } = useTranslation('control')
  const relation = activeDevice && activeCloud
    ? compareSessionVersions(
        activeDevice.record.session,
        activeCloud.record.session,
        activeDevice.record.metadata.lastModified,
        activeCloud.record.metadata.lastModified,
      )
    : null
  const primary = [activeDevice, activeCloud].filter(Boolean) as SessionStartCandidate[]
  const primaryKeys = new Set(primary.map((candidate) => candidate.key))
  const others = candidates.filter((candidate) => !primaryKeys.has(candidate.key))

  const relationText = relation === 'different-sessions'
    ? t('sessionStart.differentSessions')
    : relation === 'conflict'
      ? t('sessionStart.diverged')
      : relation === 'local-ahead'
        ? t('sessionStart.localAhead')
        : relation === 'cloud-ahead'
          ? t('sessionStart.cloudAhead')
          : relation === 'same'
            ? t('sessionStart.synchronized')
            : t('sessionStart.chooseDescription')

  return (
    <Modal
      isOpen={status !== 'resolved'}
      onClose={() => undefined}
      dismissible={false}
      size="xl"
      title={t('sessionStart.title')}
      description={t('sessionStart.description')}
    >
      {status === 'checking' ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary)]" />
          <p className="text-sm font-semibold text-[var(--color-text)]">{t('sessionStart.checking')}</p>
          <p className="max-w-md text-xs leading-5 text-[var(--color-muted)]">{t('sessionStart.checkingDescription')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">{relationText}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                {relation === 'different-sessions'
                  ? t('sessionStart.safeChoiceDifferent')
                  : relation
                    ? t('sessionStart.safeChoiceVersion')
                    : t('sessionStart.safeChoiceSingle')}
              </p>
            </div>
          </div>

          {cloudUnavailable ? (
            <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-amber-700 dark:text-amber-300">{t('sessionStart.cloudUnavailable')}</p>
              <Button variant="outline" onClick={onRetry} disabled={busy} className="min-h-11 shrink-0">
                <RefreshCw size={15} /> {t('sessionStart.retry')}
              </Button>
            </div>
          ) : null}

          {primary.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {primary.map((candidate) => (
                <CandidateCard
                  key={candidate.key}
                  candidate={candidate}
                  recommended={recommendationFor(relation, candidate)}
                  busy={busy}
                  onChoose={() => onChoose(candidate)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-5 text-center text-sm text-[var(--color-muted)]">
              {t('sessionStart.noActive')}
            </div>
          )}

          {others.length > 0 ? (
            <details className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--color-text)]">
                {t('sessionStart.otherSessions', { count: others.length })}
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {others.map((candidate) => (
                  <CandidateCard
                    key={candidate.key}
                    candidate={candidate}
                    recommended={false}
                    busy={busy}
                    onChoose={() => onChoose(candidate)}
                  />
                ))}
              </div>
            </details>
          ) : null}

          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">{t('sessionStart.newTitle')}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">{t('sessionStart.newDescription')}</p>
            </div>
            <Button variant="outline" onClick={onNew} disabled={busy} className="min-h-11 shrink-0">
              <Plus size={16} /> {t('sessionStart.newAction')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

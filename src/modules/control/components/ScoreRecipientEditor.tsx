import type { TriviaParticipant, TriviaTeam } from '@/modules/trivia/types'
import type { PointDistribution } from '../types/control.types'
import { useTranslation } from '@/shared/i18n'

type ScoreRecipientEditorProps = {
  team: TriviaTeam
  participants: TriviaParticipant[]
  distribution?: PointDistribution
  suggestedPoints: number
  isActiveTeam: boolean
  onToggle: (enabled: boolean) => void
  onPointsChange: (points: number) => void
  onParticipantChange: (participantId?: string) => void
}

export function ScoreRecipientEditor({
  team,
  participants,
  distribution,
  suggestedPoints,
  isActiveTeam,
  onToggle,
  onPointsChange,
  onParticipantChange,
}: ScoreRecipientEditorProps) {
  const { t } = useTranslation(['control', 'common'])
  const isEnabled = Boolean(distribution)
  const pointsValue = distribution?.points ?? suggestedPoints

  return (
    <div
      className={`rounded-xl border p-2.5 transition ${
        isEnabled
          ? 'border-[var(--color-primary)]/35 bg-[var(--color-primary)]/5'
          : 'border-[var(--color-border)] bg-[var(--color-background)]'
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: team.color }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-semibold text-[var(--color-text)]">{team.name}</span>
            {isActiveTeam ? (
              <span className="rounded-full bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                {t('scoring.activeTeam', { ns: 'control' })}
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggle(!isEnabled)}
          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold transition ${
            isEnabled
              ? 'bg-[var(--color-primary)] text-white'
              : 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
          }`}
        >
          {isEnabled ? t('actions.remove', { ns: 'common' }) : t('actions.add', { ns: 'common' })}
        </button>
      </div>

      {isEnabled ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)]">
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {t('scoring.points', { ns: 'control' })}
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={Number.isFinite(pointsValue) ? pointsValue : 0}
              onChange={(event) => onPointsChange(Math.max(0, Number(event.target.value) || 0))}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-xs font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {t('scoring.credit', { ns: 'control' })}
            </span>
            <select
              value={distribution?.participantId ?? ''}
              onChange={(event) => onParticipantChange(event.target.value || undefined)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
            >
              <option value="">{t('scoring.wholeTeam', { ns: 'control' })}</option>
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  )
}

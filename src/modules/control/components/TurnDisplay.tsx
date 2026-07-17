import { UsersRound } from 'lucide-react'
import type { TriviaParticipant, TriviaTeam } from '@/modules/trivia/types'
import { useTranslation } from '@/shared/i18n'

type TurnDisplayProps = {
  activeParticipant: TriviaParticipant | null
  activeTeam: TriviaTeam | null
  nextParticipant: TriviaParticipant | null
  nextParticipantTeamName: string | null
  turnSequence: string[]
  activeParticipantId: string | null
  activeTurnIndex: number
  gameMode: 'demo' | 'offline' | 'online'
  orderedTeamsLength: number
}

/**
 * Componente para exibir informações do turno atual
 */
export function TurnDisplay({
  activeParticipant,
  activeTeam,
  nextParticipant,
  nextParticipantTeamName,
  turnSequence,
  activeParticipantId,
  activeTurnIndex,
  gameMode,
  orderedTeamsLength,
}: TurnDisplayProps) {
  const { t } = useTranslation('control')
  return (
    <>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--color-muted)]">
          {t('turn.current')}
        </p>
        <p className="text-lg font-semibold text-[var(--color-text)]">
          {gameMode === 'offline' && orderedTeamsLength === 0
            ? t('turn.configureTeams')
            : activeParticipant?.name ?? t('turn.waitingStart')}
          {activeTeam ? ` · ${activeTeam.name}` : ''}
        </p>
      </div>

      <div className="ml-auto flex flex-col gap-2">
        {orderedTeamsLength > 0 && (
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-secondary)]/30 bg-[var(--color-secondary)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-secondary)]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('turn.counter', { current: (activeParticipantId ? activeTurnIndex : -1) + 1, total: turnSequence.length })}
          </div>
        )}

        {activeParticipant && activeTeam && (
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-primary)] shadow-md">
            <UsersRound size={14} className="font-bold" />
            {t('turn.now', { participant: activeParticipant.name, team: activeTeam.name })}
          </div>
        )}

        {nextParticipant && nextParticipantTeamName && (
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)] shadow-sm">
            <UsersRound size={14} /> {t('turn.next', { participant: nextParticipant.name, team: nextParticipantTeamName })}
          </span>
        )}
      </div>
    </>
  )
}

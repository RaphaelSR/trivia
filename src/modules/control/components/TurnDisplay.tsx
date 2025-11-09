import { UsersRound } from 'lucide-react'
import type { TriviaParticipant, TriviaTeam } from '@/modules/trivia/types'

type TurnDisplayProps = {
  activeParticipant: TriviaParticipant | null
  activeTeam: TriviaTeam | null
  nextParticipant: TriviaParticipant | null
  nextParticipantTeamName: string | null
  currentRound: number
  turnSequence: string[]
  activeParticipantId: string | null
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
  currentRound,
  turnSequence,
  activeParticipantId,
  gameMode,
  orderedTeamsLength,
}: TurnDisplayProps) {
  return (
    <>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--color-muted)]">
          Turno atual
        </p>
        <p className="text-lg font-semibold text-[var(--color-text)]">
          {gameMode === 'offline' && orderedTeamsLength === 0
            ? 'Configure times para começar'
            : activeParticipant?.name ?? 'Aguardando início'}
          {activeTeam ? ` · ${activeTeam.name}` : ''}
        </p>
      </div>

      <div className="ml-auto flex flex-col gap-2">
        {orderedTeamsLength > 0 && (
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-primary)] shadow-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Rodada {currentRound}
          </div>
        )}

        {orderedTeamsLength > 0 && (
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-secondary)]/30 bg-[var(--color-secondary)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-secondary)]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Turno {turnSequence.indexOf(activeParticipantId || '') + 1} de {turnSequence.length}
          </div>
        )}

        {activeParticipant && activeTeam && (
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-primary)] shadow-md">
            <UsersRound size={14} className="font-bold" />
            Vez de: {activeParticipant.name} · {activeTeam.name}
          </div>
        )}

        {nextParticipant && nextParticipantTeamName && (
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)] shadow-sm">
            <UsersRound size={14} /> Próximo: {nextParticipant.name} · {nextParticipantTeamName}
          </span>
        )}
      </div>
    </>
  )
}


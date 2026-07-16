import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { TriviaParticipant, TriviaTeam } from '@/modules/trivia/types'
import { ParticipantAvatar } from '@/shared/components/ParticipantAvatar'
import type { ParticipantIdentity } from '@/modules/auth/services/profile-avatar.service'

interface ScoreboardItem {
  team: TriviaTeam
  position: number
  points: number
}

interface GameStatusStripProps {
  activeParticipant: TriviaParticipant | null
  activeTeam: TriviaTeam | null
  currentTurnLabel: string
  scoreboard: ScoreboardItem[]
  nextParticipant?: TriviaParticipant | null
  nextTeam?: TriviaTeam | null
  participantIdentities?: Record<string, ParticipantIdentity>
}

export function GameStatusStrip({
  activeParticipant,
  activeTeam,
  currentTurnLabel,
  scoreboard,
  nextParticipant = null,
  nextTeam = null,
  participantIdentities = {},
}: GameStatusStripProps) {
  const [scoresVisible, setScoresVisible] = useState(true)

  return (
    <div className="flex h-10 shrink-0 items-center gap-3 overflow-x-auto border-b border-white/8 bg-[var(--glass-bg)]/80 px-3 text-xs backdrop-blur lg:px-4">
      {/* Turno atual */}
      <div className="flex shrink-0 items-center gap-1.5">
        {activeParticipant ? (
          <ParticipantAvatar
            name={activeParticipant.name}
            src={participantIdentities[activeParticipant.id]?.avatarUrl}
            size={22}
          />
        ) : null}
        {activeTeam ? (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: activeTeam.color }}
          />
        ) : null}
        <span className="font-semibold text-[var(--color-text)]">
          {activeParticipant ? activeParticipant.name : 'Aguardando'}
        </span>
        {activeTeam ? (
          <span className="text-[var(--color-muted)]">· {activeTeam.name}</span>
        ) : null}
      </div>

      <span className="shrink-0 text-white/20">|</span>

      {/* Rodada / Turno */}
      <span className="shrink-0 font-mono text-[var(--color-muted)]">
        Turno {currentTurnLabel}
      </span>

      {nextParticipant ? (
        <>
          <span className="shrink-0 text-white/20">|</span>
          <div className="flex shrink-0 items-center gap-1.5 text-[var(--color-muted)]">
            <ParticipantAvatar
              name={nextParticipant.name}
              src={participantIdentities[nextParticipant.id]?.avatarUrl}
              size={20}
            />
            <span>Próximo: {nextParticipant.name}</span>
            {nextTeam ? <span>· {nextTeam.name}</span> : null}
          </div>
        </>
      ) : null}

      {scoreboard.length > 0 ? (
        <>
          <span className="shrink-0 text-white/20">|</span>

          {/* Scores dos times */}
          <div className="flex shrink-0 items-center gap-2">
            {scoreboard.map(({ team, position, points }) => (
              <div key={team.id} className="flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <span className="text-[var(--color-muted)]">{position}º</span>
                <span className="font-semibold text-[var(--color-text)]">{team.name}</span>
                <span className="rounded-full bg-white/8 px-1.5 py-0.5 font-mono font-semibold text-[var(--color-primary)]">
                  {scoresVisible ? points : '••'}
                </span>
              </div>
            ))}
          </div>

          {/* Toggle visibilidade */}
          <button
            type="button"
            onClick={() => setScoresVisible((v) => !v)}
            className="ml-1 shrink-0 rounded-md p-1 text-[var(--color-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-text)]"
            title={scoresVisible ? 'Ocultar pontuações' : 'Mostrar pontuações'}
          >
            {scoresVisible ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </button>
        </>
      ) : null}
    </div>
  )
}

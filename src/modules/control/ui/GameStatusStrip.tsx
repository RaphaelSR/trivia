import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { TriviaParticipant, TriviaTeam } from '@/modules/trivia/types'

interface ScoreboardItem {
  team: TriviaTeam
  position: number
  points: number
}

interface GameStatusStripProps {
  activeParticipant: TriviaParticipant | null
  activeTeam: TriviaTeam | null
  currentRound: number
  currentTurnLabel: string
  scoreboard: ScoreboardItem[]
}

export function GameStatusStrip({
  activeParticipant,
  activeTeam,
  currentRound,
  currentTurnLabel,
  scoreboard,
}: GameStatusStripProps) {
  const [scoresVisible, setScoresVisible] = useState(true)

  return (
    <div className="flex h-10 shrink-0 items-center gap-3 overflow-x-auto border-b border-white/8 bg-[var(--glass-bg)]/80 px-3 text-xs backdrop-blur lg:px-4">
      {/* Turno atual */}
      <div className="flex shrink-0 items-center gap-1.5">
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
        R{currentRound} · {currentTurnLabel}
      </span>

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

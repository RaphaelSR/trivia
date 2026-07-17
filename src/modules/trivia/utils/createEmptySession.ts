import type { TriviaSession } from "../types";
import { createCompleteSessionId } from '../../game/domain/session-id'

/**
 * Cria uma sessão vazia para o modo offline
 * @returns Sessão inicial sem times, participantes ou perguntas
 */
export function createEmptySession(copy?: { title?: string; themeName?: string }): TriviaSession {
  return {
    id: createCompleteSessionId(),
    title: copy?.title ?? 'Trivia',
    scheduledAt: new Date().toISOString(),
    theme: {
      id: "default-dark",
      name: copy?.themeName ?? 'dark',
      palette: {
        background: "var(--color-background)",
        primary: "#818cf8",
        secondary: "#38bdf8",
        accent: "#22c55e",
        surface: "#0f172a"
      }
    },
    teams: [],
    participants: [],
    board: [],
    activeTeamId: "",
    activeParticipantId: null,
    activeTurnIndex: 0,
    turnSequence: [],
    mimicaScores: []
  };
}

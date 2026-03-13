import type { TriviaSession } from "../types";

/**
 * Cria uma sessão vazia para o modo offline
 * @returns Sessão inicial sem times, participantes ou perguntas
 */
export function createEmptySession(): TriviaSession {
  return {
    id: "empty-session",
    title: "Nova Sessão Offline",
    scheduledAt: new Date().toISOString(),
    theme: {
      id: "default-dark",
      name: "Tema Escuro",
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
    turnSequence: [],
    mimicaScores: []
  };
}

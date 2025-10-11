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
      id: "default-light",
      name: "Tema Claro",
      palette: {
        background: "var(--color-background)",
        primary: "#4f46e5",
        secondary: "#22d3ee",
        accent: "#f97316",
        surface: "#f9fafb"
      }
    },
    teams: [],
    participants: [],
    board: [],
    activeTeamId: "",
    activeParticipantId: null,
    turnSequence: []
  };
}

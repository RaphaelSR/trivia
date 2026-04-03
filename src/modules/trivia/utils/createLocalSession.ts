import { questionBank } from "../../../data/questionBank";
import { getFilmMetadata } from "../../../data/films";
import { slugify } from "../../../utils/slugify";
import type { TriviaSession, TriviaTeam } from "../types";
import { createAlternatingTurnSequence } from "./createAlternatingTurnSequence";

const defaultTeams: TriviaTeam[] = [
  {
    id: "team-1",
    name: "Absolute Cinema",
    color: "#4f46e5",
    order: 0,
    members: ["participant-1", "participant-2", "participant-3"],
    score: 0
  },
  {
    id: "team-2",
    name: "Darth Aperol",
    color: "#22d3ee",
    order: 1,
    members: ["participant-4", "participant-5", "participant-6"],
    score: 0
  },
  {
    id: "team-3",
    name: "Pipoca & Caos",
    color: "#f97316",
    order: 2,
    members: ["participant-7", "participant-8", "participant-9"],
    score: 0
  }
];

const defaultParticipants = [
  {
    id: "participant-1",
    name: "João",
    role: "host" as const,
    teamId: "team-1"
  },
  {
    id: "participant-2",
    name: "Cris",
    role: "player" as const,
    teamId: "team-1"
  },
  {
    id: "participant-3",
    name: "Dani",
    role: "player" as const,
    teamId: "team-1"
  },
  {
    id: "participant-4",
    name: "Cami",
    role: "player" as const,
    teamId: "team-2"
  },
  {
    id: "participant-5",
    name: "Mi",
    role: "player" as const,
    teamId: "team-2"
  },
  {
    id: "participant-6",
    name: "Rapha",
    role: "player" as const,
    teamId: "team-2"
  },
  {
    id: "participant-7",
    name: "Leo",
    role: "player" as const,
    teamId: "team-3"
  },
  {
    id: "participant-8",
    name: "Bia",
    role: "player" as const,
    teamId: "team-3"
  },
  {
    id: "participant-9",
    name: "Gui",
    role: "player" as const,
    teamId: "team-3"
  }
];

export function createLocalSession(): TriviaSession {
  const films = Object.keys(questionBank);
  const board = films.map((filmId) => {
    const metadata = getFilmMetadata(filmId);
    const allEntries = questionBank[filmId] ?? [];
    // Keep only 1 question per point value (max 6 per film) for a faster demo
    const seenPoints = new Set<number>();
    const entries = allEntries.filter((entry) => {
      if (seenPoints.has(entry.points)) return false;
      seenPoints.add(entry.points);
      return true;
    });
    const tiles = entries.map((entry, index) => ({
      id: `${slugify(metadata.displayName)}-${entry.points}-${index}`,
      filmId,
      film: metadata.displayName,
      points: entry.points,
      state: "available" as const,
      question: entry.question,
      answer: entry.answer
    }));
    return {
      id: `${slugify(metadata.displayName)}-column`,
      filmId,
      film: metadata.displayName,
      theme: metadata.theme,
      tiles
    };
  });

  const turnSequence = createAlternatingTurnSequence(defaultTeams);
  const activeParticipantId = turnSequence[0] ?? null;

  return {
    id: "local-session",
    title: "Trivia Cinematográfica",
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
    teams: defaultTeams,
    participants: defaultParticipants,
    board,
    activeTeamId: defaultTeams[0].id,
    activeParticipantId,
    turnSequence,
    mimicaScores: []
  };
}

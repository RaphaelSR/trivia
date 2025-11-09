import type {
  TriviaParticipant,
  TriviaQuestionTile,
  TriviaSession,
  TriviaTeam
} from "../types";

export type TriviaSessionContextValue = {
  session: TriviaSession;
  teams: TriviaTeam[];
  participants: TriviaParticipant[];
  activeTeam: TriviaTeam | null;
  nextTeam: TriviaTeam | null;
  activeParticipant: TriviaParticipant | null;
  nextParticipant: TriviaParticipant | null;
  advanceTurn: () => void;
  setActiveTeam: (teamId: string) => void;
  updateTileState: (tileId: string, state: TriviaQuestionTile["state"]) => void;
  updateTileContent: (
    tileId: string,
    updates: Partial<Pick<TriviaQuestionTile, "question" | "answer" | "points">>
  ) => void;
  updateColumnTitle: (columnId: string, film: string) => void;
  addFilmColumn: (displayName?: string) => string;
  removeFilmColumn: (columnId: string) => void;
  addQuestionTile: (
    columnId: string,
    defaults?: Partial<TriviaQuestionTile>
  ) => string;
  removeQuestionTile: (columnId: string, tileId: string) => void;
  updateTeamsAndParticipants: (
    teams: TriviaTeam[],
    participants: TriviaParticipant[],
    turnSequence?: string[]
  ) => void;
  awardPoints: (
    tileId: string,
    teamId: string,
    participantId: string,
    pointsAwarded: number,
    source?: 'trivia' | 'mimica'
  ) => void;
  awardMimicaPoints: (
    participantId: string,
    teamId: string,
    pointsAwarded: number,
    turnNumber: number,
    roundNumber: number,
    mode: 'full-current' | 'half-current' | 'steal' | 'everyone' | 'void',
    targetTeamId?: string
  ) => void;
};

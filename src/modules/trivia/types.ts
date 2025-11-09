export type TriviaRole = "host" | "assistant" | "player";

export type TriviaParticipant = {
  id: string;
  name: string;
  role: TriviaRole;
  teamId?: string;
};

export type TriviaTeam = {
  id: string;
  name: string;
  color: string;
  order: number;
  members: string[];
  score: number;
};

export type TriviaTheme = {
  id: string;
  name: string;
  palette: {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
  };
  backgroundImageUrl?: string;
};

export type TriviaQuestionTile = {
  id: string;
  film: string;
  points: number;
  state: "available" | "active" | "answered";
  question: string;
  answer: string;
  answeredBy?: {
    participantId: string;
    teamId: string;
    pointsAwarded: number;
    timestamp: string;
    source?: 'trivia' | 'mimica';
    turnNumber?: number;
    roundNumber?: number;
    mimicaMode?: 'full-current' | 'half-current' | 'steal' | 'everyone' | 'void';
  };
};

export type MimicaScore = {
  id: string;
  participantId: string;
  teamId: string;
  pointsAwarded: number;
  timestamp: string;
  turnNumber: number;
  roundNumber: number;
  mode: 'full-current' | 'half-current' | 'steal' | 'everyone' | 'void';
  targetTeamId?: string;
};

export type TriviaColumn = {
  id: string;
  filmId: string;
  film: string;
  theme?: {
    primary: string;
    accent: string;
    background: string;
    text: string;
  };
  tiles: TriviaQuestionTile[];
};

export type TriviaSession = {
  id: string;
  title: string;
  scheduledAt: string;
  theme: TriviaTheme;
  teams: TriviaTeam[];
  participants: TriviaParticipant[];
  board: TriviaColumn[];
  activeTeamId: string;
  activeParticipantId: string | null;
  turnSequence: string[];
  mimicaScores?: MimicaScore[];
};

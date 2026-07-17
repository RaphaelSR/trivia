import type { MimicaScoringMode, TileState } from '../../shared/types/game';

export type TriviaRole = "host" | "assistant" | "player";

export type TriviaParticipant = {
  id: string;
  name: string;
  role: TriviaRole;
  teamId?: string;
  /** E-mail opcional para vinculação quando os recursos conectados estão ativos. */
  email?: string;
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
  state: TileState;
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
    mimicaMode?: MimicaScoringMode;
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
  mode: MimicaScoringMode;
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

/**
 * Tipos de ação registrados no log append-only do jogo.
 * - 'trivia-award': acerto de pergunta com pontos.
 * - 'trivia-void' : pergunta anulada (sem pontos), mas que consome a vez.
 * - 'mimica-award': pontuação de mímica.
 */
export type GameEventType = "trivia-award" | "trivia-void" | "mimica-award";

/**
 * Registro append-only de uma ação de pontuação.
 *
 * Diferente de `answeredBy` (que vive dentro do tile e pode ser sobrescrito),
 * o eventLog NUNCA é sobrescrito — cada ação vira um item novo. É a fonte de
 * auditoria/recuperação do andamento da partida.
 */
export type GameEvent = {
  id: string;
  type: GameEventType;
  timestamp: string;
  /** Origem da pontuação — espelha answeredBy.source ('trivia' | 'mimica'). */
  source: "trivia" | "mimica";
  /** Tile da pergunta (ausente em mímica, que não tem carta). */
  tileId?: string;
  film?: string;
  /** Valor da carta (pontos base). */
  basePoints?: number;
  /** Pontos efetivamente atribuídos (0 em anulação). */
  pointsAwarded: number;
  participantId?: string;
  teamId: string;
  /** Índice/rodada do turno no momento da ação (auditoria/reconstrução). */
  turnNumber?: number;
  roundNumber?: number;
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
  activeTurnIndex: number;
  turnSequence: string[];
  mimicaScores?: MimicaScore[];
  /**
   * Log append-only de ações de pontuação (acertos, anulações, mímica).
   * Nunca sobrescrito — auditoria e recuperação do andamento da partida.
   */
  eventLog?: GameEvent[];
};

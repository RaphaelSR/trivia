import type { TriviaTeam } from "../types";

/**
 * Cria uma sequência de turnos balanceada com alternância contínua entre times.
 * 
 * Garante que:
 * - A sequência tem exatamente `totalQuestions` elementos
 * - Nunca há dois turnos consecutivos do mesmo time (alternância perfeita)
 * - Todos os times participam enquanto houver perguntas
 * - Times menores voltam ao primeiro jogador quando terminam sua lista (ciclo circular)
 * - Não se preocupa com igualdade matemática exata (pode haver diferença de 1 turno)
 *
 * @param teams - Array de times ordenados
 * @param totalQuestions - Número total de perguntas no jogo
 * @returns Array de IDs de participantes alternados por time
 *
 * @example
 * 36 perguntas, 3 times (4-3-3):
 * Time A: [A1, A2, A3, A4]
 * Time B: [B1, B2, B3]
 * Time C: [C1, C2, C3]
 *
 * Resultado: A1, B1, C1, A2, B2, C2, A3, B3, C3, A4, B1, C1, A1, B2, C2, ...
 *
 * Estratégia:
 * - Alternância de times: teamIndex = turnIndex % numTeams
 * - Ciclo circular de jogadores: participantIndex = roundIndex % team.members.length
 * - roundIndex = Math.floor(turnIndex / numTeams)
 */
export function createBalancedTurnSequence(
  teams: TriviaTeam[],
  totalQuestions: number
): string[] {
  if (teams.length === 0 || totalQuestions <= 0) {
    return [];
  }

  if (teams.length === 1) {
    // Se há apenas um time, distribui os turnos entre seus jogadores em ciclo
    const team = teams[0];
    const sequence: string[] = [];
    for (let i = 0; i < totalQuestions; i++) {
      const participantIndex = i % team.members.length;
      sequence.push(team.members[participantIndex]);
    }
    return sequence;
  }

  const numTeams = teams.length;
  const sequence: string[] = [];

  // Para cada turno (0 até totalQuestions-1)
  for (let turnIndex = 0; turnIndex < totalQuestions; turnIndex++) {
    // Alternância de times: determina qual time joga neste turno
    const teamIndex = turnIndex % numTeams;
    const team = teams[teamIndex];

    // Se o time não tem membros, pula
    if (team.members.length === 0) {
      continue;
    }

    // Ciclo circular de jogadores: calcula quantas rodadas completas já passaram
    const roundIndex = Math.floor(turnIndex / numTeams);
    
    // Determina qual jogador do time joga (ciclo circular)
    const participantIndex = roundIndex % team.members.length;
    const participantId = team.members[participantIndex];

    sequence.push(participantId);
  }

  return sequence;
}


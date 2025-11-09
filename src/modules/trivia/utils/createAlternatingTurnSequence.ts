import type { TriviaTeam } from "../types";

/**
 * Cria uma sequência de turnos alternando entre times.
 * 
 * Garante que nunca haja dois turnos consecutivos do mesmo time na sequência inicial.
 * Quando times têm números diferentes de membros, após os times menores terminarem,
 * o time maior pode continuar sozinho (não há alternativa).
 *
 * @param teams - Array de times ordenados
 * @returns Array de IDs de participantes alternados por time
 *
 * @example
 * Time A: [João, Maria, Pedro]
 * Time B: [Ana, Carlos, Sofia]
 *
 * Resultado: [João, Ana, Maria, Carlos, Pedro, Sofia]
 *
 * Lógica:
 * - Um participante de cada time por rodada
 * - Respeita a ordem dos membros dentro de cada time
 * - Quando um time acaba os membros, continua com os outros times
 * - Apenas quando todos os outros times terminam, o time maior pode continuar sozinho
 */
export function createAlternatingTurnSequence(teams: TriviaTeam[]): string[] {
  if (teams.length === 0) {
    return [];
  }

  if (teams.length === 1) {
    return [...teams[0].members];
  }

  // Encontra o maior número de membros em qualquer time
  const maxMembers = Math.max(...teams.map((team) => team.members.length));

  const sequence: string[] = [];

  // Para cada "rodada" (índice de membro)
  for (let round = 0; round < maxMembers; round++) {
    // Para cada time
    for (const team of teams) {
      // Se este time ainda tem membros nesta rodada, adiciona
      if (round < team.members.length) {
        const memberId = team.members[round];
        sequence.push(memberId);
      }
    }
  }

  return sequence;
}

import type { TriviaTeam } from "../types";

/**
 * Cria uma sequência de turnos alternando entre times.
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
 */
export function createAlternatingTurnSequence(teams: TriviaTeam[]): string[] {
  console.group("[⚙️ CREATE ALTERNATING SEQUENCE]");
  console.log(
    "Input teams:",
    teams.map((t) => ({
      id: t.id,
      name: t.name,
      membersCount: t.members.length,
      members: t.members
    }))
  );

  if (teams.length === 0) {
    console.log("⚠️ No teams provided, returning empty sequence");
    console.groupEnd();
    return [];
  }

  // Se há apenas um time, retorna os membros em sequência linear
  if (teams.length === 1) {
    const singleTeam = teams[0];
    console.log(`⚠️ Only one team detected: "${singleTeam.name}"`);
    console.log("📋 Returning linear sequence for single team");
    console.log("📋 Final sequence:", singleTeam.members);
    console.groupEnd();
    return [...singleTeam.members];
  }

  // Encontra o maior número de membros em qualquer time
  const maxMembers = Math.max(...teams.map((team) => team.members.length));
  console.log("Max members per team:", maxMembers);

  const sequence: string[] = [];

  // Para cada "rodada" (índice de membro)
  for (let round = 0; round < maxMembers; round++) {
    console.log(`\n--- Round ${round + 1} ---`);
    // Para cada time
    for (const team of teams) {
      // Se este time ainda tem membros nesta rodada, adiciona
      if (round < team.members.length) {
        const memberId = team.members[round];
        sequence.push(memberId);
        console.log(
          `  ✓ Added member ${round} from team "${team.name}": ${memberId}`
        );
      } else {
        console.log(
          `  ⏭️ Team "${team.name}" has no member at position ${round}`
        );
      }
    }
  }

  console.log("\n📋 Final sequence length:", sequence.length);
  console.log("📋 Final sequence:", sequence);
  console.groupEnd();

  return sequence;
}

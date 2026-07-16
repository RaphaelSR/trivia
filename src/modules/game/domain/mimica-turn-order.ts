import type { TriviaParticipant, TriviaTeam } from "../../trivia/types";
import { createBalancedTurnSequence } from "../../trivia/utils/createBalancedTurnSequence";

export type MimicaOrderMode = "alternate" | "shuffle" | "team-shuffle";
export type MimicaStartMode = "continue" | "restart";

export function getMimicaRoundTurnCount(teams: TriviaTeam[]): number {
  const playableTeams = teams.filter((team) => team.members.length > 0);
  const maxMembers = Math.max(
    ...playableTeams.map((team) => team.members.length),
    0,
  );
  return playableTeams.length * maxMembers;
}

export function buildMimicaTurnSequence(
  teams: TriviaTeam[],
  participants: TriviaParticipant[],
  mode: MimicaOrderMode = "alternate",
  random: () => number = Math.random,
): string[] {
  const participantIds = new Set(
    participants.map((participant) => participant.id),
  );
  const playableTeams = [...teams]
    .sort((a, b) => a.order - b.order)
    .map((team) => ({
      ...team,
      members: team.members.filter((memberId) => participantIds.has(memberId)),
    }))
    .filter((team) => team.members.length > 0);

  if (mode === "shuffle") {
    return shuffle(
      playableTeams.flatMap((team) => team.members),
      random,
    );
  }

  const orderedTeams =
    mode === "team-shuffle"
      ? playableTeams.map((team) => ({
          ...team,
          members: shuffle(team.members, random),
        }))
      : playableTeams;

  return createBalancedTurnSequence(
    orderedTeams,
    getMimicaRoundTurnCount(orderedTeams),
  );
}

export function getMimicaStartIndex(
  sequence: string[],
  mode: MimicaStartMode,
  triviaActiveParticipantId: string | null,
  triviaActiveTurnIndex: number,
): number {
  if (!sequence.length || mode === "restart" || !triviaActiveParticipantId) {
    return 0;
  }

  const hintedIndex = modulo(triviaActiveTurnIndex, sequence.length);
  if (sequence[hintedIndex] === triviaActiveParticipantId) {
    return hintedIndex;
  }

  const participantIndex = sequence.indexOf(triviaActiveParticipantId);
  return participantIndex === -1 ? 0 : participantIndex;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

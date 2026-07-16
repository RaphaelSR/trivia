import {
  buildMimicaTurnSequence,
  getMimicaRoundTurnCount,
  getMimicaStartIndex,
} from "@/modules/game/domain/mimica-turn-order";
import type { TriviaParticipant, TriviaTeam } from "@/modules/trivia/types";

const teams: TriviaTeam[] = [
  {
    id: "team-a",
    name: "A",
    color: "#111",
    order: 0,
    members: ["a1"],
    score: 0,
  },
  {
    id: "team-b",
    name: "B",
    color: "#222",
    order: 1,
    members: ["b1", "b2"],
    score: 0,
  },
  {
    id: "team-c",
    name: "C",
    color: "#333",
    order: 2,
    members: ["c1", "c2", "c3"],
    score: 0,
  },
];

const participants: TriviaParticipant[] = teams.flatMap((team) =>
  team.members.map((id) => ({
    id,
    name: id.toUpperCase(),
    role: "player",
    teamId: team.id,
  })),
);

describe("ordem da mimica", () => {
  it("usa a mesma alternancia balanceada do trivia com times 1/2/3", () => {
    expect(getMimicaRoundTurnCount(teams)).toBe(9);
    expect(buildMimicaTurnSequence(teams, participants)).toEqual([
      "a1",
      "b1",
      "c1",
      "a1",
      "b2",
      "c2",
      "a1",
      "b1",
      "c3",
    ]);
  });

  it("continua no ponto indicado pelo trivia ou reinicia no primeiro", () => {
    const sequence = buildMimicaTurnSequence(teams, participants);

    expect(getMimicaStartIndex(sequence, "continue", "b2", 4)).toBe(4);
    expect(getMimicaStartIndex(sequence, "restart", "b2", 4)).toBe(0);
  });

  it("embaralha participantes unicos no modo aleatorio", () => {
    const sequence = buildMimicaTurnSequence(
      teams,
      participants,
      "shuffle",
      () => 0,
    );

    expect(sequence).toHaveLength(participants.length);
    expect(new Set(sequence)).toEqual(
      new Set(participants.map((participant) => participant.id)),
    );
  });

  it("embaralha dentro dos times sem perder a alternancia no modo por time", () => {
    const sequence = buildMimicaTurnSequence(
      teams,
      participants,
      "team-shuffle",
      () => 0,
    );
    const teamByParticipant = new Map(
      participants.map((participant) => [participant.id, participant.teamId]),
    );

    expect(sequence).toHaveLength(9);
    expect(sequence.map((id) => teamByParticipant.get(id))).toEqual([
      "team-a",
      "team-b",
      "team-c",
      "team-a",
      "team-b",
      "team-c",
      "team-a",
      "team-b",
      "team-c",
    ]);
  });
});

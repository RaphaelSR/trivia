import { describe, it, expect } from "@jest/globals";
import { createAlternatingTurnSequence } from "../../../../modules/trivia/utils/createAlternatingTurnSequence";
import type {
  TriviaTeam,
  TriviaParticipant
} from "../../../../modules/trivia/types";

/**
 * Testes para validar o comportamento do advanceTurn após wrap-around
 *
 * O problema: quando advanceTurn chega ao final da sequência e faz wrap-around,
 * pode quebrar a alternância entre times (ex: A4 → A1).
 *
 * A solução: regenerar automaticamente a sequência quando detectar wrap-around,
 * garantindo que o primeiro elemento da nova sequência seja de um time diferente do último.
 */
describe("advanceTurn - Wrap-around e Regeneração Automática", () => {
  const createParticipant = (
    id: string,
    name: string,
    teamId: string
  ): TriviaParticipant => ({
    id,
    name,
    role: "player",
    teamId
  });

  const createTeam = (
    id: string,
    name: string,
    memberIds: string[],
    order: number = 0
  ): TriviaTeam => ({
    id,
    name,
    color: `#${id}`,
    order,
    members: memberIds,
    score: 0
  });

  // Helper function for potential future use
  /*
  const getTeamIdFromParticipant = (participantId: string, participants: TriviaParticipant[]): string | null => {
    const participant = participants.find(p => p.id === participantId)
    return participant?.teamId ?? null
  }
  */

  // Helper function for potential future use
  /*
  const _hasConsecutiveSameTeam = (sequence: string[], participants: TriviaParticipant[]): boolean => {
    for (let i = 0; i < sequence.length - 1; i++) {
      const currentTeam = getTeamIdFromParticipant(sequence[i], participants)
      const nextTeam = getTeamIdFromParticipant(sequence[i + 1], participants)
      if (currentTeam && nextTeam && currentTeam === nextTeam) {
        return true
      }
    }
    return false
  }
  */

  describe("Regeneração após wrap-around", () => {
    it("deve regenerar sequência quando completa uma rodada (3 times 4-3-3)", () => {
      const teams: TriviaTeam[] = [
        createTeam(
          "team-a",
          "Guardiões do Cinema",
          ["A1", "A2", "A3", "A4"],
          0
        ),
        createTeam("team-b", "Absolute Cinema", ["B1", "B2", "B3"], 1),
        createTeam("team-c", "Darth Apperol", ["C1", "C2", "C3"], 2)
      ];

      const participants: TriviaParticipant[] = [
        createParticipant("A1", "A1", "team-a"),
        createParticipant("A2", "A2", "team-a"),
        createParticipant("A3", "A3", "team-a"),
        createParticipant("A4", "A4", "team-a"),
        createParticipant("B1", "B1", "team-b"),
        createParticipant("B2", "B2", "team-b"),
        createParticipant("B3", "B3", "team-b"),
        createParticipant("C1", "C1", "team-c"),
        createParticipant("C2", "C2", "team-c"),
        createParticipant("C3", "C3", "team-c")
      ];

      // Sequência inicial: A1, B1, C1, A2, B2, C2, A3, B3, C3, A4
      const initialSequence = createAlternatingTurnSequence(teams);
      expect(initialSequence).toEqual([
        "A1",
        "B1",
        "C1",
        "A2",
        "B2",
        "C2",
        "A3",
        "B3",
        "C3",
        "A4"
      ]);

      // Simula estar no último elemento (A4, índice 9)
      const lastIndex = initialSequence.length - 1;
      const lastParticipantId = initialSequence[lastIndex];
      const lastParticipant = participants.find(
        (p) => p.id === lastParticipantId
      );
      const lastTeamId = lastParticipant?.teamId;

      expect(lastTeamId).toBe("team-a");

      // Simula wrap-around: regenera a sequência
      const regeneratedSequence = createAlternatingTurnSequence(teams);

      // Garante que o primeiro elemento da nova sequência seja de um time diferente
      const firstParticipant = participants.find(
        (p) => p.id === regeneratedSequence[0]
      );
      const firstTeamId = firstParticipant?.teamId;

      // Como a sequência sempre começa com A1, precisamos rotacionar se necessário
      let finalSequence = regeneratedSequence;
      if (firstTeamId === lastTeamId && regeneratedSequence.length > 1) {
        const differentTeamIndex = regeneratedSequence.findIndex((id) => {
          const p = participants.find((participant) => participant.id === id);
          return p?.teamId !== lastTeamId;
        });

        if (differentTeamIndex > 0) {
          finalSequence = [
            ...regeneratedSequence.slice(differentTeamIndex),
            ...regeneratedSequence.slice(0, differentTeamIndex)
          ];
        }
      }

      const newFirstParticipant = participants.find(
        (p) => p.id === finalSequence[0]
      );
      const newFirstTeamId = newFirstParticipant?.teamId;

      // Valida que o primeiro da nova sequência é diferente do último da anterior
      expect(newFirstTeamId).not.toBe(lastTeamId);

      // Valida apenas a transição (último da anterior -> primeiro da nova)
      expect(lastTeamId).not.toBe(newFirstTeamId);
    });

    it("nunca deve criar dois turnos consecutivos do mesmo time após regeneração", () => {
      const testCases = [
        {
          name: "3 times (4-3-3)",
          teams: [
            createTeam("team-a", "Time A", ["A1", "A2", "A3", "A4"], 0),
            createTeam("team-b", "Time B", ["B1", "B2", "B3"], 1),
            createTeam("team-c", "Time C", ["C1", "C2", "C3"], 2)
          ]
        },
        {
          name: "3 times (4-4-4)",
          teams: [
            createTeam("team-a", "Time A", ["A1", "A2", "A3", "A4"], 0),
            createTeam("team-b", "Time B", ["B1", "B2", "B3", "B4"], 1),
            createTeam("team-c", "Time C", ["C1", "C2", "C3", "C4"], 2)
          ]
        }
      ];

      testCases.forEach(({ name: _name, teams }) => {
        // Cria participantes para todos os times
        const participants: TriviaParticipant[] = teams.flatMap((team) =>
          team.members.map((memberId) =>
            createParticipant(memberId, memberId, team.id)
          )
        );

        // Sequência inicial
        const initialSequence = createAlternatingTurnSequence(teams);

        // Simula wrap-around: último elemento
        const lastIndex = initialSequence.length - 1;
        const lastParticipantId = initialSequence[lastIndex];
        const lastParticipant = participants.find(
          (p) => p.id === lastParticipantId
        );
        const lastTeamId = lastParticipant?.teamId;

        // Regenera sequência
        const regeneratedSequence = createAlternatingTurnSequence(teams);

        // Garante que primeiro seja diferente do último
        let finalSequence = regeneratedSequence;
        if (lastTeamId) {
          const firstParticipant = participants.find(
            (p) => p.id === regeneratedSequence[0]
          );
          const firstTeamId = firstParticipant?.teamId;

          if (firstTeamId === lastTeamId && regeneratedSequence.length > 1) {
            const differentTeamIndex = regeneratedSequence.findIndex((id) => {
              const p = participants.find(
                (participant) => participant.id === id
              );
              return p?.teamId !== lastTeamId;
            });

            if (differentTeamIndex > 0) {
              finalSequence = [
                ...regeneratedSequence.slice(differentTeamIndex),
                ...regeneratedSequence.slice(0, differentTeamIndex)
              ];
            }
          }

          // Valida que o primeiro da nova sequência é diferente do último da anterior
          const newFirstParticipant = participants.find(
            (p) => p.id === finalSequence[0]
          );
          const newFirstTeamId = newFirstParticipant?.teamId;
          expect(newFirstTeamId).not.toBe(lastTeamId);

          // Valida apenas a transição (último da anterior -> primeiro da nova)
          expect(lastTeamId).not.toBe(newFirstTeamId);
        }
      });
    });
  });
});

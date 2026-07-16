import { fireEvent, render, screen } from "@testing-library/react";
import { TurnOrderPreview } from "@/modules/control/components/TurnOrderPreview";
import type { TriviaParticipant, TriviaTeam } from "@/modules/trivia/types";

const teams: TriviaTeam[] = [
  {
    id: "team-a",
    name: "Time A",
    color: "#111",
    order: 0,
    members: ["a1"],
    score: 0,
  },
  {
    id: "team-b",
    name: "Time B",
    color: "#222",
    order: 1,
    members: ["b1", "b2"],
    score: 0,
  },
  {
    id: "team-c",
    name: "Time C",
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

const sequence = ["a1", "b1", "c1", "a1", "b2", "c2", "a1", "b1", "c3"];

describe("TurnOrderPreview", () => {
  it("mostra a sequencia real, destaca o turno atual e permite reorganizar o futuro", () => {
    const onReorganize = jest.fn();

    render(
      <TurnOrderPreview
        teams={teams}
        participants={participants}
        turnSequence={sequence}
        activeTurnIndex={4}
        onReorganize={onReorganize}
      />,
    );

    expect(
      screen.getByText(
        "Esta é a sequência real salva na sessão. Turnos concluídos ficam atenuados e o turno atual aparece em destaque.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Atual")).toBeInTheDocument();
    expect(screen.getAllByText("A1")).toHaveLength(3);

    fireEvent.click(
      screen.getByRole("button", { name: "Reorganizar próximos" }),
    );
    expect(onReorganize).toHaveBeenCalledTimes(1);
  });

  it("distingue a simulacao do rascunho da sequencia salva", () => {
    render(
      <TurnOrderPreview
        teams={teams}
        participants={participants}
        turnSequence={sequence}
        sequenceSource="draft"
      />,
    );

    expect(
      screen.getByText(/Prévia calculada com o rascunho atual/),
    ).toBeInTheDocument();
  });
});

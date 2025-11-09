import { useState, useMemo } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { Trophy, ChevronDown, Medal } from "lucide-react";
import type { TriviaTeam, TriviaParticipant, TriviaColumn } from "../../modules/trivia/types";

interface GameEndModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: TriviaTeam[];
  participants: TriviaParticipant[];
  board?: TriviaColumn[];
  onShowMimica?: () => void;
}

export function GameEndModal({
  isOpen,
  onClose,
  teams,
  participants,
  board = [],
  onShowMimica,
}: GameEndModalProps) {
  const [showRanking, setShowRanking] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => (b.score || 0) - (a.score || 0)),
    [teams]
  );

  const participantScores = useMemo(() => {
    const scores: Record<string, number> = {};
    
    board.forEach((column) => {
      column.tiles.forEach((tile) => {
        if (tile.answeredBy?.participantId) {
          const participantId = tile.answeredBy.participantId;
          scores[participantId] = (scores[participantId] || 0) + (tile.answeredBy.pointsAwarded || 0);
        }
      });
    });
    
    return scores;
  }, [board]);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  const handleClose = () => {
    setShowRanking(false);
    setExpandedTeams({});
    onClose();
  };

  const handleShowMimica = () => {
    if (onShowMimica) {
      handleClose();
      setTimeout(() => {
        onShowMimica();
      }, 100);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="🎉 Trivia Finalizado!"
      description="Todas as perguntas foram respondidas!"
    >
      <div className="space-y-6">
        {/* Mensagem de Parabéns */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-secondary)]/10 border-2 border-[var(--color-primary)]/30 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-[var(--color-primary)]" />
          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
            Parabéns a todos os participantes!
          </h2>
          <p className="text-[var(--color-muted)]">
            O trivia cinematográfico chegou ao fim. Esperamos que tenham se divertido!
          </p>
        </div>

        {/* Botão de Mostrar Ranking */}
        {!showRanking && (
          <Button
            variant="primary"
            onClick={() => setShowRanking(true)}
            className="w-full"
          >
            <Medal className="h-4 w-4 mr-2" />
            Ver Ranking Final
          </Button>
        )}

        {/* Ranking */}
        {showRanking && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
              <Medal className="h-5 w-5 text-[var(--color-primary)]" />
              Ranking Final
            </h3>

            {sortedTeams.map((team, index) => {
              const isExpanded = expandedTeams[team.id];
              const position = index + 1;
              
              // Medalhas para top 3
              const getMedalColor = (pos: number) => {
                if (pos === 1) return "text-yellow-500";
                if (pos === 2) return "text-gray-400";
                if (pos === 3) return "text-amber-600";
                return "text-[var(--color-muted)]";
              };

              // Participantes do time
              const teamParticipants = participants.filter(
                (p) => p.teamId === team.id
              );

              return (
                <div
                  key={team.id}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] overflow-hidden"
                >
                  <button
                    onClick={() => toggleTeam(team.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl ${getMedalColor(position)}`}>
                        {position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : `${position}º`}
                      </span>
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="text-sm font-semibold text-[var(--color-text)]">
                        {team.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[var(--color-primary)]">
                        {team.score || 0} pts
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-[var(--color-muted)] transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                      <div className="space-y-2">
                        {teamParticipants
                          .sort((a, b) => (participantScores[b.id] || 0) - (participantScores[a.id] || 0))
                          .map((participant) => {
                            const score = participantScores[participant.id] || 0;
                            
                            return (
                              <div
                                key={participant.id}
                                className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-background)]"
                              >
                                <span className="text-xs font-medium text-[var(--color-text)]">
                                  {participant.name}
                                </span>
                                <span className="text-xs font-bold text-[var(--color-primary)]">
                                  {score} pts
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-4">
          {onShowMimica && (
            <Button
              variant="outline"
              onClick={handleShowMimica}
              className="flex-1"
            >
              Jogar Mímica
            </Button>
          )}
          <Button variant="primary" onClick={handleClose} className="flex-1">
            Fechar
          </Button>
        </div>

        {/* Nota sobre Mímica */}
        {onShowMimica && (
          <p className="text-xs text-center text-[var(--color-muted)] italic">
            💡 Lembre-se: pontos da Mímica serão somados ao placar atual
          </p>
        )}
      </div>
    </Modal>
  );
}


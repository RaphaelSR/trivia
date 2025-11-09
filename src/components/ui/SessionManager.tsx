import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import {
  Clock,
  Save,
  History,
  Play,
  Trash2,
  Calendar,
  Settings,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useOfflineSession } from "../../hooks/useOfflineSession";
import { useGameMode } from "../../hooks/useGameMode";

interface SessionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSession?: (sessionId: string) => void;
  onNewSession?: () => void;
  onResetGame?: () => void;
}

export function SessionManager({ isOpen, onClose, onLoadSession, onNewSession, onResetGame }: SessionManagerProps) {
  const { gameMode } = useGameMode();
  const { 
    currentSession,
    sessionHistory, 
    getSessionStatus, 
    deleteSession,
    loadSession
  } = useOfflineSession();
  
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const sessionStatus = getSessionStatus();
  const currentSessionId = currentSession?.metadata.id;

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLoadSession = (sessionId: string) => {
    if (onLoadSession) {
      onLoadSession(sessionId);
    }
    onClose();
  };

  const handleDeleteSession = (sessionId: string) => {
    deleteSession(sessionId);
    setShowDeleteConfirm(null);
    setSelectedSession(null);
  };

  const renderCurrentSession = () => {
    if (!sessionStatus.hasActiveSession) {
      return (
        <div className="p-4 rounded-2xl bg-[var(--color-muted)]/5 border border-[var(--color-muted)]/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--color-muted)]" />
            <div>
              <h4 className="font-semibold text-[var(--color-text)] text-sm">
                Nenhuma sessão ativa
              </h4>
              <p className="text-xs text-[var(--color-muted)]">
                Crie uma nova sessão para começar a jogar
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-2xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[var(--color-primary)]/10">
              <Play className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-[var(--color-text)] text-sm">
                {sessionStatus.sessionName}
              </h4>
              <div className="flex items-center gap-4 text-xs text-[var(--color-muted)]">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(sessionStatus.duration)}
                </div>
                <div className="flex items-center gap-1">
                  <Save className={`h-3 w-3 ${sessionStatus.isSaved ? 'text-green-500' : 'text-orange-500'}`} />
                  {sessionStatus.isSaved ? 'Salva' : 'Não salva'}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${sessionStatus.isSaved ? 'bg-green-500' : 'bg-orange-500'}`} />
            <span className="text-xs text-[var(--color-muted)]">
              {sessionStatus.isSaved ? 'Sincronizada' : 'Pendente'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderSessionHistory = () => {
    if (sessionHistory.length === 0) {
      return (
        <div className="p-4 rounded-2xl bg-[var(--color-muted)]/5 border border-[var(--color-muted)]/20">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-[var(--color-muted)]" />
            <div>
              <h4 className="font-semibold text-[var(--color-text)] text-sm">
                Nenhuma sessão anterior
              </h4>
              <p className="text-xs text-[var(--color-muted)]">
                Suas sessões salvas aparecerão aqui
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {sessionHistory.map((session) => (
          <div
            key={session.id}
            className={`p-4 rounded-2xl border transition-all ${
              selectedSession === session.id
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-xl bg-[var(--color-secondary)]/10">
                  <Calendar className="h-4 w-4 text-[var(--color-secondary)]" />
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-semibold text-[var(--color-text)] text-sm">
                    {session.name}
                  </h4>
                  <div className="flex items-center gap-4 text-xs text-[var(--color-muted)]">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(session.createdAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(session.duration)}
                    </div>
                  </div>
                  {(() => {
                    const sessionData = loadSession(session.id)
                    if (sessionData) {
                      const filmsCount = sessionData.board?.length || 0
                      const questionsCount = sessionData.board?.reduce((acc, column) => acc + column.tiles.length, 0) || 0
                      const teamsCount = sessionData.teams?.length || 0
                      const totalScore = sessionData.teams?.reduce((acc, team) => acc + (team.score || 0), 0) || 0
                      
                      return (
                        <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-muted)]">
                          {filmsCount > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="font-semibold text-[var(--color-text)]">{filmsCount}</span>
                              <span>filme{filmsCount !== 1 ? 's' : ''}</span>
                            </span>
                          )}
                          {questionsCount > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="font-semibold text-[var(--color-text)]">{questionsCount}</span>
                              <span>pergunta{questionsCount !== 1 ? 's' : ''}</span>
                            </span>
                          )}
                          {teamsCount > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="font-semibold text-[var(--color-text)]">{teamsCount}</span>
                              <span>time{teamsCount !== 1 ? 's' : ''}</span>
                            </span>
                          )}
                          {totalScore > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="font-semibold text-[var(--color-primary)]">{totalScore}</span>
                              <span>pontos</span>
                            </span>
                          )}
                        </div>
                      )
                    }
                    return null
                  })()}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      session.mode === 'demo' 
                        ? 'bg-blue-100 text-blue-700' 
                        : session.mode === 'offline'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {session.mode === 'demo' ? 'Demo' : session.mode === 'offline' ? 'Offline' : 'Online'}
                    </span>
                    {session.isActive && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Ativa
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadSession(session.id)}
                  disabled={session.id === currentSessionId}
                  title={session.id === currentSessionId ? "Esta é a sessão ativa" : "Carregar esta sessão"}
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(session.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleNewSession = () => {
    if (onNewSession) {
      onNewSession();
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Sessões">
      <div className="p-6 space-y-6">
        {/* Botões de Ação */}
        {sessionStatus.hasActiveSession && (
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handleNewSession}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Nova Sessão
            </Button>
            {onResetGame && (
              <Button
                variant="outline"
                onClick={() => {
                  if (onResetGame) {
                    onResetGame();
                  }
                  onClose();
                }}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Resetar Jogo
              </Button>
            )}
          </div>
        )}
        
        {/* Sessão Atual */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Sessão Atual
          </h3>
          {renderCurrentSession()}
        </div>

        {/* Histórico de Sessões */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">
            Sessões Anteriores
          </h3>
          {renderSessionHistory()}
        </div>

        {/* Informações do Modo */}
        <div className="p-4 rounded-2xl bg-[var(--color-secondary)]/5 border border-[var(--color-secondary)]/20">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-[var(--color-secondary)] mt-0.5" />
            <div>
              <h4 className="font-semibold text-[var(--color-text)] text-sm mb-1">
                Modo {gameMode === 'demo' ? 'Demo' : gameMode === 'offline' ? 'Offline' : 'Online'}
              </h4>
              <p className="text-xs text-[var(--color-muted)]">
                {gameMode === 'demo' 
                  ? 'Dados de teste pré-configurados, sem persistência'
                  : gameMode === 'offline'
                  ? 'Dados salvos localmente, não sincronizados com a nuvem'
                  : 'Dados sincronizados com Firebase em tempo real'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <Modal 
          isOpen={true} 
          onClose={() => setShowDeleteConfirm(null)}
          title="Confirmar Exclusão"
        >
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-[var(--color-text)]">
                    Excluir Sessão
                  </h4>
                  <p className="text-sm text-[var(--color-muted)] mt-1">
                    Tem certeza que deseja excluir esta sessão? Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleDeleteSession(showDeleteConfirm)}
                  className="text-red-500 hover:text-red-700"
                >
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

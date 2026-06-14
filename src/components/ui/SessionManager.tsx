import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import {
  Clock,
  History,
  Play,
  Trash2,
  Calendar,
  Settings,
  AlertCircle,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { useOfflineSession } from "../../hooks/useOfflineSession";
import { useGameMode } from "../../hooks/useGameMode";
import { useAuth } from "../../modules/auth/hooks/useAuth";
import { isSupabaseConfigured } from "../../shared/services/supabase.client";
import { CircleUser, LogIn } from "lucide-react";
import { SyncStatusIndicator } from "../../modules/control/ui/SyncStatusIndicator";
import type { CloudSyncStatus } from "../../modules/game/application/useCloudSync";

interface SessionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSession?: (sessionId: string) => void;
  onNewSession?: () => void;
  onResetGame?: () => void;
  /** Abre o painel de conta (login / minhas partidas). Quando ausente, a seção de conta não é exibida. */
  onOpenAccount?: () => void;
  /**
   * Estado real de sincronização da sessão ATIVA com a conta (mesma fonte do
   * indicador do topo). Ausente em demo. Usado para mostrar UM status coerente
   * — em vez de dois indicadores locais redundantes desconectados da nuvem.
   */
  cloudStatus?: CloudSyncStatus;
  /** Abre o histórico de versões da partida atual (T4). Ausente quando indisponível. */
  onOpenVersions?: () => void;
}

export function SessionManager({ isOpen, onClose, onLoadSession, onNewSession, onResetGame, onOpenAccount, cloudStatus, onOpenVersions }: SessionManagerProps) {
  const { gameMode } = useGameMode();
  const { user } = useAuth();
  const supabaseEnabled = isSupabaseConfigured();
  const accountName =
    (user?.user_metadata as Record<string, string> | undefined)?.display_name ??
    user?.email?.split('@')[0] ??
    'Conta';
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
              </div>
            </div>
          </div>
          {/* UM status coerente, na MESMA linguagem do indicador do topo:
              "Salvo neste navegador" / "Salvo na sua conta" / "sincroniza ao
              reconectar". Substitui os dois indicadores locais redundantes que
              confundiam (salvo local) com o backup na nuvem. */}
          {gameMode === 'demo' ? (
            <span className="text-xs text-[var(--color-muted)]">Demonstração · não salva</span>
          ) : (
            <SyncStatusIndicator status={cloudStatus ?? 'local-only'} />
          )}
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
                      {session.mode === 'demo' ? 'Demo' : session.mode === 'offline' ? 'Sessão Local' : 'Online'}
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
        {/* Acesso à conta — login / minhas partidas (só quando o online está disponível) */}
        {supabaseEnabled && onOpenAccount && (
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            {user ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-sm font-semibold uppercase text-[var(--color-primary)]">
                    {accountName.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">Conectado como {accountName}</p>
                    <p className="text-xs text-[var(--color-muted)]">Suas partidas ficam salvas na sua conta.</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => { onClose(); onOpenAccount(); }} className="shrink-0">
                  <CircleUser className="h-4 w-4 mr-2" />
                  Minhas partidas
                </Button>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)]">Entre para sincronizar e gerenciar suas partidas</p>
                  <p className="text-xs text-[var(--color-muted)]">Opcional — suas sessões locais continuam salvas neste navegador.</p>
                </div>
                <Button variant="primary" onClick={() => { onClose(); onOpenAccount(); }} className="shrink-0">
                  <LogIn className="h-4 w-4 mr-2" />
                  Entrar
                </Button>
              </>
            )}
          </div>
        )}

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
        
        {/* Histórico de versões (T4) — só quando disponível (online logado) */}
        {onOpenVersions && sessionStatus.hasActiveSession && (
          <Button variant="outline" onClick={() => { onClose(); onOpenVersions(); }} className="w-full gap-2">
            <History className="h-4 w-4" />
            Histórico de versões
          </Button>
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
                Modo {gameMode === 'demo' ? 'Demo' : gameMode === 'offline' ? 'Sessão Local' : 'Online'}
              </h4>
              <p className="text-xs text-[var(--color-muted)]">
                {gameMode === 'demo'
                  ? 'Dados de teste pré-configurados, sem persistência'
                  : user && supabaseEnabled
                  ? 'Salvo neste navegador e sincronizado com a sua conta.'
                  : supabaseEnabled
                  ? 'Salvo neste navegador. Entre na sua conta para sincronizar.'
                  : 'Dados salvos localmente neste navegador.'
                }
              </p>
              {/* T5 — aviso de aba anônima: o estado vive no localStorage deste
                  navegador; janelas anônimas/privadas o apagam ao fechar. */}
              {gameMode !== 'demo' && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-500">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    Evite janelas anônimas/privadas: elas apagam os dados deste navegador ao fechar
                    {user ? ' — sincronize antes de sair para não perder o progresso.' : '.'}
                  </span>
                </p>
              )}
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

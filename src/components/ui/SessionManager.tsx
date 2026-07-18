import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import {
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
import { useTranslation } from "@/shared/i18n";

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
  /** ISO do último sync bem-sucedido (mesma fonte do indicador do topo). */
  cloudLastSyncedAt?: string | null;
  /** Abre o histórico de versões da partida atual (T4). Ausente quando indisponível. */
  onOpenVersions?: () => void;
  /** Reabre a comparação segura entre este dispositivo e a conta. */
  onReviewSessionSources?: () => void;
}

export function SessionManager({ isOpen, onClose, onLoadSession, onNewSession, onResetGame, onOpenAccount, cloudStatus, cloudLastSyncedAt, onOpenVersions, onReviewSessionSources }: SessionManagerProps) {
  const { t, i18n } = useTranslation(['game', 'common']);
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const { gameMode } = useGameMode();
  const { user } = useAuth();
  const supabaseEnabled = isSupabaseConfigured();
  const accountName =
    (user?.user_metadata as Record<string, string> | undefined)?.display_name ??
    user?.email?.split('@')[0] ??
    t('sessions.accountFallback', { ns: 'game' });
  const { 
    currentSession,
    sessionHistory, 
    getSessionStatus, 
    deleteSession,
    loadSession
  } = useOfflineSession();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const sessionStatus = getSessionStatus();
  const currentSessionId = currentSession?.metadata.id;

  // A sessão ativa já tem card próprio ("Jogando agora") — mantê-la também na
  // lista duplicava o item e gerava o badge contraditório "Ativa" em
  // "Sessões Anteriores".
  const savedSessions = sessionHistory.filter((session) => session.id !== currentSessionId);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // "Última atividade" relativa substitui a antiga "duração", que era
  // calculada como (agora - criação) e crescia para sempre (ex.: "2224h").
  const formatRelative = (iso: string): string => {
    const diffMinutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMinutes < 1) return t('sessions.relativeNow', { ns: 'game' });
    if (diffMinutes < 60) return t('sessions.relativeMinutes', { ns: 'game', count: diffMinutes });
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return t('sessions.relativeHours', { ns: 'game', count: hours });
    const days = Math.floor(hours / 24);
    if (days === 1) return t('sessions.relativeYesterday', { ns: 'game' });
    if (days < 60) return t('sessions.relativeDays', { ns: 'game', count: days });
    return t('sessions.relativeDate', { ns: 'game', date: formatDate(iso) });
  };

  const renderSessionStats = (sessionId: string) => {
    const sessionData = loadSession(sessionId);
    if (!sessionData) return null;

    const questionsCount = sessionData.board?.reduce((acc, column) => acc + column.tiles.length, 0) || 0;
    const teamsCount = sessionData.teams?.length || 0;
    const totalScore = sessionData.teams?.reduce((acc, team) => acc + (team.score || 0), 0) || 0;
    if (teamsCount === 0 && questionsCount === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
        {teamsCount > 0 && (
          <span>
            {t('entities.team', { ns: 'common', count: teamsCount })}
          </span>
        )}
        {questionsCount > 0 && (
          <span>
            {t('entities.question', { ns: 'common', count: questionsCount })}
          </span>
        )}
        {totalScore > 0 && (
          <span>
            {t('sessions.markedPoints', { ns: 'game', points: t('entities.point', { ns: 'common', count: totalScore }) })}
          </span>
        )}
      </div>
    );
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
  };

  const renderCurrentSession = () => {
    if (!sessionStatus.hasActiveSession) {
      return (
        <div className="p-4 rounded-2xl bg-[var(--color-muted)]/5 border border-[var(--color-muted)]/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--color-muted)]" />
            <div>
              <h4 className="font-semibold text-[var(--color-text)] text-sm">
                {t('sessions.noneActive', { ns: 'game' })}
              </h4>
              <p className="text-xs text-[var(--color-muted)]">
                {t('sessions.noneActiveDescription', { ns: 'game' })}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-2xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="p-2 rounded-xl bg-[var(--color-primary)]/10">
              <Play className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <div className="min-w-0">
              <h4 className="truncate font-semibold text-[var(--color-text)] text-sm">
                {sessionStatus.sessionName}
              </h4>
              {currentSession && (
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  {t('sessions.createdAndPlayed', { ns: 'game', date: formatDate(currentSession.metadata.createdAt), relative: formatRelative(currentSession.metadata.lastModified) })}
                </p>
              )}
              {currentSessionId && renderSessionStats(currentSessionId)}
            </div>
          </div>
          {/* UM status coerente, na MESMA linguagem do indicador do topo:
              "Salvo neste navegador" / "Salvo na sua conta" / "sincroniza ao
              reconectar". Substitui os dois indicadores locais redundantes que
              confundiam (salvo local) com o backup na nuvem. */}
          {gameMode === 'demo' ? (
            <span className="shrink-0 text-xs text-[var(--color-muted)]">{t('sessions.demoNoSave', { ns: 'game' })}</span>
          ) : (
            <SyncStatusIndicator status={cloudStatus ?? 'local-only'} lastSyncedAt={cloudLastSyncedAt} />
          )}
        </div>

        {/* Ações que agem SOBRE a sessão atual moram junto dela — soltas no
            topo do modal, não dava para saber a que se referiam. */}
        {(onOpenVersions || onResetGame) && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3">
            {onOpenVersions && (
              <Button variant="outline" size="sm" onClick={() => { onClose(); onOpenVersions(); }} className="gap-1.5">
                <History className="h-3.5 w-3.5" />
                {t('sessions.versions', { ns: 'game' })}
              </Button>
            )}
            {onResetGame && (
              <Button variant="outline" size="sm" onClick={() => { onResetGame(); onClose(); }} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                {t('sessions.reset', { ns: 'game' })}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSessionHistory = () => {
    if (savedSessions.length === 0) {
      return (
        <div className="p-4 rounded-2xl bg-[var(--color-muted)]/5 border border-[var(--color-muted)]/20">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-[var(--color-muted)]" />
            <div>
              <h4 className="font-semibold text-[var(--color-text)] text-sm">
                {t('sessions.noSaved', { ns: 'game' })}
              </h4>
              <p className="text-xs text-[var(--color-muted)]">
                {t('sessions.noSavedDescription', { ns: 'game' })}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {savedSessions.map((session) => (
          <div
            key={session.id}
            className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:border-[var(--color-primary)]/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="p-2 rounded-xl bg-[var(--color-secondary)]/10">
                  <Calendar className="h-4 w-4 text-[var(--color-secondary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-semibold text-[var(--color-text)] text-sm">
                    {session.name}
                  </h4>
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    {t('sessions.createdAndPlayed', { ns: 'game', date: formatDate(session.createdAt), relative: formatRelative(session.lastModified) })}
                  </p>
                  {renderSessionStats(session.id)}
                  {/* Badge de modo só quando difere do modo atual — na lista
                      normal todas são do mesmo modo e o chip vira ruído. */}
                  {session.mode !== gameMode && (
                    <span className="mt-2 inline-block rounded-full bg-[var(--color-muted)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      {session.mode === 'demo' ? t('sessions.modeDemo', { ns: 'game' }) : t('sessions.modeGame', { ns: 'game' })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadSession(session.id)}
                  className="gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  {t('sessions.resume', { ns: 'game' })}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(session.id)}
                  className="text-red-500 hover:text-red-700"
                  aria-label={t('sessions.deleteAria', { ns: 'game', name: session.name })}
                  title={t('sessions.deleteTitle', { ns: 'game' })}
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
    <Modal isOpen={isOpen} onClose={onClose} title={t('sessions.managerTitle', { ns: 'game' })}>
      <div className="p-6 space-y-6">
        {/* 1. O que está acontecendo AGORA — sempre em primeiro */}
        <section>
          <h3 className="text-base font-semibold text-[var(--color-text)] mb-3">
            {t('sessions.playingNow', { ns: 'game' })}
          </h3>
          {renderCurrentSession()}
        </section>

        {/* 2. Ação primária, com a consequência explicada ao lado */}
        {sessionStatus.hasActiveSession && (
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text)]">{t('sessions.startNew', { ns: 'game' })}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {t('sessions.startNewDescription', { ns: 'game' })}
              </p>
            </div>
            <Button variant="primary" onClick={handleNewSession} className="shrink-0">
              <Play className="h-4 w-4 mr-2" />
              {t('sessions.newGame', { ns: 'game' })}
            </Button>
          </div>
        )}

        {/* 3. Sessões guardadas para retomar */}
        <section>
          <h3 className="text-base font-semibold text-[var(--color-text)] mb-3">
            {t('sessions.saved', { ns: 'game' })}{savedSessions.length > 0 ? ` (${savedSessions.length})` : ''}
          </h3>
          {renderSessionHistory()}
        </section>

        {/* 4. Conta — contexto de sincronização quando o Supabase está disponível. */}
        {supabaseEnabled && onOpenAccount && (
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            {user ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-sm font-semibold uppercase text-[var(--color-primary)]">
                    {accountName.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">{t('sessions.signedInAs', { ns: 'game', name: accountName })}</p>
                    <p className="text-xs text-[var(--color-muted)]">{t('sessions.accountSaved', { ns: 'game' })}</p>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  {onReviewSessionSources ? (
                    <Button variant="outline" onClick={() => { onClose(); onReviewSessionSources(); }} className="min-h-11 shrink-0">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('sessions.compareSources', { ns: 'game' })}
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={() => { onClose(); onOpenAccount(); }} className="min-h-11 shrink-0">
                    <CircleUser className="h-4 w-4 mr-2" />
                    {t('sessions.myGames', { ns: 'game' })}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{t('sessions.signInTitle', { ns: 'game' })}</p>
                  <p className="text-xs text-[var(--color-muted)]">{t('sessions.signInDescription', { ns: 'game' })}</p>
                </div>
                <Button variant="primary" onClick={() => { onClose(); onOpenAccount(); }} className="shrink-0">
                  <LogIn className="h-4 w-4 mr-2" />
                  {t('sessions.signIn', { ns: 'game' })}
                </Button>
              </>
            )}
          </div>
        )}

        {/* 5. Onde o jogo fica salvo + aviso de aba anônima (T5) */}
        <div className="p-4 rounded-2xl bg-[var(--color-secondary)]/5 border border-[var(--color-secondary)]/20">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-[var(--color-secondary)] mt-0.5" />
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-[var(--color-text)] text-sm mb-1">
                {t('sessions.storageTitle', { ns: 'game' })}
              </h4>
              <p className="text-xs leading-relaxed text-[var(--color-muted)]">
                {gameMode === 'demo'
                  ? t('sessions.storageDemo', { ns: 'game' })
                  : user && supabaseEnabled
                  ? t('sessions.storageSynced', { ns: 'game' })
                  : supabaseEnabled
                  ? t('sessions.storageAccountAvailable', { ns: 'game' })
                  : t('sessions.storageLocal', { ns: 'game' })
                }
              </p>
              {/* T5 — aviso de aba anônima em caixa própria: texto solto em
                  âmbar ficava ilegível nos temas claros. */}
              {gameMode !== 'demo' && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <p className="text-xs leading-relaxed text-amber-600">
                    {user ? t('sessions.privateWindowSignedIn', { ns: 'game' }) : t('sessions.privateWindowLocal', { ns: 'game' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <Button variant="outline" onClick={onClose}>
            {t('actions.close', { ns: 'common' })}
          </Button>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteConfirm(null)}
          title={t('sessions.deleteDialogTitle', { ns: 'game' })}
        >
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                  {t('sessions.deleteDescription', { ns: 'game', name: savedSessions.find((s) => s.id === showDeleteConfirm)?.name ?? t('sessions.deleteFallback', { ns: 'game' }) })}
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  {t('actions.cancel', { ns: 'common' })}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDeleteSession(showDeleteConfirm)}
                  className="border-red-500/40 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('sessions.deleteDialogTitle', { ns: 'game' })}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

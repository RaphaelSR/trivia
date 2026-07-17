import { Cloud, History, RotateCcw, Loader2, Undo2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { countAnsweredTiles, countTotalTiles } from "../../modules/game/domain/board.utils";
import type { SessionSnapshot } from "../../modules/game/infrastructure/session-snapshot.service";
import type { SessionCheckpoint } from "../../modules/game/infrastructure/session-checkpoint.service";
import type { TriviaSession } from "../../modules/trivia/types";
import { useTranslation } from "@/shared/i18n";

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: SessionSnapshot[];
  loading: boolean;
  onRestore: (snapshot: SessionSnapshot) => void;
  /** Checkpoints locais por jogada (mais recente primeiro). */
  checkpoints: SessionCheckpoint[];
  onRestoreCheckpoint: (checkpoint: SessionCheckpoint) => void;
  /** Se o backup na nuvem está ativo (logado + Supabase). Muda o texto da seção. */
  cloudAvailable: boolean;
}

function formatStamp(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function summarize(session: TriviaSession, format: (answered: number, total: number, points: number) => string): string {
  const answered = countAnsweredTiles(session.board ?? []);
  const total = countTotalTiles(session.board ?? []);
  const score = (session.teams ?? []).reduce((sum, t) => sum + (t.score || 0), 0);
  return format(answered, total, score);
}

/**
 * Histórico de versões da partida em duas camadas:
 * - Checkpoints LOCAIS por jogada ("Antes de responder X") — precisos,
 *   funcionam offline e deslogado; guardados neste navegador.
 * - Snapshots na NUVEM (T4) — periódicos, atrelados à conta; sobrevivem a
 *   troca de navegador/aparelho.
 * Restaurar substitui o estado atual pela versão escolhida (o estado que
 * estava valendo vira um checkpoint "Antes de restaurar uma versão").
 */
export function VersionHistoryModal({
  isOpen,
  onClose,
  snapshots,
  loading,
  onRestore,
  checkpoints,
  onRestoreCheckpoint,
  cloudAvailable,
}: VersionHistoryModalProps) {
  const { t, i18n } = useTranslation(['game', 'common']);
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const summarizeSession = (session: TriviaSession) => summarize(
    session,
    (answered, total, points) => t('versions.summary', { ns: 'game', answered, total, points }),
  );
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('versions.title', { ns: 'game' })}>
      <div className="space-y-5 p-6">
        <p className="text-sm text-[var(--color-muted)]">
          {t('versions.description', { ns: 'game' })}
        </p>

        {/* Seção 1 — checkpoints por jogada (locais) */}
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
            <Undo2 className="h-4 w-4 text-[var(--color-primary)]" />
            {t('versions.undoMove', { ns: 'game' })}
          </h3>
          {checkpoints.length === 0 ? (
            <p className="rounded-2xl border border-[var(--color-muted)]/20 bg-[var(--color-muted)]/5 p-3 text-xs text-[var(--color-muted)]">
              {t('versions.noCheckpoints', { ns: 'game' })}
            </p>
          ) : (
            <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {checkpoints.map((checkpoint, index) => (
                <li
                  key={checkpoint.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                      {checkpoint.label}
                      {index === 0 && (
                        <span className="ml-2 rounded-full bg-[var(--color-primary)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                          {t('versions.lastMove', { ns: 'game' })}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                      {formatStamp(checkpoint.createdAt, locale)} · {summarizeSession(checkpoint.session)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRestoreCheckpoint(checkpoint)}
                    className="shrink-0 gap-1.5"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('actions.back', { ns: 'common' })}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Seção 2 — snapshots na nuvem (T4) */}
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
            <Cloud className="h-4 w-4 text-[var(--color-primary)]" />
            {t('versions.cloudBackups', { ns: 'game' })}
          </h3>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--color-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('versions.loading', { ns: 'game' })}
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-muted)]/20 bg-[var(--color-muted)]/5 p-3">
              <History className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
              <p className="text-xs text-[var(--color-muted)]">
                {cloudAvailable
                  ? t('versions.cloudReady', { ns: 'game' })
                  : t('versions.cloudSignIn', { ns: 'game' })}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {snapshots.map((snap, index) => (
                <li
                  key={snap.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      {formatStamp(snap.createdAt, locale)}
                      {index === 0 && (
                        <span className="ml-2 rounded-full bg-[var(--color-primary)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                          {t('versions.latest', { ns: 'game' })}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">{summarizeSession(snap.session)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onRestore(snap)} className="shrink-0 gap-1.5">
                    <RotateCcw className="h-4 w-4" />
                    {t('actions.restore', { ns: 'common' })}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex justify-end border-t border-[var(--color-border)] pt-4">
          <Button variant="outline" onClick={onClose}>
            {t('actions.close', { ns: 'common' })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

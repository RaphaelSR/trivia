import { Cloud, History, RotateCcw, Loader2, Undo2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { countAnsweredTiles, countTotalTiles } from "../../modules/game/domain/board.utils";
import type { SessionSnapshot } from "../../modules/game/infrastructure/session-snapshot.service";
import type { SessionCheckpoint } from "../../modules/game/infrastructure/session-checkpoint.service";
import type { TriviaSession } from "../../modules/trivia/types";

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

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function summarize(session: TriviaSession): string {
  const answered = countAnsweredTiles(session.board ?? []);
  const total = countTotalTiles(session.board ?? []);
  const score = (session.teams ?? []).reduce((sum, t) => sum + (t.score || 0), 0);
  return `${answered}/${total} respondidas · ${score} pts`;
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
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Histórico de versões">
      <div className="space-y-5 p-6">
        <p className="text-sm text-[var(--color-muted)]">
          Volte o jogo para antes de uma jogada específica, ou restaure um backup automático. O
          estado atual não se perde: ele vira um checkpoint "antes de restaurar".
        </p>

        {/* Seção 1 — checkpoints por jogada (locais) */}
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
            <Undo2 className="h-4 w-4 text-[var(--color-primary)]" />
            Voltar uma jogada
          </h3>
          {checkpoints.length === 0 ? (
            <p className="rounded-2xl border border-[var(--color-muted)]/20 bg-[var(--color-muted)]/5 p-3 text-xs text-[var(--color-muted)]">
              Cada jogada — e ações como remover filme, importar ou resetar — cria um ponto de retorno aqui, guardado neste navegador.
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
                          última jogada
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                      {formatStamp(checkpoint.createdAt)} · {summarize(checkpoint.session)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRestoreCheckpoint(checkpoint)}
                    className="shrink-0 gap-1.5"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Voltar
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
            Backups na nuvem
          </h3>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--color-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando versões…
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-muted)]/20 bg-[var(--color-muted)]/5 p-3">
              <History className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
              <p className="text-xs text-[var(--color-muted)]">
                {cloudAvailable
                  ? 'Backups são criados automaticamente a cada poucos minutos enquanto você joga.'
                  : 'Entre na sua conta para ter backups automáticos que sobrevivem a troca de navegador.'}
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
                      {formatStamp(snap.createdAt)}
                      {index === 0 && (
                        <span className="ml-2 rounded-full bg-[var(--color-primary)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                          mais recente
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">{summarize(snap.session)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onRestore(snap)} className="shrink-0 gap-1.5">
                    <RotateCcw className="h-4 w-4" />
                    Restaurar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex justify-end border-t border-[var(--color-border)] pt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

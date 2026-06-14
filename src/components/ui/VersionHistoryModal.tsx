import { History, RotateCcw, Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { countAnsweredTiles, countTotalTiles } from "../../modules/game/domain/board.utils";
import type { SessionSnapshot } from "../../modules/game/infrastructure/session-snapshot.service";

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: SessionSnapshot[];
  loading: boolean;
  onRestore: (snapshot: SessionSnapshot) => void;
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

/**
 * Lista os snapshots (versões) salvos de uma partida e permite restaurar
 * qualquer um. As versões vêm do histórico na nuvem (T4); a mais recente fica
 * no topo. Restaurar substitui o estado atual pela versão escolhida.
 */
export function VersionHistoryModal({ isOpen, onClose, snapshots, loading, onRestore }: VersionHistoryModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Histórico de versões">
      <div className="space-y-4 p-6">
        <p className="text-sm text-[var(--color-muted)]">
          Pontos salvos automaticamente desta partida. Restaurar volta o jogo para a versão escolhida —
          a versão atual é substituída.
        </p>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--color-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando versões…
          </div>
        ) : snapshots.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-muted)]/20 bg-[var(--color-muted)]/5 p-4">
            <History className="h-5 w-5 text-[var(--color-muted)]" />
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text)]">Nenhuma versão ainda</h4>
              <p className="text-xs text-[var(--color-muted)]">
                As versões são salvas automaticamente enquanto você joga conectado à sua conta.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {snapshots.map((snap, index) => {
              const answered = countAnsweredTiles(snap.session.board ?? []);
              const total = countTotalTiles(snap.session.board ?? []);
              const score = (snap.session.teams ?? []).reduce((sum, t) => sum + (t.score || 0), 0);
              const films = snap.session.board?.length ?? 0;
              return (
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
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                      {answered}/{total} respondidas · {score} pts · {films} filme{films !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onRestore(snap)} className="shrink-0 gap-1.5">
                    <RotateCcw className="h-4 w-4" />
                    Restaurar
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-end border-t border-[var(--color-border)] pt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

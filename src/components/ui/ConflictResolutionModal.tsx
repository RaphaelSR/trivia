import { HardDrive, Cloud, AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { countAnsweredTiles, countTotalTiles } from "../../modules/game/domain/board.utils";
import type { CloudSyncConflict } from "../../modules/game/application/useCloudSync";
import type { TriviaSession } from "../../modules/trivia/types";

interface ConflictResolutionModalProps {
  isOpen: boolean;
  conflict: CloudSyncConflict | null;
  /** O usuário escolheu qual versão manter. */
  onChoose: (which: "local" | "cloud") => void;
}

type VersionSummary = {
  answered: number;
  total: number;
  films: number;
  score: number;
  lastPlay: string | null;
  updatedAt: string | null;
};

function summarize(session: TriviaSession, updatedAt: string | null): VersionSummary {
  const events = session.eventLog ?? [];
  const last = events.length > 0 ? events[events.length - 1] : undefined;
  return {
    answered: countAnsweredTiles(session.board ?? []),
    total: countTotalTiles(session.board ?? []),
    films: session.board?.length ?? 0,
    score: (session.teams ?? []).reduce((sum, team) => sum + (team.score || 0), 0),
    lastPlay: last?.timestamp ?? null,
    updatedAt,
  };
}

function formatStamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VersionCard({
  title,
  icon,
  summary,
  onChoose,
  buttonLabel,
}: {
  title: string;
  icon: React.ReactNode;
  summary: VersionSummary;
  onChoose: () => void;
  buttonLabel: string;
}) {
  const rows: Array<[string, string]> = [
    ["Respondidas", `${summary.answered} de ${summary.total}`],
    ["Placar", `${summary.score} pts`],
    ["Filmes", String(summary.films)],
    ["Última jogada", formatStamp(summary.lastPlay)],
    ["Atualizada", formatStamp(summary.updatedAt)],
  ];

  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
        {icon}
        {title}
      </div>
      <dl className="space-y-1.5 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="text-[var(--color-muted)]">{label}</dt>
            <dd className="font-medium text-[var(--color-text)]">{value}</dd>
          </div>
        ))}
      </dl>
      <Button variant="primary" onClick={onChoose} className="mt-4">
        {buttonLabel}
      </Button>
    </div>
  );
}

/**
 * Mostra as DUAS versões divergentes da mesma partida (deste aparelho x da
 * conta) com um resumo de cada uma, e deixa o usuário escolher qual manter.
 * Aberto apenas quando o reconcile detecta um conflito ambíguo.
 */
export function ConflictResolutionModal({ isOpen, conflict, onChoose }: ConflictResolutionModalProps) {
  if (!conflict) return null;

  const local = summarize(conflict.localSession, conflict.localUpdatedAt);
  const cloud = summarize(conflict.cloudSession, conflict.cloudUpdatedAt);

  return (
    <Modal isOpen={isOpen} onClose={() => onChoose("local")} title="Duas versões desta partida">
      <div className="space-y-5 p-6">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm text-[var(--color-text)]">
            Encontramos versões diferentes desta partida neste aparelho e na sua conta.
            Escolha qual delas continuar — a outra será substituída.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <VersionCard
            title="Neste aparelho"
            icon={<HardDrive className="h-4 w-4 text-[var(--color-primary)]" />}
            summary={local}
            onChoose={() => onChoose("local")}
            buttonLabel="Usar a deste aparelho"
          />
          <VersionCard
            title="Na sua conta"
            icon={<Cloud className="h-4 w-4 text-[var(--color-primary)]" />}
            summary={cloud}
            onChoose={() => onChoose("cloud")}
            buttonLabel="Usar a da conta"
          />
        </div>

        <p className="text-center text-xs text-[var(--color-muted)]">
          Dica: normalmente a versão com mais "respondidas" é a partida mais avançada.
        </p>
      </div>
    </Modal>
  );
}

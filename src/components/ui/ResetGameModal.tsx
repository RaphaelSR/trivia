import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface ResetOptions {
  teams: boolean;
  participants: boolean;
  questions: boolean;
  themes: boolean;
  points: boolean;
  films: boolean;
}

interface ResetGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: (options: ResetOptions) => void;
}

export function ResetGameModal({
  isOpen,
  onClose,
  onConfirmReset,
}: ResetGameModalProps) {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [resetOptions, setResetOptions] = useState<ResetOptions>({
    teams: false,
    participants: false,
    questions: true, // Perguntas marcadas por padrão
    themes: false,
    points: true, // Pontos marcados por padrão
    films: false,
  });

  const handlePinSubmit = () => {
    // Verifica se o PIN está correto
    const storedPin = localStorage.getItem("trivia-pin-offline");
    if (pin === storedPin) {
      setIsPinVerified(true);
      setPinError("");
    } else {
      setPinError("PIN incorreto. Tente novamente.");
    }
  };

  const handleToggleOption = (option: keyof ResetOptions) => {
    setResetOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  const handleConfirm = () => {
    // Verifica se pelo menos uma opção está marcada
    if (!Object.values(resetOptions).some((value) => value)) {
      setPinError("Selecione pelo menos uma opção para resetar.");
      return;
    }

    onConfirmReset(resetOptions);
    handleClose();
  };

  const handleClose = () => {
    setPin("");
    setPinError("");
    setIsPinVerified(false);
    setResetOptions({
      teams: false,
      participants: false,
      questions: true,
      themes: false,
      points: true,
      films: false,
    });
    onClose();
  };

  const resetAllOptions = () => {
    setResetOptions({
      teams: true,
      participants: true,
      questions: true,
      themes: true,
      points: true,
      films: true,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Resetar Jogo"
      description="Escolha quais elementos deseja resetar. Esta ação não pode ser desfeita."
    >
      <div className="space-y-6">
        {!isPinVerified ? (
          // Etapa 1: Verificação de PIN
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-[var(--color-danger)] mt-0.5" />
                <div>
                  <h4 className="font-semibold text-[var(--color-text)] text-sm mb-1">
                    Ação Irreversível
                  </h4>
                  <p className="text-xs text-[var(--color-muted)]">
                    Para proteger seus dados, insira o PIN de segurança para continuar.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                PIN de Segurança
              </label>
              <input
                type="password"
                placeholder="Digite o PIN"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setPinError("");
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handlePinSubmit();
                  }
                }}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              {pinError && (
                <p className="text-sm text-[var(--color-danger)] mt-2">{pinError}</p>
              )}
            </div>

            <Button onClick={handlePinSubmit} className="w-full" variant="primary">
              Verificar PIN
            </Button>
          </div>
        ) : (
          // Etapa 2: Seleção de opções de reset
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">
                O que deseja resetar?
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllOptions}
                className="text-xs"
              >
                Selecionar Tudo
              </Button>
            </div>

            <div className="space-y-3">
              {/* Pontos */}
              <label className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                <div>
                  <h4 className="font-semibold text-[var(--color-text)] text-sm">
                    Pontuação
                  </h4>
                  <p className="text-xs text-[var(--color-muted)]">
                    Zerar pontos de todos os times e participantes
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={resetOptions.points}
                  onChange={() => handleToggleOption("points")}
                  className="h-5 w-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
              </label>

              {/* Perguntas */}
              <label className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                <div>
                  <h4 className="font-semibold text-[var(--color-text)] text-sm">
                    Perguntas
                  </h4>
                  <p className="text-xs text-[var(--color-muted)]">
                    Remove TODAS as perguntas (mantém os filmes vazios)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={resetOptions.questions}
                  onChange={() => handleToggleOption("questions")}
                  className="h-5 w-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
              </label>

              {/* Filmes */}
              <label className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                <div>
                  <h4 className="font-semibold text-[var(--color-text)] text-sm">
                    Filmes/Colunas
                  </h4>
                  <p className="text-xs text-[var(--color-muted)]">
                    Remove todos os filmes E suas perguntas do tabuleiro
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={resetOptions.films}
                  onChange={() => handleToggleOption("films")}
                  className="h-5 w-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
              </label>

              {/* Times */}
              <label className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                <div>
                  <h4 className="font-semibold text-[var(--color-text)] text-sm">
                    Times
                  </h4>
                  <p className="text-xs text-[var(--color-muted)]">
                    Remover todos os times (cria sessão em branco)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={resetOptions.teams}
                  onChange={() => handleToggleOption("teams")}
                  className="h-5 w-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
              </label>

              {/* Participantes */}
              <label className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                <div>
                  <h4 className="font-semibold text-[var(--color-text)] text-sm">
                    Participantes
                  </h4>
                  <p className="text-xs text-[var(--color-muted)]">
                    Remover todos os participantes dos times
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={resetOptions.participants}
                  onChange={() => handleToggleOption("participants")}
                  className="h-5 w-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
              </label>

              {/* Temas */}
              <label className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] cursor-pointer hover:bg-[var(--color-surface)] transition-colors">
                <div>
                  <h4 className="font-semibold text-[var(--color-text)] text-sm">
                    Tema Visual
                  </h4>
                  <p className="text-xs text-[var(--color-muted)]">
                    Voltar para o tema padrão (claro)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={resetOptions.themes}
                  onChange={() => handleToggleOption("themes")}
                  className="h-5 w-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
              </label>
            </div>

            {pinError && (
              <p className="text-sm text-[var(--color-danger)] mt-2">{pinError}</p>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90"
              >
                <RefreshCw className="h-4 w-4" />
                Confirmar Reset
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}


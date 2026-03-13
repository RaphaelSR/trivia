import { useState } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { usePinManagement } from '../../hooks/usePinManagement'

interface ResetOptions {
  teams: boolean
  participants: boolean
  questions: boolean
  themes: boolean
  points: boolean
  films: boolean
}

interface ResetGameModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmReset: (options: ResetOptions) => void
}

export function ResetGameModal({
  isOpen,
  onClose,
  onConfirmReset,
}: ResetGameModalProps) {
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isPinVerified, setIsPinVerified] = useState(false)
  const [resetOptions, setResetOptions] = useState<ResetOptions>({
    teams: false,
    participants: false,
    questions: true,
    themes: false,
    points: true,
    films: false,
  })
  const { verifyPin } = usePinManagement()

  const handlePinSubmit = () => {
    if (verifyPin(pin)) {
      setIsPinVerified(true)
      setPinError('')
      return
    }

    setPinError('PIN incorreto. Tente novamente.')
  }

  const handleToggleOption = (option: keyof ResetOptions) => {
    setResetOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }))
  }

  const handleConfirm = () => {
    if (!Object.values(resetOptions).some(Boolean)) {
      setPinError('Selecione pelo menos uma opção para resetar.')
      return
    }

    onConfirmReset(resetOptions)
    handleClose()
  }

  const handleClose = () => {
    setPin('')
    setPinError('')
    setIsPinVerified(false)
    setResetOptions({
      teams: false,
      participants: false,
      questions: true,
      themes: false,
      points: true,
      films: false,
    })
    onClose()
  }

  const resetAllOptions = () => {
    setResetOptions({
      teams: true,
      participants: true,
      questions: true,
      themes: true,
      points: true,
      films: true,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Resetar Jogo"
      description="Escolha quais elementos deseja resetar. Esta ação não pode ser desfeita."
    >
      <div className="space-y-6">
        {!isPinVerified ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-[var(--color-danger)]" />
                <div>
                  <h4 className="mb-1 text-sm font-semibold text-[var(--color-text)]">
                    Ação Irreversível
                  </h4>
                  <p className="text-xs text-[var(--color-muted)]">
                    Para proteger seus dados, insira o PIN de segurança para continuar.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--color-text)]">
                PIN de Segurança
              </label>
              <input
                type="password"
                placeholder="Digite o PIN"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value)
                  setPinError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePinSubmit()
                  }
                }}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              {pinError && <p className="mt-2 text-sm text-[var(--color-danger)]">{pinError}</p>}
            </div>

            <Button onClick={handlePinSubmit} className="w-full" variant="primary">
              Verificar PIN
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">O que deseja resetar?</h3>
              <Button variant="ghost" size="sm" onClick={resetAllOptions} className="text-xs">
                Selecionar Tudo
              </Button>
            </div>

            <div className="space-y-3">
              {[
                ['points', 'Pontuação', 'Zerar pontos de todos os times e participantes'],
                ['questions', 'Perguntas', 'Remove todas as perguntas mantendo apenas a estrutura do jogo'],
                ['films', 'Filmes/Colunas', 'Remove todos os filmes e suas perguntas do tabuleiro'],
                ['teams', 'Times', 'Remove todos os times e deixa a sessão em branco'],
                ['participants', 'Participantes', 'Remove todos os participantes dos times'],
                ['themes', 'Tema Visual', 'Voltar para o tema padrão escuro'],
              ].map(([key, title, description]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 transition-colors hover:bg-[var(--color-surface)]"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--color-text)]">{title}</h4>
                    <p className="text-xs text-[var(--color-muted)]">{description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={resetOptions[key as keyof ResetOptions]}
                    onChange={() => handleToggleOption(key as keyof ResetOptions)}
                    className="h-5 w-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                </label>
              ))}
            </div>

            {pinError && <p className="mt-2 text-sm text-[var(--color-danger)]">{pinError}</p>}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                className="flex flex-1 items-center justify-center gap-2 bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90"
              >
                <RefreshCw className="h-4 w-4" />
                Confirmar Reset
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

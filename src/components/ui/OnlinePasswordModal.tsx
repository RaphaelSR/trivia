import { useState } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'
import { Lock, AlertCircle } from 'lucide-react'

interface OnlinePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const ONLINE_PASSWORD = 'password123'

export function OnlinePasswordModal({ isOpen, onClose, onSuccess }: OnlinePasswordModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (password === ONLINE_PASSWORD) {
      setError('')
      setPassword('')
      onSuccess()
      onClose()
    } else {
      setError('Senha incorreta. Tente novamente.')
    }
  }

  const handleClose = () => {
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Acesso ao Modo Online"
      description="O modo online está em desenvolvimento. Digite a senha para acessar."
    >
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-[var(--color-text)] text-sm mb-1">
                Modo em Desenvolvimento
              </h4>
              <p className="text-xs text-[var(--color-muted)]">
                O modo online ainda não está disponível. Use a senha de acesso temporário para testar.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
            Senha de Acesso
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-muted)]" />
            <input
              type="password"
              placeholder="Digite a senha"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit()
                }
              }}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-4 py-2 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!password.trim()}
            className="flex-1"
          >
            Acessar
          </Button>
        </div>
      </div>
    </Modal>
  )
}


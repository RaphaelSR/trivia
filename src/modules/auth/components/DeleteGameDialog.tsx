/**
 * DeleteGameDialog — diálogo de confirmação por senha para excluir uma partida.
 *
 * Fluxo:
 *  1. Exibe o título da partida a ser excluída e um aviso de permanência.
 *  2. Pede a senha do usuário.
 *  3. Ao confirmar: verifyPassword(senha) → se falso, exibe erro.
 *     Se verdadeiro, chama deleteNormalizedGame(gameId) → fecha e dispara onSuccess.
 */

import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { verifyPassword } from '../services/auth.service'
import { deleteNormalizedGame } from '../services/normalized-history.service'

interface DeleteGameDialogProps {
  gameId: string
  gameTitle: string
  onClose: () => void
  onSuccess: () => void
}

export function DeleteGameDialog({ gameId, gameTitle, onClose, onSuccess }: DeleteGameDialogProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (!password.trim()) {
      setError('Digite sua senha para confirmar.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const valid = await verifyPassword(password)
      if (!valid) {
        setError('Senha incorreta.')
        setLoading(false)
        return
      }

      const { error: deleteError } = await deleteNormalizedGame(gameId)
      if (deleteError) {
        setError(deleteError)
        setLoading(false)
        return
      }

      onSuccess()
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-game-title"
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-black/70 p-6 shadow-2xl backdrop-blur-xl"
      >
        {/* Botão fechar */}
        <button
          aria-label="Fechar"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)] disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Ícone + título */}
        <div className="mb-4 flex flex-col items-center gap-2 pt-1 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
            <Trash2 className="h-5 w-5 text-red-400" />
          </div>
          <p id="delete-game-title" className="text-sm font-semibold text-[var(--color-text)]">
            Excluir partida
          </p>
        </div>

        {/* Aviso */}
        <p className="mb-1 text-xs leading-relaxed text-[var(--color-muted)]">
          Você está prestes a excluir permanentemente a partida:
        </p>
        <p className="mb-3 truncate rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-xs font-medium text-[var(--color-text)]">
          {gameTitle}
        </p>
        <p className="mb-4 text-xs leading-relaxed text-[var(--color-muted)]">
          Esta ação <strong className="text-[var(--color-text)]">não pode ser desfeita</strong>. Times, participantes, perguntas e histórico serão removidos definitivamente.
        </p>

        {/* Campo de senha */}
        <div className="mb-3">
          <label className="mb-1 block text-xs text-[var(--color-muted)]">
            Confirme sua senha
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) void handleConfirm()
            }}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-none transition-colors focus:border-red-500/40 focus:bg-white/8 disabled:opacity-50"
          />
        </div>

        {/* Erro */}
        {error && (
          <p
            role="alert"
            className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400"
          >
            {error}
          </p>
        )}

        {/* Ações */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-[var(--color-muted)] transition-colors hover:border-white/20 hover:text-[var(--color-text)] disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={loading || !password.trim()}
            className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

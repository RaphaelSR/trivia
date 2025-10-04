import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import type { ReactNode } from 'react'

if (typeof document !== 'undefined' && !document.getElementById('trivia-portal')) {
  const portalRoot = document.createElement('div')
  portalRoot.id = 'trivia-portal'
  document.body.appendChild(portalRoot)
}

type ModalProps = {
  isOpen: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
}

export function Modal({ isOpen, title, description, children, onClose }: ModalProps) {
  if (!isOpen) return null

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="card-surface max-h-[85vh] w-full max-w-xl overflow-hidden rounded-3xl">
        <div className="flex items-start justify-between px-6 pt-6">
          <div className="space-y-1 pr-4">
            <h2 className="text-2xl font-semibold text-[var(--color-text)]">{title}</h2>
            {description ? <p className="text-sm text-[var(--color-muted)]">{description}</p> : null}
          </div>
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        <div className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto px-6 pb-6 pr-8">{children}</div>
      </div>
    </div>
  )

  const portalRoot = document.getElementById('trivia-portal')
  if (!portalRoot) {
    return content
  }
  return createPortal(content, portalRoot)
}

/**
 * ShareChannels — botões de compartilhamento reutilizáveis.
 *
 * Usado por:
 *  - InviteShare (convite por participante, ?token=)
 *  - GameDetailView (convite genérico da sessão, ?game=)
 *
 * Props:
 *  - url   — a URL completa a ser compartilhada / copiada
 *  - label — texto descritivo curto (ex. "de Bob", "da sessão") para aria-labels
 */

import { useState, useRef } from 'react'
import { Copy, Check, Mail, QrCode } from 'lucide-react'

interface ShareChannelsProps {
  url: string
  label: string
}

function buildInviteMessage(url: string): string {
  return `Reivindique sua participação no Trivia: ${url}`
}

export function ShareChannels({ url, label }: ShareChannelsProps) {
  const [copied, setCopied] = useState(false)
  const [showFallbackInput, setShowFallbackInput] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const fallbackInputRef = useRef<HTMLInputElement>(null)

  const message = buildInviteMessage(url)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setShowFallbackInput(true)
      setTimeout(() => {
        fallbackInputRef.current?.select()
      }, 50)
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`
  const mailHref = `mailto:?subject=${encodeURIComponent('Convite Trivia')}&body=${encodeURIComponent(message)}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`

  return (
    <div className="flex flex-col gap-2">
      {/* Botões */}
      <div className="flex flex-wrap gap-1.5">
        {/* Copiar */}
        <button
          type="button"
          onClick={() => void handleCopy()}
          aria-label={`Copiar link ${label}`}
          className={[
            'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors',
            copied
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-white/10 bg-white/5 text-[var(--color-text)] hover:bg-white/10',
          ].join(' ')}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" aria-hidden="true" />
              Copiado ✓
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden="true" />
              Copiar link
            </>
          )}
        </button>

        {/* WhatsApp */}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Compartilhar convite ${label} pelo WhatsApp`}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text)] transition-colors hover:bg-white/10"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3 w-3 shrink-0 fill-current text-green-400"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp
        </a>

        {/* E-mail */}
        <a
          href={mailHref}
          aria-label={`Compartilhar convite ${label} por e-mail`}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text)] transition-colors hover:bg-white/10"
        >
          <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
          E-mail
        </a>

        {/* Toggle QR */}
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          aria-label={showQr ? 'Ocultar QR Code' : `Mostrar QR Code ${label}`}
          aria-expanded={showQr}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text)] transition-colors hover:bg-white/10"
        >
          <QrCode className="h-3 w-3 shrink-0" aria-hidden="true" />
          QR
        </button>
      </div>

      {/* Input fallback para clipboard indisponível */}
      {showFallbackInput && (
        <div className="flex items-center gap-1.5">
          <input
            ref={fallbackInputRef}
            readOnly
            value={url}
            aria-label="URL do convite (selecione e copie)"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-mono text-[var(--color-muted)] outline-none"
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}

      {/* QR Code — gerado somente quando o usuário clica "QR", evitando
          requisições automáticas. Serviço externo: api.qrserver.com (gratuito). */}
      {showQr && (
        <div className="flex flex-col items-center gap-1 pt-1">
          <img
            src={qrSrc}
            alt={`QR Code do convite ${label}`}
            width={160}
            height={160}
            loading="lazy"
            className="rounded-lg border border-white/10 bg-white p-1"
          />
          <p className="text-[9px] text-[var(--color-muted)]">
            Aponte a câmera para escanear
          </p>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useTranslation } from '@/shared/i18n'

type LocalQrCodeProps = {
  value: string
  label: string
  size?: number
}

/**
 * QR gerado integralmente no navegador. O token nunca e enviado a um servico
 * externo; a imagem final e um data URL SVG produzido pela biblioteca local.
 */
export function LocalQrCode({ value, label, size = 180 }: LocalQrCodeProps) {
  const { t } = useTranslation('common')
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setSrc(null)
    setFailed(false)

    void import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toString(value, {
          type: 'svg',
          width: size,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#111827', light: '#ffffff' },
        }),
      )
      .then((svg) => {
        if (!cancelled) {
          setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [size, value])

  if (failed) {
    return (
      <p role="status" className="text-center text-xs text-[var(--color-muted)]">
        {t('qrCode.failed')}
      </p>
    )
  }

  if (!src) {
    return (
      <div
        role="status"
        aria-label={t('qrCode.generating')}
        className="animate-pulse rounded-lg bg-white/10"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <img
      src={src}
      alt={label}
      width={size}
      height={size}
      className="max-w-full rounded-lg border border-white/10 bg-white p-1"
    />
  )
}

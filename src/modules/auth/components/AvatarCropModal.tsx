import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Loader2, Minus, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  calculateAvatarCrop,
  DEFAULT_AVATAR_CROP,
  normalizeAvatarCrop,
  PROFILE_AVATAR_MAX_ZOOM,
  type AvatarCrop,
} from '../services/profile-avatar.service'
import { useTranslation } from '@/shared/i18n'

type AvatarCropModalProps = {
  file: File
  busy: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: (crop: AvatarCrop) => void
}

type ImageDimensions = {
  width: number
  height: number
}

export function AvatarCropModal({ file, busy, error, onCancel, onConfirm }: AvatarCropModalProps) {
  const { t } = useTranslation(['auth', 'common'])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const pointerRef = useRef<{ id: number; x: number; y: number } | null>(null)
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null)
  const [crop, setCrop] = useState<AvatarCrop>(DEFAULT_AVATAR_CROP)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      imageRef.current = image
      setDimensions({ width: image.naturalWidth, height: image.naturalHeight })
      setLoadError(image.naturalWidth <= 0 || image.naturalHeight <= 0)
    }
    image.onerror = () => setLoadError(true)
    image.src = objectUrl

    return () => {
      imageRef.current = null
      URL.revokeObjectURL(objectUrl)
    }
  }, [file])

  useEffect(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image || !dimensions) return
    const context = canvas.getContext('2d')
    if (!context) return

    const cropRect = calculateAvatarCrop(dimensions.width, dimensions.height, crop)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(
      image,
      cropRect.sourceX,
      cropRect.sourceY,
      cropRect.sourceSize,
      cropRect.sourceSize,
      0,
      0,
      canvas.width,
      canvas.height,
    )
  }, [crop, dimensions])

  function updateZoom(nextZoom: number) {
    if (!dimensions) return
    setCrop((current) => normalizeAvatarCrop(dimensions.width, dimensions.height, {
      ...current,
      zoom: nextZoom,
    }))
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dimensions || busy) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const previousPointer = pointerRef.current
    const canvas = canvasRef.current
    if (!previousPointer || previousPointer.id !== event.pointerId || !dimensions || !canvas) return

    const viewportSize = Math.max(1, canvas.getBoundingClientRect().width)
    const deltaX = event.clientX - previousPointer.x
    const deltaY = event.clientY - previousPointer.y
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY }

    setCrop((current) => {
      const normalized = normalizeAvatarCrop(dimensions.width, dimensions.height, current)
      const sourceSize = Math.min(dimensions.width, dimensions.height) / normalized.zoom
      return normalizeAvatarCrop(dimensions.width, dimensions.height, {
        ...normalized,
        // A imagem acompanha o dedo: arrastar para a direita desloca o ponto
        // focal para a esquerda na imagem original.
        focusX: normalized.focusX - (deltaX * sourceSize) / (viewportSize * dimensions.width),
        focusY: normalized.focusY - (deltaY * sourceSize) / (viewportSize * dimensions.height),
      })
    })
  }

  function releasePointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (pointerRef.current?.id === event.pointerId) pointerRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const ready = Boolean(dimensions && !loadError)

  return (
    <Modal
      isOpen
      onClose={busy ? () => undefined : onCancel}
      title={t('avatar.crop.title', { ns: 'auth' })}
      description={t('avatar.crop.description', { ns: 'auth' })}
      size="sm"
    >
      <div className="space-y-4">
        <div className="relative mx-auto aspect-square w-full max-w-[min(74vw,22rem)] overflow-hidden rounded-3xl bg-black/70">
          <canvas
            ref={canvasRef}
            width={512}
            height={512}
            aria-label={t('avatar.crop.preview', { ns: 'auth' })}
            className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={releasePointer}
            onPointerCancel={releasePointer}
          />
          {!ready ? (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              {loadError ? (
                <p className="px-6 text-center text-sm">{t('avatar.crop.loadError', { ns: 'auth' })}</p>
              ) : (
                <Loader2 className="h-6 w-6 animate-spin" aria-label={t('avatar.crop.loading', { ns: 'auth' })} />
              )}
            </div>
          ) : null}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[7%] rounded-full border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.38)]"
          />
        </div>

        <p className="text-center text-xs text-[var(--color-muted)]">
          {t('avatar.crop.dragHint', { ns: 'auth' })}
        </p>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="avatar-crop-zoom" className="text-xs font-semibold text-[var(--color-text)]">
              {t('avatar.crop.zoom', { ns: 'auth' })}
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!ready || busy}
              onClick={() => setCrop(DEFAULT_AVATAR_CROP)}
              className="min-h-9"
            >
              <RotateCcw size={14} />
              {t('avatar.crop.reset', { ns: 'auth' })}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!ready || busy || crop.zoom <= 1}
              aria-label={t('avatar.crop.zoomOut', { ns: 'auth' })}
              onClick={() => updateZoom(crop.zoom - 0.1)}
              className="h-11 w-11 shrink-0"
            >
              <Minus size={18} />
            </Button>
            <input
              id="avatar-crop-zoom"
              type="range"
              min="1"
              max={PROFILE_AVATAR_MAX_ZOOM}
              step="0.01"
              value={crop.zoom}
              disabled={!ready || busy}
              onChange={(event) => updateZoom(Number(event.target.value))}
              className="h-11 min-w-0 flex-1 accent-[var(--color-primary)]"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!ready || busy || crop.zoom >= PROFILE_AVATAR_MAX_ZOOM}
              aria-label={t('avatar.crop.zoomIn', { ns: 'auth' })}
              onClick={() => updateZoom(crop.zoom + 0.1)}
              className="h-11 w-11 shrink-0"
            >
              <Plus size={18} />
            </Button>
          </div>
        </div>

        {error ? (
          <p role="status" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onCancel}
            className="h-11 w-full sm:w-auto"
          >
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button
            type="button"
            disabled={!ready || busy}
            onClick={() => onConfirm(crop)}
            className="h-11 w-full sm:w-auto"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? t('avatar.crop.saving', { ns: 'auth' }) : t('avatar.crop.use', { ns: 'auth' })}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

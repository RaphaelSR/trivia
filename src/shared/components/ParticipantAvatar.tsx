import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { getAvatarInitials } from '@/shared/utils/avatar'
import { useTranslation } from '@/shared/i18n'

type ParticipantAvatarProps = {
  name: string
  src?: string | null
  size?: number
  className?: string
}

export function ParticipantAvatar({
  name,
  src = null,
  size = 32,
  className,
}: ParticipantAvatarProps) {
  const { t } = useTranslation('common')
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => setImageFailed(false), [src])

  const style = { width: size, height: size }
  const classes = clsx(
    'shrink-0 overflow-hidden rounded-full border border-white/10 bg-[var(--color-primary)]/15 text-[var(--color-primary)]',
    className,
  )

  if (src && !imageFailed) {
    return (
      <img
        src={src}
        alt={t('avatar.imageAlt', { name })}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setImageFailed(true)}
        className={clsx(classes, 'object-cover')}
        style={style}
      />
    )
  }

  return (
    <span
      role="img"
      aria-label={t('avatar.initialsLabel', { name })}
      className={clsx(classes, 'inline-flex items-center justify-center font-semibold')}
      style={{ ...style, fontSize: Math.max(9, Math.round(size * 0.34)) }}
    >
      {getAvatarInitials(name)}
    </span>
  )
}

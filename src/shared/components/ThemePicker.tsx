import { Check, Clapperboard, Gamepad2, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { THEME_OPTIONS, type ThemeCategory } from '@/shared/constants/theme'
import type { ThemeMode } from '@/shared/types/game'
import { useTranslation } from '@/shared/i18n'

type ThemePickerProps = {
  value: ThemeMode
  onChange: (theme: ThemeMode) => void
  className?: string
}

/** Seletor único usado pelo onboarding e pelas configurações da partida. */
export function ThemePicker({ value, onChange, className }: ThemePickerProps) {
  const { t } = useTranslation('game')
  const groups = [
    {
      id: 'classic',
      title: t('onboarding.themes.groups.classic.title'),
      description: t('onboarding.themes.groups.classic.description'),
      options: THEME_OPTIONS.filter((option) => option.category === 'classic'),
    },
    {
      id: 'animated',
      title: t('onboarding.themes.groups.animated.title'),
      description: t('onboarding.themes.groups.animated.description'),
      options: THEME_OPTIONS.filter((option) => option.category === 'animated'),
    },
    {
      id: 'game',
      title: t('onboarding.themes.groups.game.title'),
      description: t('onboarding.themes.groups.game.description'),
      options: THEME_OPTIONS.filter((option) => option.category === 'game'),
    },
    {
      id: 'cinema',
      title: t('onboarding.themes.groups.cinema.title'),
      description: t('onboarding.themes.groups.cinema.description'),
      options: THEME_OPTIONS.filter((option) => option.category === 'cinema'),
    },
  ]

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`theme-group-${group.id}`}>
          <div className="mb-3">
            <h3 id={`theme-group-${group.id}`} className="text-sm font-semibold text-[var(--color-text)]">
              {group.title}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">{group.description}</p>
          </div>
          <div className={clsx('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
            {group.options.map((option) => {
              const selected = option.id === value
              const name = t(`onboarding.themes.${option.translationKey}.name`)
              const description = t(`onboarding.themes.${option.translationKey}.description`)

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(option.id)}
                  className={clsx(
                    'group overflow-hidden rounded-2xl border text-left transition duration-200',
                    'hover:-translate-y-0.5 hover:border-[var(--color-primary)]/55 hover:shadow-lg',
                    selected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-[0_16px_32px_-24px_var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-background)]/78',
                  )}
                >
                  <ThemePreview
                    theme={option.id}
                    animated={option.animated}
                    category={option.category}
                    gameLabel={t('onboarding.themes.gameBadge')}
                    cinemaLabel={t('onboarding.themes.cinemaBadge')}
                  />
                  <span className="flex min-h-[84px] items-start gap-3 px-3.5 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[var(--color-text)]">{name}</span>
                      <span className="mt-1 block text-xs leading-4 text-[var(--color-muted)]">{description}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={clsx(
                        'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition',
                        selected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                          : 'border-[var(--color-border)] text-transparent',
                      )}
                    >
                      <Check size={12} strokeWidth={3} />
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function ThemePreview({
  theme,
  animated,
  category,
  gameLabel,
  cinemaLabel,
}: {
  theme: ThemeMode
  animated: boolean
  category: ThemeCategory
  gameLabel: string
  cinemaLabel: string
}) {
  return (
    <span className="theme-preview relative block h-16 overflow-hidden" data-theme-preview={theme} aria-hidden="true">
      <span className="theme-preview__shape theme-preview__shape--one" />
      <span className="theme-preview__shape theme-preview__shape--two" />
      <span className="theme-preview__shape theme-preview__shape--three" />
      {category === 'cinema' ? (
        <span className="absolute left-2 top-2 z-[2] inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          <Clapperboard className="h-3 w-3" /> {cinemaLabel}
        </span>
      ) : category === 'game' ? (
        <span className="absolute left-2 top-2 z-[2] inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          <Gamepad2 className="h-3 w-3" /> {gameLabel}
        </span>
      ) : animated ? (
        <Sparkles className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-white/85 drop-shadow" />
      ) : null}
    </span>
  )
}

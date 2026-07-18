import {
  Activity,
  AudioLines,
  Gamepad2,
  Gauge,
  Music2,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { useSoundSettings } from '@/hooks/useSoundSettings'
import {
  playSound,
  previewThemeAudio,
  unlockAudio,
} from '@/shared/services/audio.service'
import type {
  SoundMode,
  VisualEffectsMode,
} from '@/shared/services/sound-settings'
import type { ThemeMode } from '@/shared/types/game'
import { useTranslation } from '@/shared/i18n'
import { Button } from './Button'
import { Modal } from './Modal'

type SoundSettingsPanelProps = {
  currentTheme: ThemeMode
}

type SoundSettingsModalProps = SoundSettingsPanelProps & {
  isOpen: boolean
  onClose: () => void
}

function Toggle({
  checked,
  disabled,
  hint,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  hint?: string
  label: string
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--color-text)]">{label}</span>
        {hint ? <span className="block text-xs leading-5 text-[var(--color-muted)]">{hint}</span> : null}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-muted)]/35'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  )
}

function VolumeSlider({
  disabled,
  label,
  value,
  onChange,
}: {
  disabled?: boolean
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className={`block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 ${disabled ? 'opacity-45' : ''}`}>
      <span className="mb-2 flex items-center justify-between text-sm font-medium text-[var(--color-text)]">
        {label}
        <span className="text-xs tabular-nums text-[var(--color-muted)]">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        disabled={disabled}
        value={Math.round(value * 100)}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        className="w-full accent-[var(--color-primary)] disabled:cursor-not-allowed"
        aria-label={label}
      />
    </label>
  )
}

const modeIcons = {
  off: VolumeX,
  theme: Music2,
  all: Volume2,
} satisfies Record<SoundMode, typeof Volume2>

function handleRadioNavigation<T extends string>(
  event: KeyboardEvent<HTMLButtonElement>,
  values: readonly T[],
  currentIndex: number,
  onChange: (value: T) => void,
) {
  let nextIndex: number | null = null
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    nextIndex = (currentIndex + 1) % values.length
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + values.length) % values.length
  } else if (event.key === 'Home') {
    nextIndex = 0
  } else if (event.key === 'End') {
    nextIndex = values.length - 1
  }
  if (nextIndex === null) return

  event.preventDefault()
  const radios = event.currentTarget
    .closest('[role="radiogroup"]')
    ?.querySelectorAll<HTMLElement>('[role="radio"]')
  radios?.[nextIndex]?.focus()
  onChange(values[nextIndex])
}

const soundModes = ['off', 'theme', 'all'] as const
const visualModes: readonly VisualEffectsMode[] = ['full', 'ambient', 'still']

export function SoundSettingsPanel({ currentTheme }: SoundSettingsPanelProps) {
  const { t } = useTranslation('control')
  const { settings, update } = useSoundSettings()
  const themeEnabled = settings.mode !== 'off'
  const gameEnabled = settings.mode === 'all'

  const setMode = (mode: SoundMode) => {
    update({ mode })
    if (mode !== 'off') void unlockAudio()
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('sound.modeLabel')}>
        {soundModes.map((mode, index) => {
          const Icon = modeIcons[mode]
          const selected = settings.mode === mode
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setMode(mode)}
              onKeyDown={(event) => handleRadioNavigation(event, soundModes, index, setMode)}
              className={`rounded-2xl border p-3 text-left transition ${selected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-[0_0_0_1px_var(--color-primary)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/45'}`}
            >
              <Icon className={`mb-2 h-5 w-5 ${selected ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'}`} />
              <span className="block text-sm font-semibold text-[var(--color-text)]">{t(`sound.modes.${mode}.title`)}</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--color-muted)]">{t(`sound.modes.${mode}.hint`)}</span>
            </button>
          )
        })}
      </div>

      <VolumeSlider
        disabled={!themeEnabled}
        label={t('sound.masterVolume')}
        value={settings.volume}
        onChange={(volume) => update({ volume })}
      />

      <section className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-black/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AudioLines className="h-4 w-4 text-[var(--color-primary)]" />
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text)]">{t('sound.themeSection')}</h4>
              <p className="text-xs text-[var(--color-muted)]">{t('sound.themeSectionHint')}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!themeEnabled}
            onClick={() => previewThemeAudio(currentTheme)}
          >
            <Play size={14} />
            {t('sound.preview')}
          </Button>
        </div>
        <VolumeSlider
          disabled={!themeEnabled}
          label={t('sound.themeVolume')}
          value={settings.themeVolume}
          onChange={(themeVolume) => update({ themeVolume })}
        />
        <Toggle
          disabled={!themeEnabled}
          checked={settings.ambience}
          onChange={(ambience) => update({ ambience })}
          label={t('sound.ambience')}
          hint={t('sound.ambienceHint')}
        />
        <Toggle
          disabled={!themeEnabled}
          checked={settings.sceneEffects}
          onChange={(sceneEffects) => update({ sceneEffects })}
          label={t('sound.sceneEffects')}
          hint={t('sound.sceneEffectsHint')}
        />
      </section>

      <section className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-black/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-[var(--color-primary)]" />
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text)]">{t('sound.gameSection')}</h4>
              <p className="text-xs text-[var(--color-muted)]">{t('sound.gameSectionHint')}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!gameEnabled || !settings.feedback}
            onClick={() => {
              void unlockAudio().then((ready) => {
                if (ready) playSound('correct')
              })
            }}
          >
            <Play size={14} />
            {t('sound.preview')}
          </Button>
        </div>
        <VolumeSlider
          disabled={!gameEnabled}
          label={t('sound.gameVolume')}
          value={settings.gameVolume}
          onChange={(gameVolume) => update({ gameVolume })}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle disabled={!gameEnabled} checked={settings.ui} onChange={(ui) => update({ ui })} label={t('sound.ui')} hint={t('sound.uiHint')} />
          <Toggle disabled={!gameEnabled} checked={settings.timer} onChange={(timer) => update({ timer })} label={t('sound.timer')} hint={t('sound.timerHint')} />
          <Toggle disabled={!gameEnabled} checked={settings.feedback} onChange={(feedback) => update({ feedback })} label={t('sound.feedback')} hint={t('sound.feedbackHint')} />
          <Toggle disabled={!gameEnabled} checked={settings.roulette} onChange={(roulette) => update({ roulette })} label={t('sound.roulette')} hint={t('sound.rouletteHint')} />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-black/5 p-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--color-primary)]" />
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text)]">{t('sound.visualSection')}</h4>
            <p className="text-xs text-[var(--color-muted)]">{t('sound.visualSectionHint')}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('sound.visualSection')}>
          {visualModes.map((mode, index) => {
            const selected = settings.visualEffects === mode
            const Icon = mode === 'full' ? Sparkles : mode === 'ambient' ? Gauge : Activity
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => update({ visualEffects: mode })}
                onKeyDown={(event) => handleRadioNavigation(
                  event,
                  visualModes,
                  index,
                  (visualEffects) => update({ visualEffects }),
                )}
                className={`rounded-xl border px-2 py-3 text-center transition ${selected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]'}`}
              >
                <Icon className="mx-auto mb-1 h-4 w-4" />
                <span className="text-xs font-semibold">{t(`sound.visualModes.${mode}`)}</span>
              </button>
            )
          })}
        </div>
      </section>

      <p className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-3 py-2 text-xs leading-5 text-[var(--color-muted)]">
        {t('sound.licenseNote')}
      </p>
    </div>
  )
}

export function SoundSettingsModal({
  currentTheme,
  isOpen,
  onClose,
}: SoundSettingsModalProps) {
  const { t } = useTranslation(['control', 'common'])
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('sound.title', { ns: 'control' })} description={t('sound.description', { ns: 'control' })} size="lg">
      <div className="max-h-[min(72dvh,760px)] space-y-5 overflow-y-auto p-1 pr-2">
        <SoundSettingsPanel currentTheme={currentTheme} />
        <div className="flex justify-end border-t border-[var(--color-border)] pt-4">
          <Button variant="outline" onClick={onClose}>{t('actions.close', { ns: 'common' })}</Button>
        </div>
      </div>
    </Modal>
  )
}

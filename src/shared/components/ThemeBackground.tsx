import type { CSSProperties } from 'react'
import { useSoundSettings } from '@/hooks/useSoundSettings'
import type { ThemeMode } from '@/shared/types/game'
import {
  isFullLivingTheme,
  isLivingTheme,
} from '@/shared/theme/living/registry'
import { BrazilBackground } from './BrazilBackground'
import { EasterBackground } from './EasterBackground'
import { LivingThemeCanvas } from './LivingThemeCanvas'
import { ThemeAudioController } from './ThemeAudioController'

type ThemeBackgroundProps = {
  theme: ThemeMode
  audioEnabled?: boolean
}

type SceneStyle = CSSProperties & Record<`--${string}`, string | number>

/**
 * Cenários são puramente decorativos e ficam fora da árvore de interação.
 * Os temas mais simples usam apenas o backdrop definido nos tokens.
 */
export function ThemeBackground({ theme, audioEnabled = false }: ThemeBackgroundProps) {
  const { settings } = useSoundSettings()
  const audio = audioEnabled ? <ThemeAudioController theme={theme} /> : null
  if (theme === 'brazil') {
    return <>{audio}<BrazilBackground motionMode={settings.visualEffects} /></>
  }
  if (theme === 'easter') {
    return <>{audio}<EasterBackground motionMode={settings.visualEffects} /></>
  }
  const livingTheme = isLivingTheme(theme) ? theme : null
  if (!livingTheme) return audio

  return (
    <>
      {audio}
      <div
        className="theme-scene pointer-events-none fixed inset-0 z-0 overflow-hidden"
        data-theme-scene={theme}
        data-theme-art={isFullLivingTheme(livingTheme) ? 'true' : undefined}
        data-theme-motion={settings.visualEffects}
        aria-hidden="true"
      >
        {theme === 'world-cup-2026' ? <WorldCupScene /> : null}
        {theme === 'kawaii' ? <KawaiiScene /> : null}
        {theme === 'neon-city' ? <NeonCityScene /> : null}
        {theme === 'storybook' ? <StorybookScene /> : null}
        <LivingThemeCanvas theme={livingTheme} />
      </div>
      {theme === 'web-city' && settings.visualEffects !== 'still'
        ? <WebCityActionOverlay motionMode={settings.visualEffects} />
        : null}
    </>
  )
}

/**
 * A silhueta cruza o primeiro plano para manter a ação legível mesmo sobre os
 * painéis do jogo. É puramente decorativa, não recebe foco nem intercepta input.
 */
function WebCityActionOverlay({ motionMode }: { motionMode: 'full' | 'ambient' }) {
  return (
    <div className="web-city-action pointer-events-none fixed inset-0 overflow-hidden" data-web-city-action data-theme-motion={motionMode} aria-hidden="true">
      <span className="web-city-action__swinger">
        <svg viewBox="0 -88 92 212" role="presentation">
          <path className="web-city-action__web" d="M84 -86 Q70 -30 48 20" />
          <g className="web-city-action__hero">
            <path className="web-city-action__arm" d="M46 38 L68 17" />
            <path className="web-city-action__arm" d="M43 43 L20 30" />
            <path className="web-city-action__body" d="M37 29 Q46 22 55 30 L59 67 Q47 77 34 66 Z" />
            <ellipse className="web-city-action__head" cx="47" cy="17" rx="11" ry="13" />
            <path className="web-city-action__eye" d="M40 13 Q44 10 45 18 Q42 18 40 13 Z" />
            <path className="web-city-action__eye" d="M54 13 Q50 10 49 18 Q52 18 54 13 Z" />
            <path className="web-city-action__leg" d="M42 66 Q31 87 15 102" />
            <path className="web-city-action__leg" d="M53 66 Q65 82 80 88" />
            <path className="web-city-action__suit-line" d="M47 29 L47 66 M36 42 Q47 49 58 42" />
            <path className="web-city-action__web-pattern" d="M47 29 L37 41 M47 29 L58 41 M36 49 Q47 55 59 49 M39 12 Q47 17 55 12 M40 21 Q47 16 54 21" />
          </g>
        </svg>
      </span>
    </div>
  )
}

function WorldCupScene() {
  return (
    <>
      <span className="world-cup-scene__light world-cup-scene__light--left" />
      <span className="world-cup-scene__light world-cup-scene__light--right" />
      <span className="world-cup-scene__stadium" />
      <span className="world-cup-scene__pitch" />
      {Array.from({ length: 18 }, (_, index) => (
        <i
          key={index}
          className="world-cup-scene__confetti"
          style={{
            '--x': `${(index * 47) % 101}%`,
            '--delay': `${index * -0.63}s`,
            '--duration': `${7 + index * 0.19}s`,
            '--hue': `${index * 41}deg`,
          } as SceneStyle}
        />
      ))}
    </>
  )
}

function KawaiiScene() {
  return (
    <>
      <span className="kawaii-scene__rainbow" />
      <span className="kawaii-scene__cloud kawaii-scene__cloud--one"><i /><i /></span>
      <span className="kawaii-scene__cloud kawaii-scene__cloud--two"><i /><i /></span>
      {Array.from({ length: 12 }, (_, index) => (
        <i
          key={index}
          className="kawaii-scene__sparkle"
          style={{
            '--x': `${(index * 37) % 97}%`,
            '--y': `${12 + ((index * 23) % 76)}%`,
            '--size': `${4 + (index % 3) * 2}px`,
            '--duration': `${2.8 + index * 0.13}s`,
          } as SceneStyle}
        />
      ))}
    </>
  )
}

function NeonCityScene() {
  return (
    <>
      <span className="neon-city-scene__sun" />
      <span className="neon-city-scene__haze" />
      <span className="neon-city-scene__skyline neon-city-scene__skyline--back" />
      <span className="neon-city-scene__skyline neon-city-scene__skyline--front" />
      <span className="neon-city-scene__street" />
    </>
  )
}

function StorybookScene() {
  return (
    <>
      <span className="storybook-scene__moon" />
      <span className="storybook-scene__hill storybook-scene__hill--back" />
      <span className="storybook-scene__hill storybook-scene__hill--front" />
      {Array.from({ length: 16 }, (_, index) => (
        <i
          key={index}
          className="storybook-scene__firefly"
          style={{
            '--x': `${(index * 43) % 94}%`,
            '--y': `${18 + ((index * 29) % 68)}%`,
            '--duration': `${4 + index * 0.21}s`,
            '--delay': `${index * -0.31}s`,
          } as SceneStyle}
        />
      ))}
    </>
  )
}

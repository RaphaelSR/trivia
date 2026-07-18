import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import { ThemeBackground } from '@/shared/components/ThemeBackground'
import { LIVING_THEME_IDS } from '@/shared/theme/living/types'

jest.mock('@/shared/components/LivingThemeCanvas', () => ({
  LivingThemeCanvas: ({ theme }: { theme: string }) => <canvas data-living-scene={theme} />,
}))

jest.mock('@/shared/components/ThemeAudioController', () => ({
  ThemeAudioController: ({ theme }: { theme: string }) => <span data-theme-audio={theme} />,
}))

describe('ThemeBackground', () => {
  it.each(LIVING_THEME_IDS)('renderiza o cenário decorativo %s fora da interação', (theme) => {
    const { container } = render(<ThemeBackground theme={theme} />)
    const scene = container.querySelector(`[data-theme-scene="${theme}"]`)

    expect(scene).toHaveAttribute('aria-hidden', 'true')
    expect(scene).toHaveClass('pointer-events-none')
    expect(container.querySelector(`[data-living-scene="${theme}"]`)).toBeInTheDocument()
  })

  it('não adiciona camada extra para temas que usam somente tokens', () => {
    const { container } = render(<ThemeBackground theme="light" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('monta o controlador de áudio somente quando o contexto oferece controles', () => {
    const { container, rerender } = render(<ThemeBackground theme="light" />)
    expect(container.querySelector('[data-theme-audio]')).not.toBeInTheDocument()

    rerender(<ThemeBackground theme="light" audioEnabled />)
    expect(container.querySelector('[data-theme-audio="light"]')).toBeInTheDocument()
  })

  it('mantém a ação frontal da Teia Urbana decorativa e sem interceptar interação', () => {
    const { container } = render(<ThemeBackground theme="web-city" />)
    const action = container.querySelector('[data-web-city-action]')

    expect(action).toHaveAttribute('aria-hidden', 'true')
    expect(action).toHaveClass('pointer-events-none')
    expect(action?.querySelector('svg')).toHaveAttribute('role', 'presentation')
  })
})

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SoundSettingsPanel } from '@/components/ui/SoundSettingsModal'
import { getSoundSettings } from '@/shared/services/sound-settings'

describe('SoundSettingsPanel', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('alterna entre silêncio, tema e experiência completa', async () => {
    const user = userEvent.setup()
    render(<SoundSettingsPanel currentTheme="starfighter-battle" />)

    expect(screen.getByRole('radio', { name: /Desligado/i })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('radio', { name: /Somente tema/i }))
    expect(getSoundSettings().mode).toBe('theme')
    expect(screen.getByRole('switch', { name: /Cronômetro/i })).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: /Todos os sons/i }))
    expect(getSoundSettings().mode).toBe('all')
    expect(screen.getByRole('switch', { name: /Cronômetro/i })).toBeEnabled()
  })

  it('persiste a preferência de cenário estático separada do áudio', async () => {
    const user = userEvent.setup()
    render(<SoundSettingsPanel currentTheme="moonlit-liner" />)

    await user.click(screen.getByRole('radio', { name: 'Estático' }))
    expect(getSoundSettings().visualEffects).toBe('still')
    expect(getSoundSettings().mode).toBe('off')
  })

  it('navega nos grupos de opções com setas, Home e End', async () => {
    const user = userEvent.setup()
    render(<SoundSettingsPanel currentTheme="shadow-dojo" />)

    const off = screen.getByRole('radio', { name: /Desligado/i })
    off.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: /Somente tema/i })).toHaveFocus()
    expect(getSoundSettings().mode).toBe('theme')

    await user.keyboard('{End}')
    expect(screen.getByRole('radio', { name: /Todos os sons/i })).toHaveFocus()
    expect(getSoundSettings().mode).toBe('all')

    const full = screen.getByRole('radio', { name: 'Vivo' })
    full.focus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: 'Estático' })).toHaveFocus()
    expect(getSoundSettings().visualEffects).toBe('still')

    await user.keyboard('{Home}')
    expect(full).toHaveFocus()
    expect(getSoundSettings().visualEffects).toBe('full')
  })
})

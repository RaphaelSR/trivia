import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemePicker } from '@/shared/components/ThemePicker'
import { THEME_OPTIONS } from '@/shared/constants/theme'

describe('ThemePicker', () => {
  it('renderiza o catálogo canônico e identifica o tema atual', () => {
    render(<ThemePicker value="moonlit-liner" onChange={jest.fn()} />)

    expect(screen.getAllByRole('button')).toHaveLength(THEME_OPTIONS.length)
    expect(screen.getByRole('heading', { name: 'Estilos clássicos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Temas animados' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mundos de jogo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cenas de cinema' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Transatlântico ao Luar/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Final 2026/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('entrega o id escolhido sem alterar a sessão', () => {
    const onChange = jest.fn()
    render(<ThemePicker value="light" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /Grande Prêmio Neon/i }))
    expect(onChange).toHaveBeenCalledWith('neon-grand-prix')
  })
})

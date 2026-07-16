import { fireEvent, render, screen } from '@testing-library/react'
import { RouletteFilmPicker } from '../../../components/ui/RouletteFilmPicker'
import type { TriviaParticipant } from '../../../modules/trivia/types'

const participants: TriviaParticipant[] = [
  { id: 'p1', name: 'Ana', role: 'player', teamId: 'team-1' },
]

describe('RouletteFilmPicker', () => {
  it('mantém a inclusão manual disponível sem depender do autocomplete', () => {
    const onFilmsChange = jest.fn()
    render(<RouletteFilmPicker films={[]} participants={participants} onFilmsChange={onFilmsChange} />)

    fireEvent.change(screen.getByLabelText('Filme'), { target: { value: 'Filme digitado' } })
    fireEvent.change(screen.getByLabelText('Ano'), { target: { value: '2024' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(onFilmsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Filme digitado',
        year: 2024,
        addedBy: 'Ana',
        selected: true,
      }),
    ])
  })

  it('explica que a lista não usa a sessão atual', () => {
    render(<RouletteFilmPicker films={[]} participants={participants} onFilmsChange={jest.fn()} />)

    expect(screen.getByText(/não usa os filmes da Biblioteca nem do trivia atual/i)).toBeInTheDocument()
  })
})

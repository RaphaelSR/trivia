import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FilmManager } from '../../../components/ui/FilmManager'
import type { CustomFilm } from '../../../data/customFilms'
import type { TriviaParticipant } from '../../../modules/trivia/types'

const mockFilms: CustomFilm[] = [
  {
    id: 'film-1',
    name: 'Matrix',
    year: 1999,
    genre: 'ficção-científica',
    streaming: 'netflix',
    link: 'https://example.com/matrix',
    notes: 'Filme clássico',
    addedBy: 'João',
    addedAt: new Date().toISOString()
  },
  {
    id: 'film-2',
    name: 'Titanic',
    year: 1997,
    genre: 'romance',
    streaming: 'prime-video',
    addedBy: 'Maria',
    addedAt: new Date().toISOString()
  }
]

const mockParticipants: TriviaParticipant[] = [
  {
    id: 'p1',
    name: 'João',
    role: 'player',
    teamId: 'team-1'
  },
  {
    id: 'p2',
    name: 'Maria',
    role: 'host',
    teamId: 'team-1'
  }
]

describe('FilmManager', () => {
  const mockOnAddFilm = jest.fn()
  const mockOnUpdateFilm = jest.fn()
  const mockOnRemoveFilm = jest.fn()
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Renderização', () => {
    it('deve renderizar lista de filmes', () => {
      render(
        <FilmManager
          films={mockFilms}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('Gerenciar Filmes (2)')).toBeInTheDocument()
      expect(screen.getByText('Matrix')).toBeInTheDocument()
      expect(screen.getByText('Titanic')).toBeInTheDocument()
    })

    it('deve mostrar mensagem quando não há filmes', () => {
      render(
        <FilmManager
          films={[]}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText('Nenhum filme adicionado ainda')).toBeInTheDocument()
    })

    it('deve mostrar contagem de participantes integrados', () => {
      render(
        <FilmManager
          films={mockFilms}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      expect(screen.getByText(/Integrado com 2 participantes/)).toBeInTheDocument()
    })
  })

  describe('Busca e Filtros', () => {
    it('deve filtrar filmes por busca', () => {
      render(
        <FilmManager
          films={mockFilms}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      const searchInput = screen.getByPlaceholderText('Buscar filmes...')
      fireEvent.change(searchInput, { target: { value: 'Matrix' } })

      expect(screen.getByText('Matrix')).toBeInTheDocument()
      expect(screen.queryByText('Titanic')).not.toBeInTheDocument()
    })

    it('deve filtrar filmes por gênero', () => {
      render(
        <FilmManager
          films={mockFilms}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      const genreSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(genreSelect, { target: { value: 'ficção-científica' } })

      expect(screen.getByText('Matrix')).toBeInTheDocument()
      expect(screen.queryByText('Titanic')).not.toBeInTheDocument()
    })

    it('deve filtrar filmes por streaming', () => {
      render(
        <FilmManager
          films={mockFilms}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      const streamingSelect = screen.getAllByRole('combobox')[1]
      fireEvent.change(streamingSelect, { target: { value: 'netflix' } })

      expect(screen.getByText('Matrix')).toBeInTheDocument()
      expect(screen.queryByText('Titanic')).not.toBeInTheDocument()
    })

    it('deve combinar múltiplos filtros', () => {
      render(
        <FilmManager
          films={mockFilms}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      const searchInput = screen.getByPlaceholderText('Buscar filmes...')
      const genreSelect = screen.getAllByRole('combobox')[0]

      fireEvent.change(searchInput, { target: { value: 'Matrix' } })
      fireEvent.change(genreSelect, { target: { value: 'ficção-científica' } })

      expect(screen.getByText('Matrix')).toBeInTheDocument()
      expect(screen.queryByText('Titanic')).not.toBeInTheDocument()
    })
  })

  describe('CRUD de Filmes', () => {
    it('deve abrir formulário ao clicar em Adicionar', () => {
      render(
        <FilmManager
          films={mockFilms}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      const addButton = screen.getByText('Adicionar')
      fireEvent.click(addButton)

      expect(screen.getByText('Adicionar Novo Filme')).toBeInTheDocument()
    })

    it('deve chamar onAddFilm ao submeter formulário', async () => {
      render(
        <FilmManager
          films={mockFilms}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      const addButton = screen.getByText('Adicionar')
      fireEvent.click(addButton)

      const nameInput = screen.getByLabelText(/Nome do Filme/i)
      fireEvent.change(nameInput, { target: { value: 'Novo Filme' } })

      const submitButton = screen.getByText('Adicionar Filme')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnAddFilm).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Novo Filme'
          })
        )
      })
    })

    it('deve abrir formulário de edição ao clicar em Editar', () => {
      render(
        <FilmManager
          films={mockFilms}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      const editButtons = screen.getAllByTitle('Editar filme')
      fireEvent.click(editButtons[0])

      expect(screen.getByText('Editar Filme')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Matrix')).toBeInTheDocument()
    })

    it('deve chamar onUpdateFilm ao submeter edição', async () => {
      window.confirm = jest.fn(() => true)

      render(
        <FilmManager
          films={mockFilms}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      const editButtons = screen.getAllByTitle('Editar filme')
      fireEvent.click(editButtons[0])

      const nameInput = screen.getByLabelText(/Nome do Filme/i)
      fireEvent.change(nameInput, { target: { value: 'Matrix Reloaded' } })

      const submitButton = screen.getByText('Atualizar Filme')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnUpdateFilm).toHaveBeenCalledWith(
          'film-1',
          expect.objectContaining({
            name: 'Matrix Reloaded'
          })
        )
      })
    })

    it('deve chamar onRemoveFilm ao confirmar remoção', () => {
      window.confirm = jest.fn(() => true)

      render(
        <FilmManager
          films={mockFilms}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      const removeButtons = screen.getAllByTitle('Remover filme')
      fireEvent.click(removeButtons[0])

      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Matrix'))
      expect(mockOnRemoveFilm).toHaveBeenCalledWith('film-1')
    })

    it('não deve remover se usuário cancelar', () => {
      window.confirm = jest.fn(() => false)

      render(
        <FilmManager
          films={mockFilms}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      const removeButtons = screen.getAllByTitle('Remover filme')
      fireEvent.click(removeButtons[0])

      expect(window.confirm).toHaveBeenCalled()
      expect(mockOnRemoveFilm).not.toHaveBeenCalled()
    })
  })

  describe('Integração com Participantes', () => {
    it('deve mostrar badge quando addedBy é participante', () => {
      render(
        <FilmManager
          films={mockFilms}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      const addedByElements = screen.getAllByText(/Adicionado por:/)
      expect(addedByElements.length).toBeGreaterThan(0)
      expect(screen.getByText('João')).toBeInTheDocument()
    })

    it('deve permitir selecionar participante no formulário', () => {
      render(
        <FilmManager
          films={mockFilms}
          participants={mockParticipants}
          onAddFilm={mockOnAddFilm}
          onUpdateFilm={mockOnUpdateFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onClose={mockOnClose}
        />
      )

      const addButton = screen.getByText('Adicionar')
      fireEvent.click(addButton)

      const participantSelect = screen.getByLabelText(/Adicionado por/i)
      expect(participantSelect).toBeInTheDocument()
    })
  })
})


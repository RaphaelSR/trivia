import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QuestionLibraryModal } from '../../../components/ui/QuestionLibraryModal'
import type { TriviaColumn } from '../../../modules/trivia/types'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockBoard: TriviaColumn[] = [
  {
    id: 'col-1',
    film: 'Matrix',
    filmId: 'matrix',
    tiles: [
      {
        id: 'tile-1',
        film: 'Matrix',
        points: 10,
        question: 'Pergunta 1?',
        answer: 'Resposta 1',
        state: 'available',
      },
      {
        id: 'tile-2',
        film: 'Matrix',
        points: 20,
        question: 'Pergunta 2?',
        answer: 'Resposta 2',
        state: 'available',
      },
    ],
  },
]

describe('QuestionLibraryModal', () => {
  const mockOnClose = jest.fn()
  const mockOnUpdateColumnTitle = jest.fn()
  const mockOnAddQuestion = jest.fn()
  const mockOnRemoveQuestion = jest.fn()
  const mockOnUpdateTileContent = jest.fn()
  const mockOnAddFilm = jest.fn()
  const mockOnRemoveFilm = jest.fn()
  const mockOnImportFilms = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Renderização', () => {
    it('deve renderizar modal quando aberto', () => {
      render(
        <QuestionLibraryModal
          isOpen={true}
          onClose={mockOnClose}
          board={mockBoard}
          onUpdateColumnTitle={mockOnUpdateColumnTitle}
          onAddQuestion={mockOnAddQuestion}
          onRemoveQuestion={mockOnRemoveQuestion}
          onUpdateTileContent={mockOnUpdateTileContent}
          onAddFilm={mockOnAddFilm}
          onRemoveFilm={mockOnRemoveFilm}
        />
      )

      expect(screen.getByText('Biblioteca de Perguntas')).toBeInTheDocument()
      expect(screen.getByText('Matrix')).toBeInTheDocument()
    })

    it('não deve renderizar quando fechado', () => {
      render(
        <QuestionLibraryModal
          isOpen={false}
          onClose={mockOnClose}
          board={mockBoard}
          onUpdateColumnTitle={mockOnUpdateColumnTitle}
          onAddQuestion={mockOnAddQuestion}
          onRemoveQuestion={mockOnRemoveQuestion}
          onUpdateTileContent={mockOnUpdateTileContent}
          onAddFilm={mockOnAddFilm}
          onRemoveFilm={mockOnRemoveFilm}
        />
      )

      expect(screen.queryByText('Biblioteca de Perguntas')).not.toBeInTheDocument()
    })

    it('deve mostrar contagem total de perguntas', () => {
      render(
        <QuestionLibraryModal
          isOpen={true}
          onClose={mockOnClose}
          board={mockBoard}
          onUpdateColumnTitle={mockOnUpdateColumnTitle}
          onAddQuestion={mockOnAddQuestion}
          onRemoveQuestion={mockOnRemoveQuestion}
          onUpdateTileContent={mockOnUpdateTileContent}
          onAddFilm={mockOnAddFilm}
          onRemoveFilm={mockOnRemoveFilm}
        />
      )

      expect(screen.getByText(/2 perguntas no total/)).toBeInTheDocument()
    })
  })

  describe('Busca e Filtros', () => {
    it('deve filtrar filmes por busca', () => {
      const boardWithMultiple: TriviaColumn[] = [
        ...mockBoard,
        {
          id: 'col-2',
          film: 'Titanic',
          filmId: 'titanic',
          tiles: [],
        },
      ]

      render(
        <QuestionLibraryModal
          isOpen={true}
          onClose={mockOnClose}
          board={boardWithMultiple}
          onUpdateColumnTitle={mockOnUpdateColumnTitle}
          onAddQuestion={mockOnAddQuestion}
          onRemoveQuestion={mockOnRemoveQuestion}
          onUpdateTileContent={mockOnUpdateTileContent}
          onAddFilm={mockOnAddFilm}
          onRemoveFilm={mockOnRemoveFilm}
        />
      )

      const searchInput = screen.getByPlaceholderText('Buscar por filme, pergunta ou resposta...')
      fireEvent.change(searchInput, { target: { value: 'Matrix' } })

      expect(screen.getByText('Matrix')).toBeInTheDocument()
      expect(screen.queryByText('Titanic')).not.toBeInTheDocument()
    })

    it('deve filtrar por pontos', () => {
      render(
        <QuestionLibraryModal
          isOpen={true}
          onClose={mockOnClose}
          board={mockBoard}
          onUpdateColumnTitle={mockOnUpdateColumnTitle}
          onAddQuestion={mockOnAddQuestion}
          onRemoveQuestion={mockOnRemoveQuestion}
          onUpdateTileContent={mockOnUpdateTileContent}
          onAddFilm={mockOnAddFilm}
          onRemoveFilm={mockOnRemoveFilm}
        />
      )

      const pointsSelect = screen.getByLabelText(/Filtrar por pontos:/)
      fireEvent.change(pointsSelect, { target: { value: '10' } })

      expect(screen.getByText('Matrix')).toBeInTheDocument()
    })
  })

  describe('Ações de Filmes', () => {
    it('deve chamar onAddFilm ao clicar em Adicionar filme', () => {
      render(
        <QuestionLibraryModal
          isOpen={true}
          onClose={mockOnClose}
          board={mockBoard}
          onUpdateColumnTitle={mockOnUpdateColumnTitle}
          onAddQuestion={mockOnAddQuestion}
          onRemoveQuestion={mockOnRemoveQuestion}
          onUpdateTileContent={mockOnUpdateTileContent}
          onAddFilm={mockOnAddFilm}
          onRemoveFilm={mockOnRemoveFilm}
        />
      )

      const addButton = screen.getByText('Adicionar filme')
      fireEvent.click(addButton)

      expect(mockOnAddFilm).toHaveBeenCalled()
    })

    it('deve chamar onRemoveFilm ao confirmar remoção', async () => {
      window.confirm = jest.fn(() => true)

      render(
        <QuestionLibraryModal
          isOpen={true}
          onClose={mockOnClose}
          board={mockBoard}
          onUpdateColumnTitle={mockOnUpdateColumnTitle}
          onAddQuestion={mockOnAddQuestion}
          onRemoveQuestion={mockOnRemoveQuestion}
          onUpdateTileContent={mockOnUpdateTileContent}
          onAddFilm={mockOnAddFilm}
          onRemoveFilm={mockOnRemoveFilm}
        />
      )

      const filmHeader = screen.getByText('Matrix')
      fireEvent.click(filmHeader)

      await waitFor(() => {
        const removeButton = screen.getByText('Remover Filme')
        fireEvent.click(removeButton)
      })

      expect(window.confirm).toHaveBeenCalled()
      expect(mockOnRemoveFilm).toHaveBeenCalledWith('col-1', 'Matrix')
    })
  })

  describe('Edição de Perguntas', () => {
    it('deve chamar onUpdateColumnTitle ao editar nome do filme', async () => {
      render(
        <QuestionLibraryModal
          isOpen={true}
          onClose={mockOnClose}
          board={mockBoard}
          onUpdateColumnTitle={mockOnUpdateColumnTitle}
          onAddQuestion={mockOnAddQuestion}
          onRemoveQuestion={mockOnRemoveQuestion}
          onUpdateTileContent={mockOnUpdateTileContent}
          onAddFilm={mockOnAddFilm}
          onRemoveFilm={mockOnRemoveFilm}
        />
      )

      const filmHeader = screen.getByText('Matrix')
      fireEvent.click(filmHeader)

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Matrix')
        fireEvent.change(nameInput, { target: { value: 'Matrix Reloaded' } })
        fireEvent.blur(nameInput)
      })

      expect(mockOnUpdateColumnTitle).toHaveBeenCalledWith('col-1', 'Matrix Reloaded')
    })

    it('deve chamar onAddQuestion ao adicionar pergunta', async () => {
      render(
        <QuestionLibraryModal
          isOpen={true}
          onClose={mockOnClose}
          board={mockBoard}
          onUpdateColumnTitle={mockOnUpdateColumnTitle}
          onAddQuestion={mockOnAddQuestion}
          onRemoveQuestion={mockOnRemoveQuestion}
          onUpdateTileContent={mockOnUpdateTileContent}
          onAddFilm={mockOnAddFilm}
          onRemoveFilm={mockOnRemoveFilm}
        />
      )

      const filmHeader = screen.getByText('Matrix')
      fireEvent.click(filmHeader)

      await waitFor(() => {
        const addButton = screen.getByText('Adicionar Pergunta')
        fireEvent.click(addButton)
      })

      expect(mockOnAddQuestion).toHaveBeenCalledWith('col-1')
    })

    it('deve chamar onUpdateTileContent ao editar pergunta', async () => {
      render(
        <QuestionLibraryModal
          isOpen={true}
          onClose={mockOnClose}
          board={mockBoard}
          onUpdateColumnTitle={mockOnUpdateColumnTitle}
          onAddQuestion={mockOnAddQuestion}
          onRemoveQuestion={mockOnRemoveQuestion}
          onUpdateTileContent={mockOnUpdateTileContent}
          onAddFilm={mockOnAddFilm}
          onRemoveFilm={mockOnRemoveFilm}
        />
      )

      const filmHeader = screen.getByText('Matrix')
      fireEvent.click(filmHeader)

      await waitFor(() => {
        const questionTextarea = screen.getByDisplayValue('Pergunta 1?')
        fireEvent.change(questionTextarea, { target: { value: 'Nova pergunta?' } })
      })

      expect(mockOnUpdateTileContent).toHaveBeenCalledWith('tile-1', {
        question: 'Nova pergunta?',
      })
    })
  })

  describe('Export/Import', () => {
    it('deve ter botão de exportar', () => {
      render(
        <QuestionLibraryModal
          isOpen={true}
          onClose={mockOnClose}
          board={mockBoard}
          onUpdateColumnTitle={mockOnUpdateColumnTitle}
          onAddQuestion={mockOnAddQuestion}
          onRemoveQuestion={mockOnRemoveQuestion}
          onUpdateTileContent={mockOnUpdateTileContent}
          onAddFilm={mockOnAddFilm}
          onRemoveFilm={mockOnRemoveFilm}
        />
      )

      expect(screen.getByText('Exportar')).toBeInTheDocument()
    })

    it('deve ter botão de importar', () => {
      render(
        <QuestionLibraryModal
          isOpen={true}
          onClose={mockOnClose}
          board={mockBoard}
          onUpdateColumnTitle={mockOnUpdateColumnTitle}
          onAddQuestion={mockOnAddQuestion}
          onRemoveQuestion={mockOnRemoveQuestion}
          onUpdateTileContent={mockOnUpdateTileContent}
          onAddFilm={mockOnAddFilm}
          onRemoveFilm={mockOnRemoveFilm}
          onImportFilms={mockOnImportFilms}
        />
      )

      expect(screen.getByText('Importar')).toBeInTheDocument()
    })
  })
})


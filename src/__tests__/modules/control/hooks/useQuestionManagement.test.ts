import { renderHook, act } from '@testing-library/react'
import { useQuestionManagement } from '../../../../modules/control/hooks/useQuestionManagement'
import type { ParsedImport } from '../../../../components/ui/QuestionImportModal'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

describe('useQuestionManagement', () => {
  const mockAddQuestionTile = jest.fn()
  const mockRemoveQuestionTile = jest.fn()
  const mockAddFilmColumn = jest.fn(() => 'new-column-id')
  const mockRemoveFilmColumn = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('importQuestions', () => {
    it('deve importar perguntas corretamente', () => {
      const imports: ParsedImport[] = [
        {
          filmName: 'Filme 1',
          columnId: 'col-1',
          questions: [
            { points: 10, question: 'Pergunta 1?', answer: 'Resposta 1' },
            { points: 20, question: 'Pergunta 2?', answer: 'Resposta 2' }
          ]
        }
      ]

      const { result } = renderHook(() =>
        useQuestionManagement(
          mockAddQuestionTile,
          mockRemoveQuestionTile,
          mockAddFilmColumn,
          mockRemoveFilmColumn
        )
      )

      act(() => {
        result.current.importQuestions(imports)
      })

      expect(mockAddQuestionTile).toHaveBeenCalledTimes(2)
      expect(mockAddQuestionTile).toHaveBeenCalledWith(
        'col-1',
        expect.objectContaining({
          points: 10,
          question: 'Pergunta 1?',
          answer: 'Resposta 1'
        })
      )
    })

    it('deve importar perguntas de múltiplos filmes', () => {
      const imports: ParsedImport[] = [
        {
          filmName: 'Filme 1',
          columnId: 'col-1',
          questions: [
            { points: 10, question: 'Pergunta 1?', answer: 'Resposta 1' }
          ]
        },
        {
          filmName: 'Filme 2',
          columnId: 'col-2',
          questions: [
            { points: 20, question: 'Pergunta 2?', answer: 'Resposta 2' }
          ]
        }
      ]

      const { result } = renderHook(() =>
        useQuestionManagement(
          mockAddQuestionTile,
          mockRemoveQuestionTile,
          mockAddFilmColumn,
          mockRemoveFilmColumn
        )
      )

      act(() => {
        result.current.importQuestions(imports)
      })

      expect(mockAddQuestionTile).toHaveBeenCalledTimes(2)
      expect(mockAddQuestionTile).toHaveBeenCalledWith('col-1', expect.any(Object))
      expect(mockAddQuestionTile).toHaveBeenCalledWith('col-2', expect.any(Object))
    })

    it('deve tratar erros durante importação', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const errorAddQuestionTile = jest.fn(() => {
        throw new Error('Erro ao adicionar')
      })

      const imports: ParsedImport[] = [
        {
          filmName: 'Filme 1',
          columnId: 'col-1',
          questions: [
            { points: 10, question: 'Pergunta 1?', answer: 'Resposta 1' }
          ]
        }
      ]

      const { result } = renderHook(() =>
        useQuestionManagement(
          errorAddQuestionTile,
          mockRemoveQuestionTile,
          mockAddFilmColumn,
          mockRemoveFilmColumn
        )
      )

      act(() => {
        result.current.importQuestions(imports)
      })

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('addQuestion', () => {
    it('deve adicionar nova pergunta com valores padrão', () => {
      const { result } = renderHook(() =>
        useQuestionManagement(
          mockAddQuestionTile,
          mockRemoveQuestionTile,
          mockAddFilmColumn,
          mockRemoveFilmColumn
        )
      )

      act(() => {
        result.current.addQuestion('col-1')
      })

      expect(mockAddQuestionTile).toHaveBeenCalledWith('col-1', {
        points: 10,
        question: 'Nova pergunta',
        answer: ''
      })
    })
  })

  describe('removeQuestion', () => {
    it('deve remover pergunta quando confirmado', () => {
      window.confirm = jest.fn(() => true)

      const { result } = renderHook(() =>
        useQuestionManagement(
          mockAddQuestionTile,
          mockRemoveQuestionTile,
          mockAddFilmColumn,
          mockRemoveFilmColumn
        )
      )

      act(() => {
        result.current.removeQuestion('col-1', 'tile-1')
      })

      expect(window.confirm).toHaveBeenCalledWith('Remover esta pergunta?')
      expect(mockRemoveQuestionTile).toHaveBeenCalledWith('col-1', 'tile-1')
    })

    it('não deve remover pergunta quando cancelado', () => {
      window.confirm = jest.fn(() => false)

      const { result } = renderHook(() =>
        useQuestionManagement(
          mockAddQuestionTile,
          mockRemoveQuestionTile,
          mockAddFilmColumn,
          mockRemoveFilmColumn
        )
      )

      act(() => {
        result.current.removeQuestion('col-1', 'tile-1')
      })

      expect(window.confirm).toHaveBeenCalled()
      expect(mockRemoveQuestionTile).not.toHaveBeenCalled()
    })
  })

  describe('addFilm', () => {
    it('deve adicionar novo filme', () => {
      const { result } = renderHook(() =>
        useQuestionManagement(
          mockAddQuestionTile,
          mockRemoveQuestionTile,
          mockAddFilmColumn,
          mockRemoveFilmColumn
        )
      )

      act(() => {
        result.current.addFilm()
      })

      expect(mockAddFilmColumn).toHaveBeenCalledWith('Novo Filme')
    })
  })

  describe('removeFilm', () => {
    it('deve remover filme quando confirmado', () => {
      window.confirm = jest.fn(() => true)

      const { result } = renderHook(() =>
        useQuestionManagement(
          mockAddQuestionTile,
          mockRemoveQuestionTile,
          mockAddFilmColumn,
          mockRemoveFilmColumn
        )
      )

      act(() => {
        result.current.removeFilm('col-1', 'Filme Teste')
      })

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Filme Teste')
      )
      expect(mockRemoveFilmColumn).toHaveBeenCalledWith('col-1')
    })

    it('não deve remover filme quando cancelado', () => {
      window.confirm = jest.fn(() => false)

      const { result } = renderHook(() =>
        useQuestionManagement(
          mockAddQuestionTile,
          mockRemoveQuestionTile,
          mockAddFilmColumn,
          mockRemoveFilmColumn
        )
      )

      act(() => {
        result.current.removeFilm('col-1', 'Filme Teste')
      })

      expect(window.confirm).toHaveBeenCalled()
      expect(mockRemoveFilmColumn).not.toHaveBeenCalled()
    })
  })
})


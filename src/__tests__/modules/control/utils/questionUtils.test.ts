import {
  createQuestionTileId,
  processQuestionImports,
  countImportedQuestions,
} from '../../../../modules/control/utils/questionUtils'
import type { ParsedImport } from '../../../../components/ui/QuestionImportModal'

describe('questionUtils', () => {
  describe('createQuestionTileId', () => {
    it('deve gerar IDs únicos baseados em columnId e points', () => {
      const id1 = createQuestionTileId('column-1', 10)
      const id2 = createQuestionTileId('column-1', 10)
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^column-1-10-/)
      expect(id2).toMatch(/^column-1-10-/)
    })

    it('deve incluir columnId e points no ID', () => {
      const id = createQuestionTileId('film-123', 50)
      expect(id).toContain('film-123')
      expect(id).toContain('50')
    })
  })

  describe('processQuestionImports', () => {
    it('deve processar imports e retornar tiles formatados', () => {
      const imports: ParsedImport[] = [
        {
          filmName: 'Filme 1',
          columnId: 'col-1',
          questions: [
            { points: 10, question: 'Q1', answer: 'A1' },
            { points: 20, question: 'Q2', answer: 'A2' },
          ],
        },
      ]

      const result = processQuestionImports(imports)
      expect(result).toHaveLength(2)
      expect(result[0].columnId).toBe('col-1')
      expect(result[0].tile.film).toBe('Filme 1')
      expect(result[0].tile.points).toBe(10)
      expect(result[0].tile.question).toBe('Q1')
      expect(result[0].tile.answer).toBe('A1')
      expect(result[0].tile.state).toBe('available')
      expect(result[1].tile.points).toBe(20)
    })

    it('deve processar múltiplos filmes', () => {
      const imports: ParsedImport[] = [
        {
          filmName: 'Filme 1',
          columnId: 'col-1',
          questions: [{ points: 10, question: 'Q1', answer: 'A1' }],
        },
        {
          filmName: 'Filme 2',
          columnId: 'col-2',
          questions: [{ points: 20, question: 'Q2', answer: 'A2' }],
        },
      ]

      const result = processQuestionImports(imports)
      expect(result).toHaveLength(2)
      expect(result[0].tile.film).toBe('Filme 1')
      expect(result[1].tile.film).toBe('Filme 2')
    })

    it('deve retornar array vazio para imports vazios', () => {
      const result = processQuestionImports([])
      expect(result).toHaveLength(0)
    })

    it('deve processar filme sem perguntas', () => {
      const imports: ParsedImport[] = [
        {
          filmName: 'Filme 1',
          columnId: 'col-1',
          questions: [],
        },
      ]

      const result = processQuestionImports(imports)
      expect(result).toHaveLength(0)
    })
  })

  describe('countImportedQuestions', () => {
    it('deve contar total de perguntas importadas', () => {
      const imports: ParsedImport[] = [
        {
          filmName: 'Filme 1',
          columnId: 'col-1',
          questions: [
            { points: 10, question: 'Q1', answer: 'A1' },
            { points: 20, question: 'Q2', answer: 'A2' },
          ],
        },
        {
          filmName: 'Filme 2',
          columnId: 'col-2',
          questions: [{ points: 30, question: 'Q3', answer: 'A3' }],
        },
      ]

      expect(countImportedQuestions(imports)).toBe(3)
    })

    it('deve retornar 0 para imports vazios', () => {
      expect(countImportedQuestions([])).toBe(0)
    })

    it('deve retornar 0 para filmes sem perguntas', () => {
      const imports: ParsedImport[] = [
        {
          filmName: 'Filme 1',
          columnId: 'col-1',
          questions: [],
        },
      ]

      expect(countImportedQuestions(imports)).toBe(0)
    })
  })
})


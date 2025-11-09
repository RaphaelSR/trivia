import {
  exportFilmsWithQuestions,
  importFilmsWithQuestions,
  convertImportToColumns,
  downloadJsonFile,
  type FilmExportData,
} from '../../../../modules/control/utils/filmExportUtils'
import type { TriviaColumn } from '../../../../modules/trivia/types'
import { createQuestionTileId } from '../../../../modules/control/utils/questionUtils'

describe('filmExportUtils', () => {
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
    {
      id: 'col-2',
      film: 'Titanic',
      filmId: 'titanic',
      tiles: [
        {
          id: 'tile-3',
          film: 'Titanic',
          points: 15,
          question: 'Pergunta 3?',
          answer: 'Resposta 3',
          state: 'available',
        },
      ],
    },
  ]

  describe('exportFilmsWithQuestions', () => {
    it('deve exportar filmes com perguntas corretamente', () => {
      const result = exportFilmsWithQuestions(mockBoard)

      expect(result.version).toBe('1.0')
      expect(result.exportedAt).toBeDefined()
      expect(result.films).toHaveLength(2)
      expect(result.films[0].name).toBe('Matrix')
      expect(result.films[0].questions).toHaveLength(2)
      expect(result.films[0].questions[0].points).toBe(10)
      expect(result.films[0].questions[0].question).toBe('Pergunta 1?')
      expect(result.films[0].questions[0].answer).toBe('Resposta 1')
    })

    it('deve exportar filme sem perguntas', () => {
      const boardWithoutQuestions: TriviaColumn[] = [
        {
          id: 'col-1',
          film: 'Filme Vazio',
          filmId: 'empty',
          tiles: [],
        },
      ]

      const result = exportFilmsWithQuestions(boardWithoutQuestions)

      expect(result.films).toHaveLength(1)
      expect(result.films[0].name).toBe('Filme Vazio')
      expect(result.films[0].questions).toHaveLength(0)
    })

    it('deve incluir metadados de exportação', () => {
      const result = exportFilmsWithQuestions(mockBoard)

      expect(result.version).toBe('1.0')
      expect(new Date(result.exportedAt).getTime()).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('importFilmsWithQuestions', () => {
    it('deve importar dados válidos corretamente', () => {
      const validData: FilmExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        films: [
          {
            name: 'Novo Filme',
            questions: [
              { points: 10, question: 'Q1?', answer: 'A1' },
              { points: 20, question: 'Q2?', answer: 'A2' },
            ],
          },
        ],
      }

      const result = importFilmsWithQuestions(validData, [])

      expect(result.success).toBe(true)
      expect(result.films).toHaveLength(1)
      expect(result.films[0].name).toBe('Novo Filme')
      expect(result.films[0].questions).toHaveLength(2)
      expect(result.errors).toHaveLength(0)
    })

    it('deve detectar formato inválido', () => {
      const invalidData = { invalid: 'data' }

      const result = importFilmsWithQuestions(invalidData, [])

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.films).toHaveLength(0)
    })

    it('deve detectar filme sem nome', () => {
      const dataWithEmptyName: FilmExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        films: [
          {
            name: '',
            questions: [{ points: 10, question: 'Q?', answer: 'A' }],
          },
        ],
      }

      const result = importFilmsWithQuestions(dataWithEmptyName, [])

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some((e) => e.includes('sem nome'))).toBe(true)
    })

    it('deve avisar sobre filme duplicado', () => {
      const data: FilmExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        films: [
          {
            name: 'Matrix',
            questions: [{ points: 10, question: 'Q?', answer: 'A' }],
          },
        ],
      }

      const result = importFilmsWithQuestions(data, mockBoard)

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some((w) => w.includes('já existe'))).toBe(true)
    })

    it('deve avisar sobre filme sem perguntas', () => {
      const data: FilmExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        films: [
          {
            name: 'Filme Sem Perguntas',
            questions: [],
          },
        ],
      }

      const result = importFilmsWithQuestions(data, [])

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some((w) => w.includes('não possui perguntas'))).toBe(true)
    })

    it('deve filtrar perguntas inválidas', () => {
      const data: FilmExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        films: [
          {
            name: 'Filme',
            questions: [
              { points: 10, question: 'Q válida?', answer: 'A' },
              { points: 0, question: 'Q inválida?', answer: 'A' },
              { points: 20, question: '', answer: 'A' },
            ],
          },
        ],
      }

      const result = importFilmsWithQuestions(data, [])

      expect(result.films[0].questions).toHaveLength(1)
      expect(result.films[0].questions[0].question).toBe('Q válida?')
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('deve preservar metadados opcionais', () => {
      const data: FilmExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        films: [
          {
            name: 'Filme Completo',
            year: 2023,
            genre: 'ação',
            streaming: 'netflix',
            link: 'https://example.com',
            notes: 'Notas do filme',
            addedBy: 'João',
            questions: [{ points: 10, question: 'Q?', answer: 'A' }],
          },
        ],
      }

      const result = importFilmsWithQuestions(data, [])

      expect(result.films[0].year).toBe(2023)
      expect(result.films[0].genre).toBe('ação')
      expect(result.films[0].streaming).toBe('netflix')
      expect(result.films[0].link).toBe('https://example.com')
      expect(result.films[0].notes).toBe('Notas do filme')
      expect(result.films[0].addedBy).toBe('João')
    })
  })

  describe('convertImportToColumns', () => {
    it('deve converter dados de importação para colunas', () => {
      const importResult = {
        success: true,
        films: [
          {
            name: 'Filme 1',
            questions: [
              { points: 10, question: 'Q1?', answer: 'A1' },
              { points: 20, question: 'Q2?', answer: 'A2' },
            ],
          },
        ],
        errors: [],
        warnings: [],
      }

      let columnIdCounter = 0
      const createColumnId = () => `col-${++columnIdCounter}`

      const result = convertImportToColumns(importResult, createColumnId, createQuestionTileId)

      expect(result).toHaveLength(1)
      expect(result[0].column.film).toBe('Filme 1')
      expect(result[0].tiles).toHaveLength(2)
      expect(result[0].tiles[0].points).toBe(10)
      expect(result[0].tiles[0].question).toBe('Q1?')
      expect(result[0].tiles[0].answer).toBe('A1')
      expect(result[0].tiles[0].state).toBe('available')
    })

    it('deve converter múltiplos filmes', () => {
      const importResult = {
        success: true,
        films: [
          {
            name: 'Filme 1',
            questions: [{ points: 10, question: 'Q1?', answer: 'A1' }],
          },
          {
            name: 'Filme 2',
            questions: [{ points: 20, question: 'Q2?', answer: 'A2' }],
          },
        ],
        errors: [],
        warnings: [],
      }

      let columnIdCounter = 0
      const createColumnId = () => `col-${++columnIdCounter}`

      const result = convertImportToColumns(importResult, createColumnId, createQuestionTileId)

      expect(result).toHaveLength(2)
      expect(result[0].column.film).toBe('Filme 1')
      expect(result[1].column.film).toBe('Filme 2')
    })
  })

  describe('downloadJsonFile', () => {
    it('deve criar link de download', () => {
      const createObjectURLSpy = jest.fn(() => 'blob:mock-url')
      const revokeObjectURLSpy = jest.fn()
      const originalCreateObjectURL = global.URL.createObjectURL
      const originalRevokeObjectURL = global.URL.revokeObjectURL

      global.URL.createObjectURL = createObjectURLSpy
      global.URL.revokeObjectURL = revokeObjectURLSpy

      const createElementSpy = jest.spyOn(document, 'createElement')
      const clickSpy = jest.fn()

      const mockLink = {
        href: '',
        download: '',
        click: clickSpy,
      } as unknown as HTMLAnchorElement

      createElementSpy.mockReturnValue(mockLink)

      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink)
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink)

      downloadJsonFile({ test: 'data' }, 'test.json')

      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(appendChildSpy).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')

      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
      global.URL.createObjectURL = originalCreateObjectURL
      global.URL.revokeObjectURL = originalRevokeObjectURL
    })
  })
})


import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QuestionImportModal } from '../../../components/ui/QuestionImportModal'
import type { TriviaColumn } from '../../../modules/trivia/types'

const mockColumns: TriviaColumn[] = [
  {
    id: 'col-1',
    film: 'Tróia',
    filmId: 'film-1',
    tiles: []
  },
  {
    id: 'col-2',
    film: 'Lilo & Stitch',
    filmId: 'film-2',
    tiles: []
  }
]

describe('QuestionImportModal', () => {
  const mockOnImport = jest.fn()
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Renderização', () => {
    it('deve renderizar modal quando aberto', () => {
      render(
        <QuestionImportModal
          isOpen={true}
          onClose={mockOnClose}
          columns={mockColumns}
          onImport={mockOnImport}
        />
      )

      expect(screen.getByText('Importar Perguntas')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Cole aqui o texto/)).toBeInTheDocument()
    })

    it('não deve renderizar quando fechado', () => {
      render(
        <QuestionImportModal
          isOpen={false}
          onClose={mockOnClose}
          columns={mockColumns}
          onImport={mockOnImport}
        />
      )

      expect(screen.queryByText('Importar Perguntas')).not.toBeInTheDocument()
    })

    it('deve mostrar formato esperado', () => {
      render(
        <QuestionImportModal
          isOpen={true}
          onClose={mockOnClose}
          columns={mockColumns}
          onImport={mockOnImport}
        />
      )

      expect(screen.getByText(/Formato esperado:/)).toBeInTheDocument()
      expect(screen.getByText(/Título do filme/)).toBeInTheDocument()
      expect(screen.getByText(/Nível de pontuação/)).toBeInTheDocument()
    })
  })

  describe('Parsing de Texto', () => {
    it('deve identificar filme e perguntas corretamente', async () => {
      const importText = `⚔️ TRÓIA
Nível 5
1. Qual é o nome do protagonista?
Aquiles
2. Em que ano o filme foi lançado?
2004`

      render(
        <QuestionImportModal
          isOpen={true}
          onClose={mockOnClose}
          columns={mockColumns}
          onImport={mockOnImport}
        />
      )

      const textarea = screen.getByPlaceholderText(/Cole aqui o texto/)
      fireEvent.change(textarea, { target: { value: importText } })

      const analyzeButton = screen.getByText('Analisar Texto')
      fireEvent.click(analyzeButton)

      await waitFor(() => {
        expect(screen.getByText(/Análise concluída com sucesso!/)).toBeInTheDocument()
      })

      expect(screen.getByText('Tróia')).toBeInTheDocument()
      expect(screen.getByText(/2 perguntas/)).toBeInTheDocument()
    })

    it('deve identificar múltiplos filmes', async () => {
      const importText = `⚔️ TRÓIA
Nível 5
1. Pergunta 1?
Resposta 1

LILO & STITCH
Nível 10
1. Pergunta 2?
Resposta 2`

      render(
        <QuestionImportModal
          isOpen={true}
          onClose={mockOnClose}
          columns={mockColumns}
          onImport={mockOnImport}
        />
      )

      const textarea = screen.getByPlaceholderText(/Cole aqui o texto/)
      fireEvent.change(textarea, { target: { value: importText } })

      const analyzeButton = screen.getByText('Analisar Texto')
      fireEvent.click(analyzeButton)

      await waitFor(() => {
        expect(screen.getByText(/Análise concluída com sucesso!/)).toBeInTheDocument()
      })

      expect(screen.getByText('Tróia')).toBeInTheDocument()
      expect(screen.getByText('Lilo & Stitch')).toBeInTheDocument()
    })

    it('deve identificar diferentes níveis de pontuação', async () => {
      const importText = `⚔️ TRÓIA
Nível 5
1. Pergunta 5 pontos?
Resposta 5

Nível 10
1. Pergunta 10 pontos?
Resposta 10

Nível 20
1. Pergunta 20 pontos?
Resposta 20`

      render(
        <QuestionImportModal
          isOpen={true}
          onClose={mockOnClose}
          columns={mockColumns}
          onImport={mockOnImport}
        />
      )

      const textarea = screen.getByPlaceholderText(/Cole aqui o texto/)
      fireEvent.change(textarea, { target: { value: importText } })

      const analyzeButton = screen.getByText('Analisar Texto')
      fireEvent.click(analyzeButton)

      await waitFor(() => {
        expect(screen.getByText(/Análise concluída com sucesso!/)).toBeInTheDocument()
      })

      expect(screen.getByText(/3 perguntas/)).toBeInTheDocument()
    })

    it('deve mostrar aviso quando filme não é encontrado', async () => {
      const importText = `FILME INEXISTENTE
Nível 5
1. Pergunta?
Resposta`

      render(
        <QuestionImportModal
          isOpen={true}
          onClose={mockOnClose}
          columns={mockColumns}
          onImport={mockOnImport}
        />
      )

      const textarea = screen.getByPlaceholderText(/Cole aqui o texto/)
      fireEvent.change(textarea, { target: { value: importText } })

      const analyzeButton = screen.getByText('Analisar Texto')
      fireEvent.click(analyzeButton)

      await waitFor(() => {
        expect(screen.getByText(/Avisos:/)).toBeInTheDocument()
        expect(screen.getByText(/Filme não encontrado no board/)).toBeInTheDocument()
      })
    })

    it('deve mostrar aviso quando pergunta não tem resposta', async () => {
      const importText = `⚔️ TRÓIA
Nível 5
1. Pergunta sem resposta?`

      render(
        <QuestionImportModal
          isOpen={true}
          onClose={mockOnClose}
          columns={mockColumns}
          onImport={mockOnImport}
        />
      )

      const textarea = screen.getByPlaceholderText(/Cole aqui o texto/)
      fireEvent.change(textarea, { target: { value: importText } })

      const analyzeButton = screen.getByText('Analisar Texto')
      fireEvent.click(analyzeButton)

      await waitFor(() => {
        expect(screen.getByText(/Avisos:/)).toBeInTheDocument()
        expect(screen.getByText(/Pergunta sem resposta/)).toBeInTheDocument()
      })
    })
  })

  describe('Validação', () => {
    it('deve desabilitar botão Analisar quando texto está vazio', () => {
      render(
        <QuestionImportModal
          isOpen={true}
          onClose={mockOnClose}
          columns={mockColumns}
          onImport={mockOnImport}
        />
      )

      const analyzeButton = screen.getByText('Analisar Texto')
      expect(analyzeButton).toBeDisabled()
    })

    it('deve habilitar botão Analisar quando há texto', () => {
      render(
        <QuestionImportModal
          isOpen={true}
          onClose={mockOnClose}
          columns={mockColumns}
          onImport={mockOnImport}
        />
      )

      const textarea = screen.getByPlaceholderText(/Cole aqui o texto/)
      fireEvent.change(textarea, { target: { value: 'Texto de teste' } })

      const analyzeButton = screen.getByText('Analisar Texto')
      expect(analyzeButton).not.toBeDisabled()
    })
  })

  describe('Importação', () => {
    it('deve chamar onImport ao confirmar importação', async () => {
      const importText = `⚔️ TRÓIA
Nível 5
1. Pergunta?
Resposta`

      render(
        <QuestionImportModal
          isOpen={true}
          onClose={mockOnClose}
          columns={mockColumns}
          onImport={mockOnImport}
        />
      )

      const textarea = screen.getByPlaceholderText(/Cole aqui o texto/)
      fireEvent.change(textarea, { target: { value: importText } })

      const analyzeButton = screen.getByText('Analisar Texto')
      fireEvent.click(analyzeButton)

      await waitFor(() => {
        expect(screen.getByText('Importar Perguntas')).toBeInTheDocument()
      })

      const importButton = screen.getByText('Importar Perguntas')
      fireEvent.click(importButton)

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              filmName: 'Tróia',
              columnId: 'col-1',
              questions: expect.arrayContaining([
                expect.objectContaining({
                  points: 5,
                  question: 'Pergunta?',
                  answer: 'Resposta'
                })
              ])
            })
          ])
        )
      })
    })

    it('não deve importar se análise falhou', async () => {
      const importText = `FILME INEXISTENTE
Nível 5
1. Pergunta?
Resposta`

      render(
        <QuestionImportModal
          isOpen={true}
          onClose={mockOnClose}
          columns={mockColumns}
          onImport={mockOnImport}
        />
      )

      const textarea = screen.getByPlaceholderText(/Cole aqui o texto/)
      fireEvent.change(textarea, { target: { value: importText } })

      const analyzeButton = screen.getByText('Analisar Texto')
      fireEvent.click(analyzeButton)

      await waitFor(() => {
        const importButton = screen.getByText('Importar Perguntas')
        expect(importButton).toBeDisabled()
      })

      expect(mockOnImport).not.toHaveBeenCalled()
    })
  })

  describe('Navegação', () => {
    it('deve permitir voltar após análise', async () => {
      const importText = `⚔️ TRÓIA
Nível 5
1. Pergunta?
Resposta`

      render(
        <QuestionImportModal
          isOpen={true}
          onClose={mockOnClose}
          columns={mockColumns}
          onImport={mockOnImport}
        />
      )

      const textarea = screen.getByPlaceholderText(/Cole aqui o texto/)
      fireEvent.change(textarea, { target: { value: importText } })

      const analyzeButton = screen.getByText('Analisar Texto')
      fireEvent.click(analyzeButton)

      await waitFor(() => {
        expect(screen.getByText('Voltar')).toBeInTheDocument()
      })

      const backButton = screen.getByText('Voltar')
      fireEvent.click(backButton)

      expect(screen.getByPlaceholderText(/Cole aqui o texto/)).toBeInTheDocument()
    })

    it('deve chamar onClose ao cancelar', () => {
      render(
        <QuestionImportModal
          isOpen={true}
          onClose={mockOnClose}
          columns={mockColumns}
          onImport={mockOnImport}
        />
      )

      const cancelButton = screen.getByText('Cancelar')
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})


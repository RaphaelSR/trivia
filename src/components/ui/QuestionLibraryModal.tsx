import { useState, useMemo } from 'react'
import { Plus, Trash2, Download, Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'
import type { TriviaColumn, TriviaQuestionTile } from '@/modules/trivia/types'
import {
  exportFilmsWithQuestions,
  downloadJsonFile,
  importFilmsWithQuestions,
  convertImportToColumns,
  type FilmImportResult,
} from '@/modules/control/utils/filmExportUtils'
import { createQuestionTileId } from '@/modules/control/utils/questionUtils'
import { toast } from 'sonner'

type QuestionLibraryModalProps = {
  isOpen: boolean
  onClose: () => void
  board: TriviaColumn[]
  onUpdateColumnTitle: (columnId: string, film: string) => void
  onAddQuestion: (columnId: string) => void
  onRemoveQuestion: (columnId: string, tileId: string) => void
  onUpdateTileContent: (
    tileId: string,
    updates: Partial<Pick<TriviaQuestionTile, 'question' | 'answer' | 'points'>>
  ) => void
  onAddFilm: () => void
  onRemoveFilm: (columnId: string, filmName: string) => void
  onImportFilms?: (
    importData: Array<{
      column: Omit<TriviaColumn, 'id' | 'tiles'>
      tiles: Array<Omit<TriviaQuestionTile, 'id'>>
    }>
  ) => void
}

/**
 * Modal melhorado para gerenciar biblioteca de perguntas
 * Com UI/UX aprimorado: modal maior, textareas maiores, melhor organização
 */
export function QuestionLibraryModal({
  isOpen,
  onClose,
  board,
  onUpdateColumnTitle,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateTileContent,
  onAddFilm,
  onRemoveFilm,
  onImportFilms,
}: QuestionLibraryModalProps) {
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPoints, setFilterPoints] = useState<number | null>(null)
  const [importPreview, setImportPreview] = useState<FilmImportResult | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)

  const handleToggleAccordion = (columnId: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }))
  }

  const filteredBoard = useMemo(() => {
    let filtered = board

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (column) =>
          column.film.toLowerCase().includes(query) ||
          column.tiles.some(
            (tile) =>
              tile.question.toLowerCase().includes(query) ||
              tile.answer.toLowerCase().includes(query)
          )
      )
    }

    if (filterPoints !== null) {
      filtered = filtered.map((column) => ({
        ...column,
        tiles: column.tiles.filter((tile) => tile.points === filterPoints),
      })).filter((column) => column.tiles.length > 0)
    }

    return filtered
  }, [board, searchQuery, filterPoints])

  const totalQuestions = useMemo(() => {
    return board.reduce((acc, column) => acc + column.tiles.length, 0)
  }, [board])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      style={{ backgroundColor: 'var(--color-overlay)' }}
    >
      <div className="card-surface max-h-[90vh] w-full max-w-7xl overflow-hidden rounded-3xl flex flex-col bg-[var(--color-background)]">
        <div className="flex items-start justify-between px-8 pt-8 pb-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <div className="space-y-2 pr-4 flex-1">
            <h2 className="text-3xl font-semibold text-[var(--color-text)]">
              Biblioteca de Perguntas
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              Gerencie filmes, perguntas e respostas do tabuleiro. {totalQuestions} pergunta{totalQuestions !== 1 ? 's' : ''} no total.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const exportData = exportFilmsWithQuestions(board)
                const filename = `trivia-films-${new Date().toISOString().split('T')[0]}.json`
                downloadJsonFile(exportData, filename)
              }}
              className="gap-2"
            >
              <Download size={16} />
              Exportar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="gap-2"
            >
              <Upload size={16} />
              Importar
            </Button>
            <Button variant="outline" size="sm" onClick={onAddFilm} className="gap-2">
              <Plus size={16} />
              Adicionar filme
            </Button>
            <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
              <X size={18} />
            </Button>
          </div>
        </div>

        <div className="px-8 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por filme, pergunta ou resposta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] pl-10 pr-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="filter-points" className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                        Filtrar por pontos:
                      </label>
                      <select
                        id="filter-points"
                        value={filterPoints === null ? '' : filterPoints}
                        onChange={(e) => setFilterPoints(e.target.value ? Number(e.target.value) : null)}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
                      >
                <option value="">Todos</option>
                <option value="5">5 pts</option>
                <option value="10">10 pts</option>
                <option value="15">15 pts</option>
                <option value="20">20 pts</option>
                <option value="30">30 pts</option>
                <option value="50">50 pts</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {filteredBoard.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-8 py-16 text-center">
              <p className="text-base text-[var(--color-muted)]">
                {board.length === 0
                  ? 'Nenhum filme adicionado ainda. Adicione um filme para começar.'
                  : 'Nenhum resultado encontrado com os filtros aplicados.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredBoard.map((column) => {
                const open = openAccordions[column.id] ?? false
                const pointSummary = column.tiles.reduce<Record<number, number>>((acc, tile) => {
                  acc[tile.points] = (acc[tile.points] ?? 0) + 1
                  return acc
                }, {})

                return (
                  <div
                    key={column.id}
                    className="rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-background)] overflow-hidden transition-all hover:border-[var(--color-primary)]/50 hover:shadow-md hover:shadow-[var(--color-primary)]/10"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-6 py-4 text-left bg-[var(--color-background)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-background)_92%)] transition-colors"
                      onClick={() => handleToggleAccordion(column.id)}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-semibold text-[var(--color-text)]">
                          {column.film}
                        </span>
                        <div className="flex items-center gap-2">
                          {Object.entries(pointSummary).map(([points, count]) => (
                            <span
                              key={`${column.id}-${points}`}
                              className="rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-primary)]"
                            >
                              {points} pts · {count}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[var(--color-muted)]">
                        <span className="font-medium">
                          {column.tiles.length} pergunta{column.tiles.length !== 1 ? 's' : ''}
                        </span>
                        <span className="uppercase tracking-[0.3em] text-xs">
                          {open ? 'recolher' : 'expandir'}
                        </span>
                      </div>
                    </button>

                    {open && (
                      <div className="space-y-6 px-6 py-6 bg-[var(--color-background)]">
                        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
                          <label className="flex flex-1 min-w-[300px] flex-col gap-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                              Nome do filme
                            </span>
                            <input
                              value={column.film}
                              onChange={(event) => onUpdateColumnTitle(column.id, event.target.value)}
                              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-base text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                            />
                          </label>
                          <div className="flex items-center gap-3">
                            <Button variant="outline" size="sm" onClick={() => onAddQuestion(column.id)} className="gap-2">
                              <Plus size={16} />
                              Adicionar Pergunta
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`Remover o filme "${column.film}" e todas as suas perguntas?`)) {
                                  onRemoveFilm(column.id, column.film)
                                }
                              }}
                              className="gap-2 text-[var(--color-danger)] hover:text-[var(--color-danger)]/80 hover:bg-[var(--color-danger)]/10"
                            >
                              <Trash2 size={16} />
                              Remover Filme
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {[...column.tiles].sort((a, b) => a.points - b.points).map((tile) => (
                            <div
                              key={tile.id}
                              className="space-y-4 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] p-5 hover:border-[var(--color-primary)]/50 hover:bg-[color-mix(in_srgb,var(--color-primary)_5%,var(--color-background)_95%)] transition-colors"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <label className="flex items-center gap-3">
                                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)] whitespace-nowrap">
                                    Pontos
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={5}
                                    value={tile.points}
                                    onChange={(event) =>
                                      onUpdateTileContent(tile.id, { points: Number(event.target.value) })
                                    }
                                    className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-base font-semibold text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                  />
                                </label>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onRemoveQuestion(column.id, tile.id)}
                                  aria-label="Remover pergunta"
                                  className="text-[var(--color-danger)] hover:text-[var(--color-danger)]/80 hover:bg-[var(--color-danger)]/10"
                                >
                                  <Trash2 size={18} />
                                </Button>
                              </div>

                              <div className="space-y-2">
                                <label className="block">
                                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)] mb-2 block">
                                    Pergunta
                                  </span>
                                  <textarea
                                    value={tile.question}
                                    onChange={(event) =>
                                      onUpdateTileContent(tile.id, { question: event.target.value })
                                    }
                                    className="w-full min-h-[100px] rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-base text-[var(--color-text)] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    placeholder="Digite a pergunta..."
                                  />
                                </label>
                              </div>

                              <div className="space-y-2">
                                <label className="block">
                                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)] mb-2 block">
                                    Resposta
                                  </span>
                                  <textarea
                                    value={tile.answer}
                                    onChange={(event) =>
                                      onUpdateTileContent(tile.id, { answer: event.target.value })
                                    }
                                    className="w-full min-h-[80px] rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-base text-[var(--color-text)] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    placeholder="Digite a resposta..."
                                  />
                                </label>
                              </div>
                            </div>
                          ))}

                          {column.tiles.length === 0 && (
                            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-6 py-8 text-center">
                              <p className="text-sm text-[var(--color-muted)] mb-3">
                                Nenhuma pergunta adicionada ainda
                              </p>
                              <Button variant="outline" size="sm" onClick={() => onAddQuestion(column.id)} className="gap-2">
                                <Plus size={16} />
                                Adicionar Primeira Pergunta
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-8 py-4 border-t border-[var(--color-border)] bg-[var(--color-background)] flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>

      {showImportModal && (
        <Modal
          isOpen={showImportModal}
          title={importPreview ? "Preview de Importação" : "Importar Filmes e Perguntas"}
          description={importPreview ? "Revise os filmes e perguntas antes de importar" : "Importe filmes e perguntas de um arquivo JSON"}
          onClose={() => {
            setShowImportModal(false)
            setImportPreview(null)
          }}
        >
          <div className="space-y-4">
            {!importPreview && (
              <>
                <div className="p-4 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-sm text-[var(--color-text)]">
                      <p className="font-semibold mb-2">Como importar:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs text-[var(--color-muted)]">
                        <li>Exporte seus filmes e perguntas usando o botão "Exportar"</li>
                        <li>Ou crie um arquivo JSON seguindo o formato abaixo</li>
                        <li>Selecione o arquivo usando o botão abaixo</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-[var(--color-text)]">Formato JSON esperado:</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const example = {
                          version: '1.0',
                          exportedAt: new Date().toISOString(),
                          films: [
                            {
                              name: 'Matrix',
                              year: 1999,
                              genre: 'ficção-científica',
                              streaming: 'netflix',
                              link: 'https://example.com/matrix',
                              notes: 'Filme clássico',
                              addedBy: 'João',
                              questions: [
                                {
                                  points: 10,
                                  question: 'Qual é o nome do protagonista?',
                                  answer: 'Neo'
                                },
                                {
                                  points: 20,
                                  question: 'Em que ano o filme foi lançado?',
                                  answer: '1999'
                                }
                              ]
                            },
                            {
                              name: 'Titanic',
                              questions: [
                                {
                                  points: 15,
                                  question: 'Qual é o nome do navio?',
                                  answer: 'Titanic'
                                }
                              ]
                            }
                          ]
                        }
                        const blob = new Blob([JSON.stringify(example, null, 2)], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = 'exemplo-importacao.json'
                        a.click()
                        URL.revokeObjectURL(url)
                        toast.success('Exemplo baixado!')
                      }}
                      className="text-xs"
                    >
                      Baixar exemplo
                    </Button>
                  </div>
                  <pre className="text-xs text-[var(--color-muted)] bg-[var(--color-background)] p-3 rounded-lg border border-[var(--color-border)] overflow-x-auto">
{`{
  "version": "1.0",
  "exportedAt": "2024-01-01T00:00:00.000Z",
  "films": [
    {
      "name": "Matrix",
      "year": 1999,
      "genre": "ficção-científica",
      "streaming": "netflix",
      "link": "https://example.com/matrix",
      "notes": "Filme clássico",
      "addedBy": "João",
      "questions": [
        {
          "points": 10,
          "question": "Qual é o nome do protagonista?",
          "answer": "Neo"
        },
        {
          "points": 20,
          "question": "Em que ano o filme foi lançado?",
          "answer": "1999"
        }
      ]
    },
    {
      "name": "Titanic",
      "questions": [
        {
          "points": 15,
          "question": "Qual é o nome do navio?",
          "answer": "Titanic"
        }
      ]
    }
  ]
}`}
                  </pre>
                  <p className="text-xs text-[var(--color-muted)] mt-2">
                    <strong className="text-[var(--color-text)]">Campos obrigatórios:</strong> name, questions (array com points, question, answer)
                    <br />
                    <strong className="text-[var(--color-text)]">Campos opcionais:</strong> year, genre, streaming, link, notes, addedBy
                  </p>
                </div>

                <div className="flex items-center justify-center p-6 border-2 border-dashed border-[var(--color-border)] rounded-xl">
                  <label className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 cursor-pointer transition">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                      <Upload size={18} />
                      Selecionar arquivo JSON
                    </span>
                    <input
                      type="file"
                      accept=".json,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return

                        const reader = new FileReader()
                        reader.onload = (event) => {
                          try {
                            const text = event.target?.result as string
                            const data = JSON.parse(text)
                            const result = importFilmsWithQuestions(data, board)
                            setImportPreview(result)
                          } catch (error) {
                            console.error('Erro ao ler arquivo:', error)
                            toast.error('Erro ao processar arquivo. Verifique se é um JSON válido.')
                          }
                        }
                        reader.readAsText(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
              </>
            )}

            {importPreview && (
              <div className="space-y-4">
                {importPreview.success && (
                  <div className="p-4 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/30">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[var(--color-success)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">
                          Arquivo válido! {importPreview.films.length} filme{importPreview.films.length !== 1 ? 's' : ''} encontrado{importPreview.films.length !== 1 ? 's' : ''}.
                        </p>
                        <p className="text-xs text-[var(--color-muted)] mt-1">
                          Total de perguntas: {importPreview.films.reduce((sum, f) => sum + f.questions.length, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {importPreview.errors.length > 0 && (
                  <div className="p-4 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-[var(--color-danger)] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--color-text)] mb-2">Erros encontrados:</p>
                        <ul className="text-xs text-[var(--color-muted)] space-y-1">
                          {importPreview.errors.map((error, i) => (
                            <li key={i}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {importPreview.warnings.length > 0 && (
                  <div className="p-4 rounded-xl bg-[var(--color-secondary)]/10 border border-[var(--color-secondary)]/30">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-[var(--color-secondary)] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--color-text)] mb-2">Avisos:</p>
                        <ul className="text-xs text-[var(--color-muted)] space-y-1 max-h-32 overflow-y-auto">
                          {importPreview.warnings.map((warning, i) => (
                            <li key={i}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {importPreview.films.map((film, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm text-[var(--color-text)]">{film.name}</h4>
                        <span className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded-full">
                          {film.questions.length} pergunta{film.questions.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {film.questions.slice(0, 3).map((q, j) => (
                          <div
                            key={j}
                            className="text-xs text-[var(--color-muted)] flex items-start gap-2"
                          >
                            <span className="font-semibold text-[var(--color-primary)]">
                              {q.points}pts
                            </span>
                            <span className="flex-1 line-clamp-1">{q.question}</span>
                          </div>
                        ))}
                        {film.questions.length > 3 && (
                          <p className="text-xs text-[var(--color-muted)] italic">
                            + {film.questions.length - 3} pergunta{film.questions.length - 3 !== 1 ? 's' : ''}...
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImportModal(false)
                      setImportPreview(null)
                    }}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!importPreview.success || !onImportFilms) return

                      const createColumnId = () => `import-${Date.now()}-${Math.random().toString(16).slice(2)}`
                      const columns = convertImportToColumns(
                        importPreview,
                        createColumnId,
                        createQuestionTileId
                      )

                      onImportFilms(columns)
                      toast.success(
                        `${importPreview.films.length} filme${importPreview.films.length !== 1 ? 's' : ''} importado${importPreview.films.length !== 1 ? 's' : ''} com sucesso!`
                      )
                      setShowImportModal(false)
                      setImportPreview(null)
                    }}
                    disabled={!importPreview.success}
                    className="flex-1"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Importar Filmes
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}


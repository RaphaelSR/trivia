import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, Plus, Trash2, Upload, X } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'
import type { TriviaColumn, TriviaQuestionTile } from '@/modules/trivia/types'
import { countTotalTiles } from '@/modules/game/domain/board.utils'
import { EmptyStatePanel } from '@/modules/control/ui/EmptyStatePanel'
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
  selectedFilmId?: string | null
  onSelectedFilmIdChange?: (value: string | null) => void
  searchQuery?: string
  onSearchQueryChange?: (value: string) => void
  filterPoints?: number | null
  onFilterPointsChange?: (value: number | null) => void
  sortMode?: 'az' | 'questions' | 'points'
  onSortModeChange?: (value: 'az' | 'questions' | 'points') => void
  onUpdateColumnTitle: (columnId: string, film: string) => void
  onAddQuestion: (columnId: string) => void
  onRemoveQuestion: (columnId: string, tileId: string) => void
  onUpdateTileContent: (
    tileId: string,
    updates: Partial<Pick<TriviaQuestionTile, 'question' | 'answer' | 'points'>>,
  ) => void
  onAddFilm: () => void
  onRemoveFilm: (columnId: string, filmName: string) => void
  onImportFilms?: (
    importData: Array<{
      column: Omit<TriviaColumn, 'id' | 'tiles'>
      tiles: Array<Omit<TriviaQuestionTile, 'id'>>
    }>,
  ) => void
}

function sortColumns(columns: TriviaColumn[], mode: 'az' | 'questions' | 'points') {
  const next = [...columns]
  switch (mode) {
    case 'questions':
      return next.sort((a, b) => b.tiles.length - a.tiles.length || a.film.localeCompare(b.film, 'pt-BR'))
    case 'points':
      return next.sort((a, b) => {
        const pointsA = a.tiles.reduce((sum, tile) => sum + tile.points, 0)
        const pointsB = b.tiles.reduce((sum, tile) => sum + tile.points, 0)
        return pointsB - pointsA || a.film.localeCompare(b.film, 'pt-BR')
      })
    case 'az':
    default:
      return next.sort((a, b) => a.film.localeCompare(b.film, 'pt-BR'))
  }
}

function getPointSummary(column: TriviaColumn) {
  return [...column.tiles]
    .sort((a, b) => a.points - b.points)
    .reduce<Record<number, number>>((acc, tile) => {
      acc[tile.points] = (acc[tile.points] ?? 0) + 1
      return acc
    }, {})
}

export function QuestionLibraryModal({
  isOpen,
  onClose,
  board,
  selectedFilmId,
  onSelectedFilmIdChange,
  searchQuery,
  onSearchQueryChange,
  filterPoints,
  onFilterPointsChange,
  sortMode,
  onSortModeChange,
  onUpdateColumnTitle,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateTileContent,
  onAddFilm,
  onRemoveFilm,
  onImportFilms,
}: QuestionLibraryModalProps) {
  const [internalSelectedFilmId, setInternalSelectedFilmId] = useState<string | null>(selectedFilmId ?? null)
  const [internalSearchQuery, setInternalSearchQuery] = useState(searchQuery ?? '')
  const [internalFilterPoints, setInternalFilterPoints] = useState<number | null>(filterPoints ?? null)
  const [internalSortMode, setInternalSortMode] = useState<'az' | 'questions' | 'points'>(sortMode ?? 'az')
  const [importPreview, setImportPreview] = useState<FilmImportResult | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)

  const activeSearchQuery = searchQuery ?? internalSearchQuery
  const activeFilterPoints = filterPoints ?? internalFilterPoints
  const activeSortMode = sortMode ?? internalSortMode
  const activeSelectedFilmId = selectedFilmId ?? internalSelectedFilmId

  const setSelectedFilm = (value: string | null) => {
    onSelectedFilmIdChange?.(value)
    setInternalSelectedFilmId(value)
  }

  const setSearch = (value: string) => {
    onSearchQueryChange?.(value)
    setInternalSearchQuery(value)
  }

  const setPointsFilter = (value: number | null) => {
    onFilterPointsChange?.(value)
    setInternalFilterPoints(value)
  }

  const setSort = (value: 'az' | 'questions' | 'points') => {
    onSortModeChange?.(value)
    setInternalSortMode(value)
  }

  const filteredBoard = useMemo(() => {
    const query = activeSearchQuery.trim().toLowerCase()
    const next = board.filter((column) => {
      const matchesQuery =
        !query ||
        column.film.toLowerCase().includes(query) ||
        column.tiles.some(
          (tile) => tile.question.toLowerCase().includes(query) || tile.answer.toLowerCase().includes(query),
        )

      if (!matchesQuery) {
        return false
      }

      if (activeFilterPoints === null) {
        return true
      }

      return column.tiles.some((tile) => tile.points === activeFilterPoints)
    })

    return sortColumns(next, activeSortMode)
  }, [activeFilterPoints, activeSearchQuery, activeSortMode, board])

  useEffect(() => {
    if (!filteredBoard.length) {
      if (activeSelectedFilmId !== null) {
        setSelectedFilm(null)
      }
      return
    }

    const stillExists = filteredBoard.some((column) => column.id === activeSelectedFilmId)
    if (!stillExists) {
      setSelectedFilm(filteredBoard[0]?.id ?? null)
    }
  }, [activeSelectedFilmId, filteredBoard])

  const selectedColumn = useMemo(
    () => filteredBoard.find((column) => column.id === activeSelectedFilmId) ?? null,
    [activeSelectedFilmId, filteredBoard],
  )

  const editorTiles = useMemo(() => {
    if (!selectedColumn) return []
    const baseTiles = [...selectedColumn.tiles].sort((a, b) => a.points - b.points)
    if (activeFilterPoints === null) return baseTiles
    return baseTiles.filter((tile) => tile.points === activeFilterPoints)
  }, [activeFilterPoints, selectedColumn])

  const totalQuestions = useMemo(() => countTotalTiles(board), [board])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'var(--color-overlay)' }}>
      <div className="card-surface flex max-h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[32px] bg-[var(--color-background)]">
        <div className="flex flex-col gap-4 border-b border-white/8 px-6 py-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--color-primary)]">Biblioteca</p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--color-text)]">Perguntas e filmes</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Organize o board em modo editor: escolha um filme à esquerda e ajuste as perguntas no painel principal. {totalQuestions} pergunta{totalQuestions !== 1 ? 's' : ''} no total.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
            <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)} className="gap-2">
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

        <div className="toolbar-sticky border-b border-white/8 px-6 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por filme, pergunta ou resposta..."
                value={activeSearchQuery}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={activeSortMode}
                onChange={(event) => setSort(event.target.value as 'az' | 'questions' | 'points')}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[var(--color-text)]"
              >
                <option value="az">A-Z</option>
                <option value="questions">Mais perguntas</option>
                <option value="points">Mais pontos</option>
              </select>
              <select
                value={activeFilterPoints === null ? '' : activeFilterPoints}
                onChange={(event) => setPointsFilter(event.target.value ? Number(event.target.value) : null)}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[var(--color-text)]"
              >
                <option value="">Todos os pontos</option>
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

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-white/8 bg-black/10 xl:border-b-0 xl:border-r xl:border-white/8">
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-white/8 px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--color-muted)]">Filmes</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {filteredBoard.length === 0 ? (
                  <EmptyStatePanel
                    title="Nada encontrado"
                    description={board.length === 0 ? 'Adicione o primeiro filme para começar a montar o board.' : 'Nenhum filme corresponde aos filtros atuais.'}
                  />
                ) : (
                  <div className="space-y-2">
                    {filteredBoard.map((column) => {
                      const pointSummary = getPointSummary(column)
                      const isSelected = column.id === activeSelectedFilmId
                      return (
                        <button
                          key={column.id}
                          type="button"
                          onClick={() => setSelectedFilm(column.id)}
                          className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${isSelected ? 'nav-item-active' : 'border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[var(--color-text)]">{column.film}</p>
                              <p className="mt-1 text-xs text-[var(--color-muted)]">{column.tiles.length} pergunta{column.tiles.length !== 1 ? 's' : ''}</p>
                            </div>
                            <span className="rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">editor</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Object.entries(pointSummary).slice(0, 4).map(([points, count]) => (
                              <span key={`${column.id}-${points}`} className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary)]">
                                {points} · {count}
                              </span>
                            ))}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>

          <section className="editor-pane min-h-0 overflow-y-auto px-6 py-5">
            {!selectedColumn ? (
              <EmptyStatePanel
                title="Selecione um filme"
                description="Escolha um item na coluna da esquerda para editar título, pontos, perguntas e respostas."
              />
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-black/10 p-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--color-muted)]">Filme selecionado</p>
                    <input
                      value={selectedColumn.film}
                      onChange={(event) => onUpdateColumnTitle(selectedColumn.id, event.target.value)}
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-lg font-semibold text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    <p className="mt-2 text-sm text-[var(--color-muted)]">{selectedColumn.tiles.length} pergunta{selectedColumn.tiles.length !== 1 ? 's' : ''} conectadas a este filme.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Button variant="secondary" size="sm" onClick={() => onAddQuestion(selectedColumn.id)} className="gap-2">
                      <Plus size={16} />
                      Adicionar pergunta
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Remover o filme "${selectedColumn.film}" e todas as suas perguntas?`)) {
                          onRemoveFilm(selectedColumn.id, selectedColumn.film)
                        }
                      }}
                      className="gap-2 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
                    >
                      <Trash2 size={16} />
                      Remover filme
                    </Button>
                  </div>
                </div>

                {editorTiles.length === 0 ? (
                  <EmptyStatePanel
                    title="Sem perguntas neste filme"
                    description="Adicione a primeira pergunta para começar a preencher o tabuleiro deste filme."
                    action={
                      <Button variant="outline" size="sm" onClick={() => onAddQuestion(selectedColumn.id)} className="gap-2">
                        <Plus size={16} />
                        Criar primeira pergunta
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {editorTiles.map((tile) => (
                      <article key={tile.id} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-4 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--color-muted)]">Pontos</p>
                              <input
                                type="number"
                                min={0}
                                step={5}
                                value={tile.points}
                                onChange={(event) => onUpdateTileContent(tile.id, { points: Number(event.target.value) })}
                                className="mt-2 w-24 bg-transparent text-2xl font-semibold text-[var(--color-text)] outline-none"
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveQuestion(selectedColumn.id, tile.id)}
                            aria-label="Remover pergunta"
                            className="text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>

                        <div className="mt-5 grid gap-4 xl:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--color-muted)]">Pergunta</span>
                            <textarea
                              value={tile.question}
                              onChange={(event) => onUpdateTileContent(tile.id, { question: event.target.value })}
                              className="min-h-[150px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                              placeholder="Digite a pergunta..."
                            />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--color-muted)]">Resposta</span>
                            <textarea
                              value={tile.answer}
                              onChange={(event) => onUpdateTileContent(tile.id, { answer: event.target.value })}
                              className="min-h-[150px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                              placeholder="Digite a resposta..."
                            />
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {showImportModal ? (
        <Modal
          isOpen={showImportModal}
          title={importPreview ? 'Preview de Importação' : 'Importar filmes e perguntas'}
          description={importPreview ? 'Revise o conteúdo antes de aplicar ao board.' : 'Selecione um arquivo JSON exportado pela própria biblioteca.'}
          onClose={() => {
            setShowImportModal(false)
            setImportPreview(null)
          }}
        >
          <div className="space-y-4">
            {!importPreview ? (
              <>
                <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--color-primary)]" />
                    <div className="flex-1 text-sm text-[var(--color-text)]">
                      <p className="mb-2 font-semibold">Como importar</p>
                      <ol className="list-inside list-decimal space-y-1 text-xs text-[var(--color-muted)]">
                        <li>Exporte a biblioteca atual.</li>
                        <li>Ou monte um JSON no mesmo formato.</li>
                        <li>Selecione o arquivo e revise o preview.</li>
                      </ol>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] p-6">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-6 py-3 transition hover:bg-[var(--color-primary)]/20">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                      <Upload size={18} />
                      Selecionar JSON
                    </span>
                    <input
                      type="file"
                      accept=".json,.txt"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (!file) return

                        const reader = new FileReader()
                        reader.onload = (loadEvent) => {
                          try {
                            const text = loadEvent.target?.result as string
                            const data = JSON.parse(text)
                            const result = importFilmsWithQuestions(data, board)
                            setImportPreview(result)
                          } catch {
                            toast.error('Erro ao processar arquivo. Verifique se é um JSON válido.')
                          }
                        }
                        reader.readAsText(file)
                        event.target.value = ''
                      }}
                    />
                  </label>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {importPreview.success ? (
                  <div className="rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--color-success)]" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">
                          {importPreview.films.length} filme{importPreview.films.length !== 1 ? 's' : ''} pronto{importPreview.films.length !== 1 ? 's' : ''} para importar.
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          Total de perguntas: {importPreview.films.reduce((sum, film) => sum + film.questions.length, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {importPreview.errors.length > 0 ? (
                  <div className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--color-danger)]" />
                      <div className="flex-1">
                        <p className="mb-2 text-sm font-semibold text-[var(--color-text)]">Erros encontrados</p>
                        <ul className="space-y-1 text-xs text-[var(--color-muted)]">
                          {importPreview.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}

                {importPreview.warnings.length > 0 ? (
                  <div className="rounded-xl border border-[var(--color-secondary)]/30 bg-[var(--color-secondary)]/10 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--color-secondary)]" />
                      <div className="flex-1">
                        <p className="mb-2 text-sm font-semibold text-[var(--color-text)]">Avisos</p>
                        <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-[var(--color-muted)]">
                          {importPreview.warnings.map((warning, index) => (
                            <li key={index}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="max-h-80 space-y-3 overflow-y-auto">
                  {importPreview.films.map((film, index) => (
                    <div key={index} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-[var(--color-text)]">{film.name}</h4>
                        <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-1 text-xs font-semibold text-[var(--color-primary)]">
                          {film.questions.length} pergunta{film.questions.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1">
                        {film.questions.slice(0, 3).map((question, questionIndex) => (
                          <div key={questionIndex} className="flex items-start gap-2 text-xs text-[var(--color-muted)]">
                            <span className="font-semibold text-[var(--color-primary)]">{question.points}pts</span>
                            <span className="line-clamp-1 flex-1">{question.question}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setImportPreview(null)} className="flex-1">
                    Voltar
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={!importPreview.success}
                    onClick={() => {
                      if (!importPreview.success || !onImportFilms) return

                      const createColumnId = () => `import-${Date.now()}-${Math.random().toString(16).slice(2)}`
                      const columns = convertImportToColumns(importPreview, createColumnId, createQuestionTileId)
                      onImportFilms(columns)
                      toast.success(`${importPreview.films.length} filme${importPreview.films.length !== 1 ? 's' : ''} importado${importPreview.films.length !== 1 ? 's' : ''} com sucesso!`)
                      setShowImportModal(false)
                      setImportPreview(null)
                    }}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Importar filmes
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

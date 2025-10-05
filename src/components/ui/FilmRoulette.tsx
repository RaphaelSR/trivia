import { Film, History, RotateCcw, Shuffle, Users, X, Settings, Play, CheckCircle } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { Button } from './Button'
import { FilmManager } from './FilmManager'
import { Steps } from './Steps'
import { Tooltip } from './Tooltip'
import { MultiSelectField } from './MultiSelectField'
import { useCustomFilms } from '../../hooks/useCustomFilms'
import { getStreamingPlatformInfo, getFilmGenreInfo, type CustomFilm, type StreamingPlatform, type FilmGenre } from '../../data/customFilms'
import type { TriviaParticipant, TriviaTeam } from '../../modules/trivia/types'

type FilmRouletteProps = {
  isOpen: boolean
  onClose: () => void
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
}

type RouletteMode = 'one-per-person' | 'all-films' | 'specific-quantity'

type SelectedParticipant = {
  id: string
  name: string
  teamName: string
  selected: boolean
}

type SelectedFilm = {
  id: string
  name: string
  year?: number
  genre?: string
  streaming?: string
  link?: string
  selected: boolean
}

type RouletteResult = {
  participantId: string
  participantName: string
  teamName: string
  film: CustomFilm
}

type RouletteHistory = {
  id: string
  timestamp: string
  mode: RouletteMode
  results: RouletteResult[]
  participantCount: number
  uniqueFilms: number
}

export function FilmRoulette({ isOpen, onClose, teams, participants }: FilmRouletteProps) {
  const { films: customFilms, addFilm, updateFilm, removeFilm } = useCustomFilms()
  const [mode, setMode] = useState<RouletteMode>('one-per-person')
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>([])
  const [selectedFilms, setSelectedFilms] = useState<SelectedFilm[]>([])
  const [specificQuantity, setSpecificQuantity] = useState(3)
  const [isSpinning, setIsSpinning] = useState(false)
  const [results, setResults] = useState<RouletteResult[]>([])
  const [history, setHistory] = useState<RouletteHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [currentStep, setCurrentStep] = useState<'films' | 'setup' | 'roulette' | 'results'>('films')
  const [rouletteRotation, setRouletteRotation] = useState(0)

  useEffect(() => {
    if (isOpen) {
      const initialParticipants: SelectedParticipant[] = participants
        .filter(p => p.role === 'player')
        .map(participant => {
          const team = teams.find(t => t.id === participant.teamId)
          return {
            id: participant.id,
            name: participant.name,
            teamName: team?.name ?? 'Sem time',
            selected: true
          }
        })
      
      const initialFilms: SelectedFilm[] = customFilms.map(film => ({
        id: film.id,
        name: film.name,
        year: film.year,
        genre: film.genre,
        streaming: film.streaming,
        link: film.link,
        selected: true
      }))
      
      setSelectedParticipants(initialParticipants)
      setSelectedFilms(initialFilms)
      setResults([])
      setShowHistory(false)
      setCurrentStep('films')
      setRouletteRotation(0)
      
      // Carregar histórico do localStorage
      const savedHistory = localStorage.getItem('trivia-roulette-history')
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory))
        } catch (error) {
          console.warn('Erro ao carregar histórico de sorteios:', error)
        }
      }
    }
  }, [isOpen, participants, teams, customFilms])

  const saveToHistory = (newResults: RouletteResult[]) => {
    const historyEntry: RouletteHistory = {
      id: `roulette-${Date.now()}`,
      timestamp: new Date().toISOString(),
      mode,
      results: newResults,
      participantCount: newResults.length,
      uniqueFilms: new Set(newResults.map(r => r.film.id)).size
    }
    
    const newHistory = [historyEntry, ...history].slice(0, 10)
    setHistory(newHistory)
    
    try {
      localStorage.setItem('trivia-roulette-history', JSON.stringify(newHistory))
    } catch (error) {
      console.warn('Erro ao salvar histórico de sorteios:', error)
    }
  }

  const getSelectedCount = () => {
    return selectedParticipants.filter(p => p.selected).length
  }

  const getSelectedFilmsCount = () => {
    return selectedFilms.filter(f => f.selected).length
  }

  const getSelectedFilms = (): CustomFilm[] => {
    const selectedFilmIds = selectedFilms.filter(f => f.selected).map(f => f.id)
    return customFilms.filter(film => selectedFilmIds.includes(film.id))
  }

  const startSetup = () => {
    if (getSelectedFilmsCount() === 0) return
    setCurrentStep('setup')
  }

  const startRoulette = () => {
    if (getSelectedCount() === 0 || getSelectedFilmsCount() === 0) return
    setCurrentStep('roulette')
  }

  const spinRoulette = () => {
    if (getSelectedCount() === 0 || getSelectedFilmsCount() === 0) return

    setIsSpinning(true)
    
    // Animação da roleta
    const spinDuration = 3000
    const startTime = Date.now()
    const startRotation = rouletteRotation
    const endRotation = startRotation + 360 * 5 + Math.random() * 360

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / spinDuration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentRotation = startRotation + (endRotation - startRotation) * easeOut
      
      setRouletteRotation(currentRotation)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)

    setTimeout(() => {
      const selected = selectedParticipants.filter(p => p.selected)
      const filmsToUse = getSelectedFilms()
      const newResults: RouletteResult[] = []

      switch (mode) {
        case 'one-per-person': {
          selected.forEach(participant => {
            const randomFilm = filmsToUse[Math.floor(Math.random() * filmsToUse.length)]
            newResults.push({
              participantId: participant.id,
              participantName: participant.name,
              teamName: participant.teamName,
              film: randomFilm
            })
          })
          break
        }
        case 'all-films': {
          const shuffledFilms = [...filmsToUse].sort(() => Math.random() - 0.5)
          selected.forEach((participant, index) => {
            const film = shuffledFilms[index % shuffledFilms.length]
            newResults.push({
              participantId: participant.id,
              participantName: participant.name,
              teamName: participant.teamName,
              film
            })
          })
          break
        }
        case 'specific-quantity': {
          const shuffledFilms = [...filmsToUse].sort(() => Math.random() - 0.5)
          const filmsToUseLimited = shuffledFilms.slice(0, specificQuantity)
          
          selected.forEach(participant => {
            const randomFilm = filmsToUseLimited[Math.floor(Math.random() * filmsToUseLimited.length)]
            newResults.push({
              participantId: participant.id,
              participantName: participant.name,
              teamName: participant.teamName,
              film: randomFilm
            })
          })
          break
        }
      }

      setResults(newResults)
      setIsSpinning(false)
      setCurrentStep('results')
      saveToHistory(newResults)
    }, spinDuration)
  }

  const resetRoulette = () => {
    setResults([])
    setIsSpinning(false)
    setCurrentStep('films')
    setRouletteRotation(0)
  }

  const handleStepClick = (stepId: string) => {
    // Permitir navegação apenas para steps anteriores ou o atual
    const stepOrder = ['films', 'setup', 'roulette', 'results']
    const currentIndex = stepOrder.indexOf(currentStep)
    const targetIndex = stepOrder.indexOf(stepId)
    
    // Só permite ir para steps anteriores ou o atual
    if (targetIndex <= currentIndex) {
      setCurrentStep(stepId as 'films' | 'setup' | 'roulette' | 'results')
    }
  }

  // Preparar dados para MultiSelectField
  const participantOptions = selectedParticipants.map(p => ({
    id: p.id,
    label: p.name,
    subtitle: p.teamName,
    badge: p.selected ? 'Selecionado' : undefined,
    badgeColor: p.selected ? '#10b981' : undefined,
    selected: p.selected
  }))

  const filmOptions = selectedFilms.map(f => {
    const streamingInfo = f.streaming ? getStreamingPlatformInfo(f.streaming as StreamingPlatform) : null
    const genreInfo = f.genre ? getFilmGenreInfo(f.genre as FilmGenre) : null
    
    return {
      id: f.id,
      label: f.name,
      subtitle: `${f.year ? `(${f.year})` : ''} ${genreInfo ? genreInfo.name : ''}`.trim(),
      badge: streamingInfo ? streamingInfo.name : undefined,
      badgeColor: streamingInfo?.color,
      selected: f.selected
    }
  })

  const handleParticipantSelection = (selectedIds: string[]) => {
    setSelectedParticipants(prev =>
      prev.map(p => ({ ...p, selected: selectedIds.includes(p.id) }))
    )
  }

  const handleFilmSelection = (selectedIds: string[]) => {
    setSelectedFilms(prev =>
      prev.map(f => ({ ...f, selected: selectedIds.includes(f.id) }))
    )
  }

  const handleSelectAllParticipants = () => {
    setSelectedParticipants(prev =>
      prev.map(p => ({ ...p, selected: true }))
    )
  }

  const handleSelectNoneParticipants = () => {
    setSelectedParticipants(prev =>
      prev.map(p => ({ ...p, selected: false }))
    )
  }

  const handleSelectAllFilms = () => {
    setSelectedFilms(prev =>
      prev.map(f => ({ ...f, selected: true }))
    )
  }

  const handleSelectNoneFilms = () => {
    setSelectedFilms(prev =>
      prev.map(f => ({ ...f, selected: false }))
    )
  }

  // Definir steps
  const stepOrder = ['films', 'setup', 'roulette', 'results']
  const currentIndex = stepOrder.indexOf(currentStep)
  
  const steps = [
    {
      id: 'films',
      title: 'Filmes',
      description: 'Gerenciar biblioteca',
      completed: currentStep !== 'films',
      current: currentStep === 'films',
      clickable: true // Sempre clicável
    },
    {
      id: 'setup',
      title: 'Configuração',
      description: 'Participantes e modo',
      completed: currentStep === 'roulette' || currentStep === 'results',
      current: currentStep === 'setup',
      clickable: currentIndex >= 1 // Clicável se já passou pelo step 1
    },
    {
      id: 'roulette',
      title: 'Roleta',
      description: 'Girar e sortear',
      completed: currentStep === 'results',
      current: currentStep === 'roulette',
      clickable: currentIndex >= 2 // Clicável se já passou pelo step 2
    },
    {
      id: 'results',
      title: 'Resultados',
      description: 'Ver filmes sorteados',
      completed: false,
      current: currentStep === 'results',
      clickable: currentIndex >= 3 // Clicável se já passou pelo step 3
    }
  ]

  if (!isOpen) return null

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="card-surface max-h-[90vh] w-full max-w-7xl overflow-hidden rounded-3xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-12 pt-12">
          <div className="space-y-3 pr-6">
            <h2 className="text-3xl font-bold text-[var(--color-text)]">🎪 Sorteio de Filmes</h2>
            <p className="text-base text-[var(--color-muted)]">Configure e execute o sorteio de filmes para o próximo trivia</p>
          </div>
          <div className="flex gap-3">
            <Tooltip content="Ver histórico de sorteios">
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Histórico" 
                onClick={() => setShowHistory(!showHistory)}
                className="h-12 w-12"
              >
                <History size={20} />
              </Button>
            </Tooltip>
            <Tooltip content="Fechar modal">
              <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClose} className="h-12 w-12">
                <X size={20} />
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Steps */}
        <div className="px-12 py-8">
          <Steps steps={steps} onStepClick={handleStepClick} />
        </div>
        
        {/* Content */}
        <div className="px-12 pb-12 flex-1 overflow-y-auto">
          {showHistory ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-primary)]/10 p-6">
                <History className="h-8 w-8 text-[var(--color-primary)]" />
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text)]">
                    Histórico de Sorteios
                  </h3>
                  <p className="text-sm text-[var(--color-muted)]">
                    Últimos {history.length} sorteios realizados
                  </p>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-6 py-16 text-center">
                  <p className="text-base text-[var(--color-muted)]">
                    Nenhum sorteio realizado ainda
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-base font-semibold text-[var(--color-text)]">
                            {new Date(entry.timestamp).toLocaleString('pt-BR')}
                          </h4>
                          <p className="text-sm text-[var(--color-muted)]">
                            {entry.participantCount} participante{entry.participantCount !== 1 ? 's' : ''} · {entry.uniqueFilms} filme{entry.uniqueFilms !== 1 ? 's' : ''} único{entry.uniqueFilms !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-sm font-medium text-[var(--color-primary)]">
                          {entry.mode === 'one-per-person' ? '1 por pessoa' :
                           entry.mode === 'all-films' ? 'Todos os filmes' :
                           `Quantidade específica`}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {entry.results.slice(0, 4).map((result, index) => (
                          <div key={index} className="flex items-center gap-3 text-sm">
                            <div 
                              className="h-6 w-6 rounded text-white text-xs flex items-center justify-center font-bold"
                              style={{ backgroundColor: result.film.streaming ? getStreamingPlatformInfo(result.film.streaming)?.color || '#6B7280' : '#6B7280' }}
                            >
                              {result.film.name.charAt(0)}
                            </div>
                            <span className="text-[var(--color-text)] font-medium">{result.film.name}</span>
                            <span className="text-[var(--color-muted)]">·</span>
                            <span className="text-[var(--color-muted)]">{result.participantName}</span>
                          </div>
                        ))}
                        {entry.results.length > 4 && (
                          <div className="text-sm text-[var(--color-muted)]">
                            +{entry.results.length - 4} mais...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setShowHistory(false)} className="px-6 py-3">
                  Voltar ao Sorteio
                </Button>
              </div>
            </div>
          ) : currentStep === 'films' ? (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-semibold text-[var(--color-text)]">🎬 Gerenciar Biblioteca de Filmes</h3>
                <p className="text-lg text-[var(--color-muted)]">
                  Adicione e organize os filmes que estarão disponíveis para o sorteio
                </p>
              </div>

              <div>
                <FilmManager
                  films={customFilms}
                  participants={participants}
                  onAddFilm={addFilm}
                  onUpdateFilm={updateFilm}
                  onRemoveFilm={removeFilm}
                  onClose={() => {}}
                />
              </div>

              <div className="flex items-center justify-center pt-6">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={startSetup}
                  disabled={getSelectedFilmsCount() === 0}
                  className="gap-4 px-8 py-4 text-lg"
                >
                  <Settings size={24} />
                  Continuar para Configuração
                </Button>
              </div>
            </div>
          ) : currentStep === 'setup' ? (
            <div className="space-y-8">
              {/* Tipo de Sorteio */}
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-[var(--color-text)]">Tipo de Sorteio</h3>
                <div className="grid gap-6 md:grid-cols-3">
                  {[
                    { id: 'one-per-person', label: '1 por pessoa', description: 'Cada participante sorteia 1 filme', icon: '👤' },
                    { id: 'all-films', label: 'Todos os filmes', description: 'Distribui todos os filmes selecionados', icon: '🎬' },
                    { id: 'specific-quantity', label: 'Quantidade específica', description: 'Sorteia de uma quantidade definida', icon: '🎯' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setMode(option.id as RouletteMode)}
                      className={`p-8 rounded-2xl border-2 transition-all ${
                        mode === option.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                          : 'border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-primary)]/50'
                      }`}
                    >
                      <div className="text-4xl mb-4">{option.icon}</div>
                      <h4 className="text-xl font-semibold text-[var(--color-text)] mb-3">{option.label}</h4>
                      <p className="text-base text-[var(--color-muted)]">{option.description}</p>
                    </button>
                  ))}
                </div>
                
                {mode === 'specific-quantity' && (
                  <div className="mt-6">
                    <label className="flex flex-col gap-3 text-base font-semibold text-[var(--color-text)]">
                      Quantidade de filmes
                      <input
                        type="number"
                        min="1"
                        max={getSelectedFilmsCount()}
                        value={specificQuantity}
                        onChange={(e) => setSpecificQuantity(Math.max(1, Math.min(getSelectedFilmsCount(), parseInt(e.target.value) || 1)))}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-6 py-4 text-lg text-[var(--color-text)] w-40"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Seleção de Participantes */}
              <MultiSelectField
                title="👥 Participantes"
                description="Selecione quem vai participar do sorteio"
                options={participantOptions}
                onSelectionChange={handleParticipantSelection}
                onSelectAll={handleSelectAllParticipants}
                onSelectNone={handleSelectNoneParticipants}
                searchPlaceholder="Buscar participantes..."
                emptyMessage="Nenhum participante encontrado"
                maxHeight="max-h-64"
              />

              {/* Seleção de Filmes */}
              <MultiSelectField
                title="🎬 Filmes na Roleta"
                description="Escolha quais filmes estarão disponíveis para o sorteio"
                options={filmOptions}
                onSelectionChange={handleFilmSelection}
                onSelectAll={handleSelectAllFilms}
                onSelectNone={handleSelectNoneFilms}
                searchPlaceholder="Buscar filmes..."
                emptyMessage="Nenhum filme encontrado"
                maxHeight="max-h-64"
              />

              {/* Botão de Ação */}
              <div className="flex items-center justify-center pt-6">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={startRoulette}
                  disabled={getSelectedCount() === 0 || getSelectedFilmsCount() === 0}
                  className="gap-4 px-8 py-4 text-lg"
                >
                  <Play size={24} />
                  Iniciar Roleta
                </Button>
              </div>
            </div>
          ) : currentStep === 'roulette' ? (
            <div className="space-y-8">
              <div className="flex items-center justify-center">
                <div className="relative">
                  {/* Roleta principal */}
                  <div 
                    className="w-[500px] h-[500px] rounded-full border-8 border-[var(--color-primary)] shadow-2xl transition-transform duration-3000 ease-out relative overflow-hidden"
                    style={{ 
                      transform: `rotate(${rouletteRotation}deg)`,
                      background: 'conic-gradient(from 0deg, #4f46e5, #22d3ee, #10b981, #f59e0b, #ef4444, #8b5cf6, #ec4899, #14b8a6, #4f46e5)'
                    }}
                  >
                    {/* Segmentos da roleta com filmes */}
                    {getSelectedFilms().map((film, index) => {
                      const angle = (360 / getSelectedFilms().length) * index
                      const streamingInfo = film.streaming ? getStreamingPlatformInfo(film.streaming) : null
                      
                      return (
                        <div
                          key={film.id}
                          className="absolute inset-0"
                          style={{
                            transform: `rotate(${angle}deg)`,
                            transformOrigin: 'center'
                          }}
                        >
                          <div 
                            className="absolute top-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-b-8 border-l-transparent border-r-transparent"
                            style={{ 
                              borderBottomColor: streamingInfo?.color || '#6B7280',
                              transform: 'translateX(-50%) rotate(90deg)'
                            }}
                          ></div>
                          <div 
                            className="absolute top-12 left-1/2 transform -translate-x-1/2 text-white text-sm font-bold text-center"
                            style={{ 
                              transform: 'translateX(-50%) rotate(90deg)',
                              width: '80px',
                              height: '80px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {film.name.substring(0, 10)}
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* Centro da roleta */}
                    <div className="absolute inset-12 rounded-full bg-[var(--color-background)] flex items-center justify-center shadow-inner">
                      <div className="text-center">
                        <Film className="h-20 w-20 text-[var(--color-primary)] mx-auto mb-4 animate-pulse" />
                        <p className="text-2xl font-bold text-[var(--color-text)]">ROULETTE</p>
                        <p className="text-lg text-[var(--color-muted)]">DE FILMES</p>
                        <div className="mt-3 text-sm text-[var(--color-muted)]">
                          {getSelectedFilmsCount()} filmes
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Ponteiro fixo */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4 z-10">
                    <div className="relative">
                      <div className="w-0 h-0 border-l-8 border-r-8 border-b-16 border-l-transparent border-r-transparent border-b-[var(--color-primary)] drop-shadow-lg"></div>
                      <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-[var(--color-primary)] rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Base da roleta */}
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-40 h-12 bg-gradient-to-t from-gray-600 to-gray-400 rounded-full shadow-lg"></div>
                </div>
              </div>

              <div className="text-center space-y-6">
                <h3 className="text-2xl font-semibold text-[var(--color-text)]">
                  {isSpinning ? '🎪 Girando a roleta...' : '🎯 Pronto para girar!'}
                </h3>
                <p className="text-lg text-[var(--color-muted)]">
                  {getSelectedCount()} participante{getSelectedCount() !== 1 ? 's' : ''} · {getSelectedFilmsCount()} filme{getSelectedFilmsCount() !== 1 ? 's' : ''} na roleta
                </p>
                
                {!isSpinning && (
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={spinRoulette}
                    className="gap-4 px-8 py-4 text-lg"
                  >
                    <Shuffle size={24} />
                    Girar Roleta
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 rounded-2xl bg-[var(--color-success)]/10 p-6">
                  <CheckCircle className="h-12 w-12 text-[var(--color-success)]" />
                  <div>
                    <h3 className="text-2xl font-semibold text-[var(--color-text)]">
                      🎉 Sorteio Concluído!
                    </h3>
                    <p className="text-lg text-[var(--color-muted)]">
                      {results.length} filme{results.length !== 1 ? 's' : ''} sorteados com sucesso
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={resetRoulette} className="gap-3 px-6 py-3">
                  <RotateCcw size={20} />
                  Novo Sorteio
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {results.map((result, index) => {
                  const streamingInfo = result.film.streaming ? getStreamingPlatformInfo(result.film.streaming) : null
                  const genreInfo = result.film.genre ? getFilmGenreInfo(result.film.genre) : null
                  
                  return (
                    <div
                      key={`${result.participantId}-${index}`}
                      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div 
                          className="flex h-16 w-16 items-center justify-center rounded-xl text-white font-bold text-xl"
                          style={{ backgroundColor: streamingInfo?.color || '#6B7280' }}
                        >
                          {result.film.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-lg font-semibold text-[var(--color-text)]">
                              {result.film.name}
                            </h4>
                            {result.film.year && (
                              <span className="text-sm text-[var(--color-muted)]">({result.film.year})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            {genreInfo && (
                              <span className="text-sm text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1 rounded-full">
                                {genreInfo.name}
                              </span>
                            )}
                            {streamingInfo && (
                              <span 
                                className="text-sm text-white px-3 py-1 rounded-full"
                                style={{ backgroundColor: streamingInfo.color }}
                              >
                                {streamingInfo.name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--color-muted)] mb-2">
                            <Users size={14} className="inline mr-1" />
                            {result.participantName} · {result.teamName}
                          </p>
                          {result.film.link && (
                            <a
                              href={result.film.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[var(--color-primary)] hover:underline"
                            >
                              Ver filme →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <h4 className="text-lg font-semibold text-[var(--color-text)] mb-4">📊 Resumo do Sorteio</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--color-primary)]">{results.length}</div>
                    <div className="text-sm text-[var(--color-muted)]">Participantes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--color-primary)]">{new Set(results.map(r => r.film.id)).size}</div>
                    <div className="text-sm text-[var(--color-muted)]">Filmes Únicos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--color-primary)]">
                      {mode === 'one-per-person' ? '1 por pessoa' :
                       mode === 'all-films' ? 'Todos' :
                       specificQuantity}
                    </div>
                    <div className="text-sm text-[var(--color-muted)]">Modo de Sorteio</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const portalRoot = document.getElementById('trivia-portal')
  if (!portalRoot) {
    return content
  }
  return createPortal(content, portalRoot)
}
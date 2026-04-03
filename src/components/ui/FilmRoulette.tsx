import { ChevronLeft, Film, History, Minus, Plus, RotateCcw, Shuffle, Users, Volume2, VolumeX, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { FilmManager } from './FilmManager'
import { MultiSelectField } from './MultiSelectField'
import { useCustomFilms } from '../../hooks/useCustomFilms'
import { MAX_ROULETTE_HISTORY } from '../../shared/constants/game'
import { STORAGE_KEYS } from '../../shared/constants/storage'
import { storageService } from '../../shared/services/storage.service'
import { getStreamingPlatformInfo, getFilmGenreInfo, type CustomFilm, type StreamingPlatform, type FilmGenre } from '../../data/customFilms'
import type { TriviaParticipant, TriviaTeam } from '../../modules/trivia/types'
import { drawUniqueFilms, type RouletteResult as DrawRouletteResult } from '../../modules/trivia/utils/drawUniqueFilms'

type FilmRouletteProps = {
  isOpen: boolean
  onClose: () => void
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
  sessionFilms?: Array<{ id: string; name: string }>
}

type RouletteConfig = {
  maxFilms: number
  allowMultiplePerPerson: boolean
}

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

type RouletteResult = DrawRouletteResult

type RouletteHistory = {
  id: string
  timestamp: string
  config: RouletteConfig
  results: RouletteResult[]
  participantCount: number
  uniqueFilms: number
}

type Step = 'films' | 'setup' | 'spin' | 'results'

// Cores vibrantes para segmentos da roleta
const SEGMENT_COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#22d3ee', '#10b981', '#f97316', '#06b6d4',
  '#a855f7', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
]

function createAudioContext() {
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  } catch {
    return null
  }
}

function playTick(ctx: AudioContext, volume: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = 800 + Math.random() * 400
  osc.type = 'sine'
  gain.gain.setValueAtTime(volume * 0.08, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.05)
}

function playVictory(ctx: AudioContext) {
  const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    const t = ctx.currentTime + i * 0.12
    gain.gain.setValueAtTime(0.12, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.start(t)
    osc.stop(t + 0.3)
  })
}

export function FilmRoulette({ isOpen, onClose, teams, participants, sessionFilms }: FilmRouletteProps) {
  const { films: globalCustomFilms, addFilm, updateFilm, removeFilm } = useCustomFilms()

  // Sorteio sempre usa apenas filmes do catálogo global — filmes da sessão não entram
  const customFilms = globalCustomFilms

  const [config, setConfig] = useState<RouletteConfig>({ maxFilms: 5, allowMultiplePerPerson: false })
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>([])
  const [selectedFilms, setSelectedFilms] = useState<SelectedFilm[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [results, setResults] = useState<RouletteResult[]>([])
  const [history, setHistory] = useState<RouletteHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>('films')
  const [revealedResults, setRevealedResults] = useState<number>(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [pointerBounce, setPointerBounce] = useState(false)
  const animationRef = useRef<number>(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastSegmentRef = useRef<number>(-1)
  const wheelRef = useRef<SVGSVGElement>(null)
  const rotationRef = useRef(0)

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = createAudioContext()
    return audioCtxRef.current
  }, [])

  useEffect(() => {
    if (isOpen) {
      const initialParticipants: SelectedParticipant[] = participants
        .filter(p => p.role === 'player')
        .map(participant => {
          const team = teams.find(t => t.id === participant.teamId)
          return { id: participant.id, name: participant.name, teamName: team?.name ?? 'Sem time', selected: true }
        })

      const initialFilms: SelectedFilm[] = customFilms.map(film => ({
        id: film.id, name: film.name, year: film.year, genre: film.genre,
        streaming: film.streaming, link: film.link, selected: true
      }))

      setSelectedParticipants(initialParticipants)
      setSelectedFilms(initialFilms)
      setResults([])
      setRevealedResults(0)
      setShowHistory(false)
      setCurrentStep('films')
      rotationRef.current = 0
      setHistory(storageService.getJson<RouletteHistory[]>(STORAGE_KEYS.rouletteHistory, []))
    }
  }, [isOpen, participants, teams, customFilms])

  const saveToHistory = (newResults: RouletteResult[]) => {
    const uniqueFilms = new Set(newResults.map(r => r.film.name.toLowerCase().trim())).size
    const historyEntry: RouletteHistory = {
      id: `roulette-${Date.now()}`,
      timestamp: new Date().toISOString(),
      config,
      results: newResults,
      participantCount: newResults.length,
      uniqueFilms
    }
    const newHistory = [historyEntry, ...history].slice(0, MAX_ROULETTE_HISTORY)
    setHistory(newHistory)
    storageService.setJson(STORAGE_KEYS.rouletteHistory, newHistory)
  }

  const getSelectedCount = () => selectedParticipants.filter(p => p.selected).length
  const getSelectedFilmsCount = () => selectedFilms.filter(f => f.selected).length
  const getSelectedFilmsList = (): CustomFilm[] => {
    const ids = selectedFilms.filter(f => f.selected).map(f => f.id)
    return customFilms.filter(film => ids.includes(film.id))
  }

  const spinRoulette = () => {
    if (getSelectedCount() === 0 || getSelectedFilmsCount() === 0) return
    setIsSpinning(true)
    lastSegmentRef.current = -1

    const ctx = soundEnabled ? getAudioCtx() : null
    const filmCount = getSelectedFilmsCount()
    const spinDuration = 5000
    const startTime = performance.now()
    const startRotation = rotationRef.current
    const totalSpin = 360 * 10 + Math.random() * 360

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / spinDuration, 1)
      // Quartic ease-out for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 4)
      const currentRotation = startRotation + totalSpin * eased

      // Direct DOM manipulation — no React re-render
      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${currentRotation}deg)`
      }
      rotationRef.current = currentRotation

      // Tick sound on each segment crossing
      if (ctx && filmCount > 0) {
        const normalizedAngle = ((currentRotation % 360) + 360) % 360
        const currentSegment = Math.floor(normalizedAngle / (360 / filmCount))
        if (currentSegment !== lastSegmentRef.current) {
          lastSegmentRef.current = currentSegment
          const volume = Math.max(0.3, 1 - progress * 0.7)
          playTick(ctx, volume)
          setPointerBounce(true)
          setTimeout(() => setPointerBounce(false), 80)
        }
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    setTimeout(() => {
      const selected = selectedParticipants.filter(p => p.selected)
      const filmsToUse = getSelectedFilmsList()
      const participantsMap = new Map<string, { name: string; teamName: string }>()
      selected.forEach(p => participantsMap.set(p.id, { name: p.name, teamName: p.teamName }))

      const filmsWithAddedBy = filmsToUse.map(film => ({
        ...film,
        addedBy: film.addedBy || participants.find(p =>
          participantsMap.has(p.id) && p.name.toLowerCase().trim() === (film.addedBy || '').toLowerCase().trim()
        )?.name || film.addedBy
      }))

      const maxFilms = Math.min(config.maxFilms, filmsToUse.length)
      const newResults = drawUniqueFilms(filmsWithAddedBy, participantsMap, maxFilms, config.allowMultiplePerPerson)

      setResults(newResults)
      setIsSpinning(false)
      setRevealedResults(0)
      setCurrentStep('results')
      saveToHistory(newResults)

      // Victory sound
      if (ctx) playVictory(ctx)

      // Reveal results one by one
      newResults.forEach((_, i) => {
        setTimeout(() => setRevealedResults(prev => prev + 1), (i + 1) * 500)
      })
    }, spinDuration)
  }

  const resetRoulette = () => {
    setResults([])
    setRevealedResults(0)
    setIsSpinning(false)
    setCurrentStep('films')
    rotationRef.current = 0
    if (wheelRef.current) wheelRef.current.style.transform = 'rotate(0deg)'
    cancelAnimationFrame(animationRef.current)
  }

  // MultiSelect handlers
  const participantOptions = selectedParticipants.map(p => ({
    id: p.id, label: p.name, subtitle: p.teamName,
    badge: p.selected ? 'Selecionado' : undefined,
    badgeColor: p.selected ? '#10b981' : undefined,
    selected: p.selected
  }))

  const filmOptions = selectedFilms.map(f => {
    const streamingInfo = f.streaming ? getStreamingPlatformInfo(f.streaming as StreamingPlatform) : null
    const genreInfo = f.genre ? getFilmGenreInfo(f.genre as FilmGenre) : null
    return {
      id: f.id, label: f.name,
      subtitle: `${f.year ? `(${f.year})` : ''} ${genreInfo ? genreInfo.name : ''}`.trim(),
      badge: streamingInfo ? streamingInfo.name : undefined,
      badgeColor: streamingInfo?.color,
      selected: f.selected
    }
  })

  if (!isOpen) return null

  const films = getSelectedFilmsList()
  const segmentAngle = films.length > 0 ? 360 / films.length : 360

  // ── Breadcrumb nav ──
  const stepLabels: Record<Step, string> = { films: 'Filmes', setup: 'Configurar', spin: 'Roleta', results: 'Resultado' }
  const stepOrder: Step[] = ['films', 'setup', 'spin', 'results']
  const currentIndex = stepOrder.indexOf(currentStep)

  const renderBreadcrumbs = () => (
    <div className="flex items-center gap-1.5 text-xs">
      {stepOrder.map((step, i) => {
        const isActive = step === currentStep
        const isPast = i < currentIndex
        const isClickable = isPast
        return (
          <span key={step} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[var(--color-muted)]/40">/</span>}
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && setCurrentStep(step)}
              className={`rounded px-1.5 py-0.5 font-medium transition ${
                isActive
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : isPast
                    ? 'text-[var(--color-muted)] hover:text-[var(--color-text)] cursor-pointer'
                    : 'text-[var(--color-muted)]/40 cursor-default'
              }`}
            >
              {stepLabels[step]}
            </button>
          </span>
        )
      })}
    </div>
  )

  // ── Roulette wheel SVG ──
  const renderWheel = () => {
    const size = 280
    const cx = size / 2
    const cy = size / 2
    const r = size / 2 - 4

    const describeArc = (startAngle: number, endAngle: number) => {
      const start = ((startAngle - 90) * Math.PI) / 180
      const end = ((endAngle - 90) * Math.PI) / 180
      const x1 = cx + r * Math.cos(start)
      const y1 = cy + r * Math.sin(start)
      const x2 = cx + r * Math.cos(end)
      const y2 = cy + r * Math.sin(end)
      const largeArc = endAngle - startAngle > 180 ? 1 : 0
      return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
    }

    return (
      <div className="relative flex items-center justify-center">
        {/* Ponteiro fixo no topo com bounce */}
        <div
          className="absolute -top-2 left-1/2 z-20 -translate-x-1/2 transition-transform duration-75"
          style={{ transform: `translateX(-50%) ${pointerBounce ? 'translateY(3px) scale(1.15)' : ''}` }}
        >
          <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[22px] border-l-transparent border-r-transparent border-t-[var(--color-primary)] drop-shadow-lg" />
        </div>

        {/* Glow de fundo */}
        <div
          className="absolute rounded-full blur-3xl transition-opacity duration-1000"
          style={{
            width: size + 60,
            height: size + 60,
            background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
            opacity: isSpinning ? 0.3 : 0.1,
          }}
        />

        {/* Borda externa */}
        <div
          className="rounded-full border-[3px] border-[var(--color-primary)]/30 p-1 shadow-2xl"
          style={{ width: size + 8, height: size + 8 }}
        >
          <svg
            ref={wheelRef}
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="rounded-full"
            style={{
              transform: `rotate(${rotationRef.current}deg)`,
              willChange: 'transform',
            }}
          >
            {films.map((film, i) => {
              const startAngle = segmentAngle * i
              const endAngle = segmentAngle * (i + 1)
              const midAngle = ((startAngle + endAngle) / 2 - 90) * (Math.PI / 180)
              const textR = r * 0.62
              const tx = cx + textR * Math.cos(midAngle)
              const ty = cy + textR * Math.sin(midAngle)
              const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length]

              return (
                <g key={film.id}>
                  <path d={describeArc(startAngle, endAngle)} fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={films.length > 12 ? 7 : films.length > 8 ? 8 : 10}
                    fontWeight="600"
                    transform={`rotate(${(startAngle + endAngle) / 2}, ${tx}, ${ty})`}
                  >
                    {film.name.length > 14 ? `${film.name.substring(0, 12)}…` : film.name}
                  </text>
                </g>
              )
            })}
            {/* Centro */}
            <circle cx={cx} cy={cy} r={28} fill="var(--color-background)" stroke="var(--color-border)" strokeWidth="2" />
            <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--color-primary)" fontSize="10" fontWeight="700">
              {films.length}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--color-muted)" fontSize="7">
              filmes
            </text>
          </svg>
        </div>
      </div>
    )
  }

  // ── Content per step ──
  const renderContent = () => {
    if (showHistory) {
      return (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowHistory(false)}
            className="flex items-center gap-1 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            <ChevronLeft size={14} /> Voltar
          </button>

          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] py-12 text-center text-sm text-[var(--color-muted)]">
              Nenhum sorteio realizado ainda
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[var(--color-text)]">
                      {new Date(entry.timestamp).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[10px] text-[var(--color-muted)]">
                      {entry.uniqueFilms} filme{entry.uniqueFilms !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {entry.results.slice(0, 3).map((result, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                          style={{ backgroundColor: result.film.streaming ? getStreamingPlatformInfo(result.film.streaming)?.color || '#6B7280' : '#6B7280' }}
                        >
                          {result.film.name.charAt(0)}
                        </div>
                        <span className="font-medium text-[var(--color-text)] truncate">{result.film.name}</span>
                        <span className="text-[var(--color-muted)] truncate ml-auto">{result.participantName}</span>
                      </div>
                    ))}
                    {entry.results.length > 3 && (
                      <span className="text-[10px] text-[var(--color-muted)]">+{entry.results.length - 3} mais</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    switch (currentStep) {
      case 'films':
        return (
          <div className="space-y-4">
            <FilmManager
              films={customFilms}
              participants={participants}
              onAddFilm={addFilm}
              onUpdateFilm={updateFilm}
              onRemoveFilm={removeFilm}
              onClose={() => {}}
            />
            <Button
              variant="secondary"
              onClick={() => { if (getSelectedFilmsCount() > 0) setCurrentStep('setup') }}
              disabled={getSelectedFilmsCount() === 0}
              className="w-full gap-2"
            >
              Configurar sorteio
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{customFilms.length} filmes</span>
            </Button>
          </div>
        )

      case 'setup':
        return (
          <div className="space-y-4">
            {/* Config compacta */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text)]">Filmes a sortear</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, maxFilms: Math.max(1, prev.maxFilms - 1) }))}
                    className="rounded-md p-1 text-[var(--color-muted)] hover:bg-[var(--color-border)]/40"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-[2rem] text-center text-sm font-bold text-[var(--color-primary)]">{config.maxFilms}</span>
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, maxFilms: Math.min(getSelectedFilmsCount(), prev.maxFilms + 1) }))}
                    className="rounded-md p-1 text-[var(--color-muted)] hover:bg-[var(--color-border)]/40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.allowMultiplePerPerson}
                  onChange={(e) => setConfig(prev => ({ ...prev, allowMultiplePerPerson: e.target.checked }))}
                  className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                />
                <span className="text-xs text-[var(--color-text)]">Permitir vários filmes por pessoa</span>
              </label>
            </div>

            {/* Participants */}
            <MultiSelectField
              title="Participantes"
              description={`${getSelectedCount()} de ${selectedParticipants.length} selecionados`}
              options={participantOptions}
              onSelectionChange={(ids) => setSelectedParticipants(prev => prev.map(p => ({ ...p, selected: ids.includes(p.id) })))}
              onSelectAll={() => setSelectedParticipants(prev => prev.map(p => ({ ...p, selected: true })))}
              onSelectNone={() => setSelectedParticipants(prev => prev.map(p => ({ ...p, selected: false })))}
              searchPlaceholder="Buscar..."
              emptyMessage="Nenhum participante"
              maxHeight="max-h-40"
            />

            {/* Films */}
            <MultiSelectField
              title="Filmes na roleta"
              description={`${getSelectedFilmsCount()} de ${selectedFilms.length} selecionados`}
              options={filmOptions}
              onSelectionChange={(ids) => setSelectedFilms(prev => prev.map(f => ({ ...f, selected: ids.includes(f.id) })))}
              onSelectAll={() => setSelectedFilms(prev => prev.map(f => ({ ...f, selected: true })))}
              onSelectNone={() => setSelectedFilms(prev => prev.map(f => ({ ...f, selected: false })))}
              searchPlaceholder="Buscar filmes..."
              emptyMessage="Nenhum filme"
              maxHeight="max-h-40"
            />

            <Button
              variant="secondary"
              onClick={() => { if (getSelectedCount() > 0 && getSelectedFilmsCount() > 0) setCurrentStep('spin') }}
              disabled={getSelectedCount() === 0 || getSelectedFilmsCount() === 0}
              className="w-full gap-2"
            >
              <Shuffle size={16} />
              Ir para roleta
            </Button>
          </div>
        )

      case 'spin':
        return (
          <div className="flex flex-col items-center gap-6 py-2">
            {renderWheel()}

            <div className="text-center space-y-1">
              <p className="text-xs text-[var(--color-muted)]">
                {getSelectedCount()} participante{getSelectedCount() !== 1 ? 's' : ''} · {getSelectedFilmsCount()} filme{getSelectedFilmsCount() !== 1 ? 's' : ''} · {config.maxFilms} a sortear
              </p>
            </div>

            <Button
              variant="secondary"
              size="lg"
              onClick={spinRoulette}
              disabled={isSpinning}
              className="gap-2 px-8"
            >
              {isSpinning ? (
                <Film size={18} className="animate-spin" />
              ) : (
                <Shuffle size={18} />
              )}
              {isSpinning ? 'Girando...' : 'Girar roleta'}
            </Button>
          </div>
        )

      case 'results':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text)]">
                {results.length} filme{results.length !== 1 ? 's' : ''} sorteado{results.length !== 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="sm" onClick={resetRoulette} className="gap-1 text-xs">
                <RotateCcw size={12} />
                Novo sorteio
              </Button>
            </div>

            <div className="space-y-2">
              {results.map((result, index) => {
                const streamingInfo = result.film.streaming ? getStreamingPlatformInfo(result.film.streaming) : null
                const genreInfo = result.film.genre ? getFilmGenreInfo(result.film.genre) : null
                const isRevealed = index < revealedResults

                return (
                  <div
                    key={`${result.participantId}-${index}`}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 transition-all duration-500"
                    style={{
                      opacity: isRevealed ? 1 : 0,
                      transform: isRevealed ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                        style={{ backgroundColor: streamingInfo?.color || SEGMENT_COLORS[index % SEGMENT_COLORS.length] }}
                      >
                        {result.film.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--color-text)] truncate">{result.film.name}</span>
                          {result.film.year && (
                            <span className="shrink-0 text-[10px] text-[var(--color-muted)]">({result.film.year})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {genreInfo && (
                            <span className="text-[10px] text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded-full">
                              {genreInfo.name}
                            </span>
                          )}
                          {streamingInfo && (
                            <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full" style={{ backgroundColor: streamingInfo.color }}>
                              {streamingInfo.name}
                            </span>
                          )}
                          <span className="text-[10px] text-[var(--color-muted)]">
                            <Users size={10} className="inline mr-0.5" />
                            {result.film.addedBy || result.participantName}
                          </span>
                        </div>
                      </div>
                      {result.film.link && (
                        <a
                          href={result.film.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-xs text-[var(--color-primary)] hover:underline"
                        >
                          Ver →
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Resumo compacto */}
            <div className="flex items-center justify-around rounded-xl bg-[var(--color-surface)] p-3 text-center">
              <div>
                <div className="text-lg font-bold text-[var(--color-primary)]">{results.length}</div>
                <div className="text-[10px] text-[var(--color-muted)]">Sorteados</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[var(--color-primary)]">
                  {new Set(results.map(r => r.film.name.toLowerCase().trim())).size}
                </div>
                <div className="text-[10px] text-[var(--color-muted)]">Únicos</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[var(--color-primary)]">
                  {new Set(results.map(r => r.participantName.toLowerCase().trim())).size}
                </div>
                <div className="text-[10px] text-[var(--color-muted)]">Indicaram</div>
              </div>
            </div>
          </div>
        )
    }
  }

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="card-surface flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl">
        {/* Header compacto */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-3">
            <Film size={18} className="text-[var(--color-primary)]" />
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text)]">Sorteio de Filmes</h2>
              {renderBreadcrumbs()}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSoundEnabled(v => !v)}
              className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-border)]/40 hover:text-[var(--color-text)]"
              title={soundEnabled ? 'Desativar som' : 'Ativar som'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-border)]/40 hover:text-[var(--color-text)]"
              title="Histórico"
            >
              <History size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-border)]/40 hover:text-[var(--color-text)]"
              title="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {renderContent()}
        </div>
      </div>
    </div>
  )

  const portalRoot = document.getElementById('trivia-portal')
  if (!portalRoot) return content
  return createPortal(content, portalRoot)
}

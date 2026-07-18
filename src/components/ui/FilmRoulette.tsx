import { ChevronLeft, Film, History, Minus, Plus, RotateCcw, Shuffle, Users, Volume2, VolumeX, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { MultiSelectField } from './MultiSelectField'
import { RouletteFilmPicker, type RouletteFilm } from './RouletteFilmPicker'
import { MAX_ROULETTE_HISTORY } from '../../shared/constants/game'
import { STORAGE_KEYS } from '../../shared/constants/storage'
import { storageService } from '../../shared/services/storage.service'
import { getStreamingPlatformInfo, getFilmGenreInfo, type CustomFilm } from '../../data/customFilms'
import type { TriviaParticipant, TriviaTeam } from '../../modules/trivia/types'
import { drawUniqueFilms, type RouletteResult as DrawRouletteResult } from '../../modules/trivia/utils/drawUniqueFilms'
import { useTranslation } from '@/shared/i18n'
import { useSoundSettings } from '@/hooks/useSoundSettings'
import { playSound, unlockAudio } from '@/shared/services/audio.service'

type FilmRouletteProps = {
  isOpen: boolean
  onClose: () => void
  teams: TriviaTeam[]
  participants: TriviaParticipant[]
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

export function FilmRoulette({ isOpen, onClose, teams, participants }: FilmRouletteProps) {
  const { t, i18n } = useTranslation(['game', 'common'])
  const { settings: soundSettings, update: updateSoundSettings } = useSoundSettings()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const [config, setConfig] = useState<RouletteConfig>({ maxFilms: 5, allowMultiplePerPerson: false })
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>([])
  const [selectedFilms, setSelectedFilms] = useState<RouletteFilm[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [results, setResults] = useState<RouletteResult[]>([])
  const [history, setHistory] = useState<RouletteHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>('films')
  const [revealedResults, setRevealedResults] = useState<number>(0)
  const [pointerBounce, setPointerBounce] = useState(false)
  const animationRef = useRef<number>(0)
  const lastSegmentRef = useRef<number>(-1)
  const wheelRef = useRef<SVGSVGElement>(null)
  const rotationRef = useRef(0)
  const rouletteSoundEnabled = soundSettings.mode === 'all' && soundSettings.roulette
  const rouletteSoundLabel = rouletteSoundEnabled
    ? t('roulette.disableSound', { ns: 'game' })
    : soundSettings.mode === 'all'
      ? t('roulette.enableSound', { ns: 'game' })
      : t('roulette.enableAllSounds', { ns: 'game' })

  useEffect(() => {
    if (isOpen) {
      const initialParticipants: SelectedParticipant[] = participants
        .filter(p => p.role === 'player')
        .map(participant => {
          const team = teams.find(t => t.id === participant.teamId)
          return { id: participant.id, name: participant.name, teamName: team?.name ?? t('roulette.noTeam', { ns: 'game' }), selected: true }
        })

      setSelectedParticipants(initialParticipants)
      setSelectedFilms([])
      setResults([])
      setRevealedResults(0)
      setShowHistory(false)
      setCurrentStep('films')
      rotationRef.current = 0
      setHistory(storageService.getJson<RouletteHistory[]>(STORAGE_KEYS.rouletteHistory, []))
    }
  }, [isOpen, participants, t, teams])

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
    return selectedFilms
      .filter(film => film.selected)
      .map(film => ({
        id: film.id,
        name: film.name,
        year: film.year,
        addedBy: film.addedBy,
        addedAt: new Date().toISOString(),
      }))
  }

  const spinRoulette = () => {
    if (getSelectedCount() === 0 || getSelectedFilmsCount() === 0) return
    setIsSpinning(true)
    lastSegmentRef.current = -1

    if (rouletteSoundEnabled) void unlockAudio()
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
      if (rouletteSoundEnabled && filmCount > 0) {
        const normalizedAngle = ((currentRotation % 360) + 360) % 360
        const currentSegment = Math.floor(normalizedAngle / (360 / filmCount))
        if (currentSegment !== lastSegmentRef.current) {
          lastSegmentRef.current = currentSegment
          playSound('rouletteTick')
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
      const newResults = drawUniqueFilms(
        filmsWithAddedBy,
        participantsMap,
        maxFilms,
        config.allowMultiplePerPerson,
        {
          unknownParticipant: t('roulette.noParticipant', { ns: 'game' }),
          noTeam: t('roulette.noTeam', { ns: 'game' }),
        },
      )

      setResults(newResults)
      setIsSpinning(false)
      setRevealedResults(0)
      setCurrentStep('results')
      saveToHistory(newResults)

      // Victory sound
      if (rouletteSoundEnabled) playSound('rouletteVictory')

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
    badge: p.selected ? t('roulette.selected', { ns: 'game' }) : undefined,
    badgeColor: p.selected ? '#10b981' : undefined,
    selected: p.selected
  }))

  const filmOptions = selectedFilms.map(f => {
    return {
      id: f.id, label: f.name,
      subtitle: [f.year ? `(${f.year})` : '', f.addedBy ?? ''].filter(Boolean).join(' · '),
      selected: f.selected
    }
  })

  if (!isOpen) return null

  const films = getSelectedFilmsList()
  const segmentAngle = films.length > 0 ? 360 / films.length : 360

  // ── Breadcrumb nav ──
  const stepLabels: Record<Step, string> = {
    films: t('roulette.steps.films', { ns: 'game' }),
    setup: t('roulette.steps.setup', { ns: 'game' }),
    spin: t('roulette.steps.spin', { ns: 'game' }),
    results: t('roulette.steps.results', { ns: 'game' }),
  }
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
              {t('roulette.wheelFilms', { ns: 'game' })}
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
            <ChevronLeft size={14} /> {t('roulette.back', { ns: 'game' })}
          </button>

          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] py-12 text-center text-sm text-[var(--color-muted)]">
              {t('roulette.emptyHistory', { ns: 'game' })}
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[var(--color-text)]">
                      {new Date(entry.timestamp).toLocaleString(locale)}
                    </span>
                    <span className="text-[10px] text-[var(--color-muted)]">
                      {t('entities.film', { ns: 'common', count: entry.uniqueFilms })}
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
                      <span className="text-[10px] text-[var(--color-muted)]">{t('roulette.more', { ns: 'game', count: entry.results.length - 3 })}</span>
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
            <RouletteFilmPicker
              films={selectedFilms}
              participants={participants}
              onFilmsChange={setSelectedFilms}
            />
            <Button
              variant="secondary"
              onClick={() => { if (getSelectedFilmsCount() > 0) setCurrentStep('setup') }}
              disabled={getSelectedFilmsCount() === 0}
              className="w-full gap-2"
            >
              {t('roulette.setup', { ns: 'game' })}
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {t('entities.film', { ns: 'common', count: selectedFilms.length })}
              </span>
            </Button>
          </div>
        )

      case 'setup':
        return (
          <div className="space-y-4">
            {/* Config compacta */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text)]">{t('roulette.filmsToDraw', { ns: 'game' })}</span>
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
                <span className="text-xs text-[var(--color-text)]">{t('roulette.multiplePerPerson', { ns: 'game' })}</span>
              </label>
            </div>

            {/* Participants */}
            <MultiSelectField
              title={t('roulette.participants', { ns: 'game' })}
              description={t('roulette.selectedCount', { ns: 'game', selected: getSelectedCount(), total: selectedParticipants.length })}
              options={participantOptions}
              onSelectionChange={(ids) => setSelectedParticipants(prev => prev.map(p => ({ ...p, selected: ids.includes(p.id) })))}
              onSelectAll={() => setSelectedParticipants(prev => prev.map(p => ({ ...p, selected: true })))}
              onSelectNone={() => setSelectedParticipants(prev => prev.map(p => ({ ...p, selected: false })))}
              searchPlaceholder={t('selection.search', { ns: 'common' })}
              emptyMessage={t('roulette.noParticipant', { ns: 'game' })}
              maxHeight="max-h-40"
            />

            {/* Films */}
            <MultiSelectField
              title={t('roulette.filmsInWheel', { ns: 'game' })}
              description={t('roulette.selectedCount', { ns: 'game', selected: getSelectedFilmsCount(), total: selectedFilms.length })}
              options={filmOptions}
              onSelectionChange={(ids) => setSelectedFilms(prev => prev.map(f => ({ ...f, selected: ids.includes(f.id) })))}
              onSelectAll={() => setSelectedFilms(prev => prev.map(f => ({ ...f, selected: true })))}
              onSelectNone={() => setSelectedFilms(prev => prev.map(f => ({ ...f, selected: false })))}
              searchPlaceholder={t('roulette.searchFilms', { ns: 'game' })}
              emptyMessage={t('roulette.noFilm', { ns: 'game' })}
              maxHeight="max-h-40"
            />

            <Button
              variant="secondary"
              onClick={() => { if (getSelectedCount() > 0 && getSelectedFilmsCount() > 0) setCurrentStep('spin') }}
              disabled={getSelectedCount() === 0 || getSelectedFilmsCount() === 0}
              className="w-full gap-2"
            >
              <Shuffle size={16} />
              {t('roulette.goToWheel', { ns: 'game' })}
            </Button>
          </div>
        )

      case 'spin':
        return (
          <div className="flex flex-col items-center gap-6 py-2">
            {renderWheel()}

            <div className="text-center space-y-1">
              <p className="text-xs text-[var(--color-muted)]">
                {t('roulette.setupSummary', {
                  ns: 'game',
                  participants: t('entities.participant', { ns: 'common', count: getSelectedCount() }),
                  films: t('entities.film', { ns: 'common', count: getSelectedFilmsCount() }),
                  draw: config.maxFilms,
                })}
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
              {isSpinning ? t('roulette.spinning', { ns: 'game' }) : t('roulette.spin', { ns: 'game' })}
            </Button>
          </div>
        )

      case 'results':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text)]">
                {t('roulette.drawn', { ns: 'game', count: results.length })}
              </span>
              <Button variant="ghost" size="sm" onClick={resetRoulette} className="gap-1 text-xs">
                <RotateCcw size={12} />
                {t('roulette.newDraw', { ns: 'game' })}
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
                          {t('roulette.view', { ns: 'game' })}
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
                <div className="text-[10px] text-[var(--color-muted)]">{t('roulette.drawnLabel', { ns: 'game' })}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[var(--color-primary)]">
                  {new Set(results.map(r => r.film.name.toLowerCase().trim())).size}
                </div>
                <div className="text-[10px] text-[var(--color-muted)]">{t('roulette.uniqueLabel', { ns: 'game' })}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[var(--color-primary)]">
                  {new Set(results.map(r => r.participantName.toLowerCase().trim())).size}
                </div>
                <div className="text-[10px] text-[var(--color-muted)]">{t('roulette.indicatedLabel', { ns: 'game' })}</div>
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
              <h2 className="text-sm font-bold text-[var(--color-text)]">{t('roulette.title', { ns: 'game' })}</h2>
              {renderBreadcrumbs()}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                updateSoundSettings(rouletteSoundEnabled
                  ? { roulette: false }
                  : { mode: 'all', roulette: true })
                if (!rouletteSoundEnabled) void unlockAudio()
              }}
              className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-border)]/40 hover:text-[var(--color-text)]"
              title={rouletteSoundLabel}
              aria-label={rouletteSoundLabel}
              aria-pressed={rouletteSoundEnabled}
            >
              {rouletteSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-border)]/40 hover:text-[var(--color-text)]"
              title={t('roulette.history', { ns: 'game' })}
            >
              <History size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-border)]/40 hover:text-[var(--color-text)]"
              title={t('actions.close', { ns: 'common' })}
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

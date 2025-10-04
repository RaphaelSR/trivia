import { Pause, Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from './Button'

type TimerProps = {
  initialSeconds?: number
  onTick?: (value: number) => void
  variant?: 'standard' | 'compact'
  editable?: boolean
  showControls?: boolean
}

function formatTime(totalSeconds: number) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function parseTime(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) {
    return Math.max(0, Number(trimmed))
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})$/)
  if (match) {
    const minutes = Number(match[1])
    const seconds = Number(match[2])
    if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null
    return minutes * 60 + seconds
  }
  return null
}

export function Timer({
  initialSeconds = 30,
  onTick,
  variant = 'standard',
  editable = false,
  showControls = true,
}: TimerProps) {
  const [baseSeconds, setBaseSeconds] = useState(initialSeconds)
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(false)
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState(formatTime(initialSeconds))

  useEffect(() => {
    setBaseSeconds(initialSeconds)
    setSeconds(initialSeconds)
    setInputValue(formatTime(initialSeconds))
  }, [initialSeconds])

  useEffect(() => {
    if (!running) return
    if (seconds === 0) {
      setRunning(false)
      return
    }
    const id = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [running, seconds])

  useEffect(() => {
    onTick?.(seconds)
  }, [seconds, onTick])

  const progress = useMemo(() => {
    return baseSeconds > 0 ? ((baseSeconds - seconds) / baseSeconds) * 100 : 100
  }, [baseSeconds, seconds])

  const handleSubmitEdit = useCallback(() => {
    const parsed = parseTime(inputValue)
    if (parsed === null) {
      setInputValue(formatTime(seconds))
      setEditing(false)
      return
    }
    setBaseSeconds(parsed)
    setSeconds(parsed)
    setEditing(false)
    setRunning(false)
  }, [inputValue, seconds])

  const containerClasses = variant === 'compact' ? 'flex flex-col gap-3' : 'card-surface flex flex-col gap-4 rounded-2xl p-4'
  const headerClasses = variant === 'compact' ? 'flex items-center justify-between gap-3' : 'flex items-center justify-between'
  const timeClasses = variant === 'compact' ? 'font-mono text-xl font-semibold text-[var(--color-text)]' : 'font-mono text-2xl font-semibold text-[var(--color-text)]'

  return (
    <div className={containerClasses}>
      <div className={headerClasses}>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
          Timer
        </span>
        {editing ? (
          <input
            autoFocus
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onBlur={handleSubmitEdit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleSubmitEdit()
              }
              if (event.key === 'Escape') {
                setInputValue(formatTime(seconds))
                setEditing(false)
              }
            }}
            className="w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-center text-sm"
          />
        ) : (
          <button
            type="button"
            className={timeClasses}
            onClick={() => editable && setEditing(true)}
            title={editable ? 'Clique para editar o tempo' : undefined}
          >
            {formatTime(seconds)}
          </button>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-all"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showControls ? (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="icon"
            aria-label={running ? 'Pausar' : 'Iniciar'}
            title={running ? 'Pausar contador' : 'Iniciar contador'}
            onClick={() => setRunning((prev) => !prev)}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Resetar"
            title="Resetar contador"
            onClick={() => {
              setSeconds(baseSeconds)
              setRunning(false)
            }}
          >
            <RotateCcw size={16} />
          </Button>
        </div>
      ) : null}
    </div>
  )
}

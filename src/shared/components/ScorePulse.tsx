interface ScorePulseProps {
  value: string
}

export function ScorePulse({ value }: ScorePulseProps) {
  return (
    <span className="score-pulse inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
      {value}
    </span>
  )
}

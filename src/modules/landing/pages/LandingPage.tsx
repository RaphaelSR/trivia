import { Film } from 'lucide-react'
import { ModeSelector } from '../../../components/ui/ModeSelector'
import { GameLayout } from '../../../shared/components/GameLayout'
import { EasterBackground } from '../../../shared/components/EasterBackground'

export function LandingPage() {
  return (
    <GameLayout className="relative flex items-center justify-center">
      <EasterBackground />
      <section className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-10 py-8 sm:py-16 lg:py-24">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)]">
            <Film className="h-3.5 w-3.5" />
            Trivia Cinematográfico
          </div>
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-[var(--color-text)] sm:text-4xl lg:text-5xl">
            Monte a rodada e jogue sem bagunça.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-[var(--color-muted)]">
            Escolha um modo para começar. Demo para testar ou sessão local para jogar de verdade.
          </p>
        </div>

        {/* Mode Cards */}
        <div className="w-full">
          <ModeSelector />
        </div>

        {/* Info footer */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--color-muted)]">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
            Turnos balanceados
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-secondary)]" />
            Trivia + mímica
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
            Host dashboard
          </span>
        </div>
      </section>
    </GameLayout>
  )
}

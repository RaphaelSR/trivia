import { Film, LayoutDashboard, Sparkles, Trophy } from 'lucide-react'
import { ModeSelector } from '../../../components/ui/ModeSelector'
import { GameLayout } from '../../../shared/components/GameLayout'
import { GlassCard } from '../../../shared/components/GlassCard'
import { StatPill } from '../../../shared/components/StatPill'

export function LandingPage() {
  return (
    <GameLayout className="flex items-center justify-center">
      <section className="grid items-stretch gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <GlassCard className="relative overflow-hidden px-6 py-8 sm:px-10 sm:py-12">
          <div className="absolute inset-0 bg-[var(--gradient-primary)] opacity-20" />
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_65%)]" />

          <div className="relative space-y-8">
            <div className="flex flex-wrap gap-3">
              <StatPill label="Produto" value="Trivia web game" icon={<Film className="h-4 w-4" />} />
              <StatPill label="Formato" value="Dashboard jogável" icon={<LayoutDashboard className="h-4 w-4" />} />
              <StatPill label="Estilo" value="Dark glassmorphism" icon={<Sparkles className="h-4 w-4" />} />
            </div>

            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--color-primary)]">
                Trivia cinematografico
              </span>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-[var(--color-text)] sm:text-5xl lg:text-6xl">
                Controle a noite do jogo como um host, jogue como um time e mantenha o tabuleiro vivo.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--color-muted)] sm:text-lg">
                Escolha um modo, configure times, distribua pontuação, rode mímica e acompanhe cada rodada em uma experiência mais próxima de um painel de game show.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <GlassCard className="border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">Turnos</p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-text)]">Balanceados</p>
              </GlassCard>
              <GlassCard className="border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">Scoring</p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-text)]">Trivia + mimica</p>
              </GlassCard>
              <GlassCard className="border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">Modo host</p>
                <p className="mt-2 flex items-center gap-2 text-xl font-semibold text-[var(--color-text)]"><Trophy className="h-5 w-5 text-[var(--color-secondary)]" />Pronto para jogar</p>
              </GlassCard>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-8 space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">Escolha o formato</p>
            <h2 className="text-3xl font-semibold text-[var(--color-text)]">Modos de jogo</h2>
            <p className="text-sm leading-6 text-[var(--color-muted)]">
              Demo para apresentar, offline para rodar localmente e online para a camada preparada para sincronização.
            </p>
          </div>

          <ModeSelector />
        </GlassCard>
      </section>
    </GameLayout>
  )
}

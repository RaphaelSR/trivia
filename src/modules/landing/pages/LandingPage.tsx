import { Film, LayoutDashboard, Monitor, Sparkles } from 'lucide-react'
import { ModeSelector } from '../../../components/ui/ModeSelector'
import { GameLayout } from '../../../shared/components/GameLayout'
import { GlassCard } from '../../../shared/components/GlassCard'
import { StatPill } from '../../../shared/components/StatPill'

export function LandingPage() {
  return (
    <GameLayout className="flex items-center justify-center">
      <section className="flex w-full flex-col gap-6">
        <GlassCard className="relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <div className="absolute inset-0 bg-[var(--gradient-primary)] opacity-20" />
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_65%)]" />

          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] xl:items-end">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <StatPill label="Produto" value="Trivia web game" icon={<Film className="h-4 w-4" />} />
                <StatPill label="Formato" value="Host dashboard" icon={<LayoutDashboard className="h-4 w-4" />} />
                <StatPill label="Estilo" value="Game show moderno" icon={<Sparkles className="h-4 w-4" />} />
              </div>

              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--color-primary)]">
                  Trivia cinematografico
                </span>
                <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] text-[var(--color-text)] sm:text-5xl lg:text-[4.25rem]">
                  Monte a rodada, conduza o board e jogue sem bagunça.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-[var(--color-muted)] sm:text-lg">
                  Use o demo para apresentar rapidamente ou abra uma sessão local que fica salva neste navegador para continuar depois no mesmo dispositivo.
                </p>
              </div>
            </div>

            <GlassCard className="border-white/10 bg-black/10 p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">Como funciona</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">1. Escolha o modo</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">Demo para testar ou sessão local para jogar de verdade.</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">2. Configure o host</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">Crie times, ajuste filmes, perguntas, tema e regras da rodada.</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">3. Conduza a partida</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">Selecione cartas, revele respostas, aplique scoring e acompanhe o placar.</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </GlassCard>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <GlassCard className="px-6 py-6 sm:px-8 sm:py-7">
            <div className="flex flex-wrap gap-3">
              <GlassCard className="min-w-[180px] flex-1 border-white/10 bg-black/10 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">Turnos</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">Balanceados</p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Alternância entre equipes e visão clara da rodada atual.</p>
              </GlassCard>
              <GlassCard className="min-w-[180px] flex-1 border-white/10 bg-black/10 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">Scoring</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text)]">Trivia + mímica</p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Pontuação rápida, avançada e modos de mímica na mesma operação.</p>
              </GlassCard>
              <GlassCard className="min-w-[180px] flex-1 border-white/10 bg-black/10 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">Modo host</p>
                <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-[var(--color-text)]">
                  <Monitor className="h-5 w-5 text-[var(--color-primary)]" />
                  Pronto para jogar
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Um painel único para conduzir a noite sem perder contexto.</p>
              </GlassCard>
            </div>
          </GlassCard>

          <GlassCard className="px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">Entrada principal</p>
                <h2 className="text-3xl font-semibold text-[var(--color-text)]">Escolha como quer entrar</h2>
                <p className="max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
                  O foco agora é jogar rápido ou abrir uma sessão local persistida neste navegador, sem apertar os cards nem competir com o hero principal.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[var(--color-muted)]">
                <span className="font-semibold text-[var(--color-text)]">Recomendado:</span> Sessão Local para partidas reais
              </div>
            </div>

            <ModeSelector />
          </GlassCard>
        </div>
      </section>
    </GameLayout>
  )
}

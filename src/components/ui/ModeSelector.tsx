import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './Button'
import { Play, HardDriveDownload, Monitor, Sparkles } from 'lucide-react'
import { GAME_MODE_LABELS } from '../../shared/constants/game'
import type { GameMode } from '../../shared/types/game'

export interface ModeOption {
  id: GameMode
  title: string
  description: string
  icon: ReactNode
  route: string
  variant: 'primary' | 'secondary' | 'outline'
  features: string[]
}

const modeOptions: ModeOption[] = [
  {
    id: 'demo',
    title: GAME_MODE_LABELS.demo,
    description: 'Entre em segundos com um board de exemplo pronto para apresentar e testar o fluxo completo.',
    icon: <Monitor className="h-8 w-8" />,
    route: '/control?mode=demo',
    variant: 'outline',
    features: ['Board pronto', 'Sem persistência local', 'Ideal para apresentar']
  },
  {
    id: 'offline',
    title: 'Sessão Local no Navegador',
    description: 'Crie uma partida real, salve no navegador atual e continue depois neste mesmo dispositivo.',
    icon: <HardDriveDownload className="h-8 w-8" />,
    route: '/control?mode=offline',
    variant: 'secondary',
    features: ['Salvo neste navegador', 'Times e filmes próprios', 'Melhor opção para jogar']
  }
]

export function ModeSelector() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {modeOptions.map((mode) => (
        <Link key={mode.id} to={mode.route} className="group block">
          <div className="card-surface h-full rounded-[32px] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--color-primary)]/10 sm:p-6 xl:p-7">
            <div className="flex h-full flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div className={`inline-flex rounded-2xl p-3.5 ${
                  mode.variant === 'secondary'
                    ? 'bg-[var(--color-secondary)]/12 text-[var(--color-secondary)]'
                    : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                }`}>
                  {mode.icon}
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {mode.id === 'offline' ? 'principal' : 'rápido'}
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="max-w-[16ch] text-3xl font-semibold leading-[1.08] text-[var(--color-text)] xl:text-[2.15rem]">
                  {mode.title}
                </h3>
                <p className="max-w-[34rem] text-base leading-7 text-[var(--color-muted)]">
                  {mode.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {mode.features.map((feature, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3.5 py-2 text-sm font-medium text-[var(--color-text)]"
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${
                      mode.variant === 'secondary'
                        ? 'bg-[var(--color-secondary)]/90'
                        : 'bg-[var(--color-primary)]/80'
                    }`} />
                    <span className="whitespace-nowrap">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-2">
                <Button
                  variant={mode.variant}
                  size="md"
                  className="w-full sm:w-auto sm:min-w-[220px]"
                >
                  <Play className="h-4 w-4" />
                  {mode.id === 'offline' ? 'Abrir Sessão Local' : 'Entrar no Demo'}
                </Button>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

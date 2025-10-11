import { Link } from 'react-router-dom'
import { Button } from './Button'
import { Play, Wifi, WifiOff, Monitor } from 'lucide-react'

export type GameMode = 'demo' | 'offline' | 'online'

export interface ModeOption {
  id: GameMode
  title: string
  description: string
  icon: React.ReactNode
  route: string
  variant: 'primary' | 'secondary' | 'outline'
  features: string[]
}

const modeOptions: ModeOption[] = [
  {
    id: 'demo',
    title: 'Modo Demo',
    description: 'Experimente o jogo com dados de teste pré-configurados',
    icon: <Monitor className="h-8 w-8" />,
    route: '/control?mode=demo',
    variant: 'outline',
    features: ['Dados de teste', 'Sem persistência', 'Para demonstração']
  },
  {
    id: 'offline',
    title: 'Play Offline',
    description: 'Jogue localmente criando times e jogadores do zero',
    icon: <WifiOff className="h-8 w-8" />,
    route: '/control?mode=offline',
    variant: 'secondary',
    features: ['Criação do zero', 'Dados locais', 'Sem autenticação']
  },
  {
    id: 'online',
    title: 'Play Online',
    description: 'Jogue com autenticação e persistência na nuvem',
    icon: <Wifi className="h-8 w-8" />,
    route: '/control?mode=online',
    variant: 'primary',
    features: ['Autenticação Google', 'Persistência Firebase', 'Histórico de jogos']
  }
]

export function ModeSelector() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {modeOptions.map((mode) => (
        <Link
          key={mode.id}
          to={mode.route}
          className="group block"
        >
          <div className="card-surface h-full rounded-3xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[var(--color-primary)]/10">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`rounded-2xl p-4 ${
                mode.variant === 'primary' 
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
                  : mode.variant === 'secondary'
                  ? 'bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]'
                  : 'bg-[var(--color-muted)]/10 text-[var(--color-muted)]'
              }`}>
                {mode.icon}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[var(--color-text)]">
                  {mode.title}
                </h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  {mode.description}
                </p>
              </div>
              
              <div className="space-y-2 w-full">
                {mode.features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-center gap-2 text-xs text-[var(--color-muted)]"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]/60" />
                    {feature}
                  </div>
                ))}
              </div>
              
              <Button
                variant={mode.variant}
                size="md"
                className="w-full mt-4"
              >
                <Play className="h-4 w-4" />
                Selecionar Modo
              </Button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

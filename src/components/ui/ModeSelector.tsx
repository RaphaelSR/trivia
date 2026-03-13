import { useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from './Button'
import { Play, Wifi, WifiOff, Monitor } from 'lucide-react'
import { OnlinePasswordModal } from './OnlinePasswordModal'
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
    description: 'Experimente o jogo com dados de teste pré-configurados',
    icon: <Monitor className="h-8 w-8" />,
    route: '/control?mode=demo',
    variant: 'outline',
    features: ['Dados de teste', 'Sem persistência', 'Para demonstração']
  },
  {
    id: 'offline',
    title: GAME_MODE_LABELS.offline,
    description: 'Jogue localmente criando times e jogadores do zero',
    icon: <WifiOff className="h-8 w-8" />,
    route: '/control?mode=offline',
    variant: 'secondary',
    features: ['Criação do zero', 'Dados locais', 'Sem autenticação']
  },
  {
    id: 'online',
    title: GAME_MODE_LABELS.online,
    description: 'Use o fluxo online com repositório dedicado, pronto para evoluir para sincronização remota',
    icon: <Wifi className="h-8 w-8" />,
    route: '/control?mode=online',
    variant: 'primary',
    features: ['Sessões online isoladas', 'PIN dedicado', 'Preparado para backend']
  }
]

export function ModeSelector() {
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const navigate = useNavigate()

  const handleModeClick = (mode: ModeOption, e: MouseEvent) => {
    if (mode.id === 'online') {
      e.preventDefault()
      setPasswordModalOpen(true)
    }
  }

  const handlePasswordSuccess = () => {
    navigate('/control?mode=online')
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {modeOptions.map((mode) => (
          mode.id === 'online' ? (
            <button
              key={mode.id}
              onClick={(e) => handleModeClick(mode, e)}
              className="group block text-left w-full"
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
            </button>
          ) : (
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
          )
        ))}
      </div>

      <OnlinePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSuccess={handlePasswordSuccess}
      />
    </>
  )
}

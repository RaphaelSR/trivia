import { Check } from 'lucide-react'

type Step = {
  id: string
  title: string
  description: string
  completed: boolean
  current: boolean
  clickable: boolean
}

type StepsProps = {
  steps: Step[]
  onStepClick?: (stepId: string) => void
}

export function Steps({ steps, onStepClick }: StepsProps) {
  return (
    <div className="w-full flex justify-center">
      <div className="flex items-center justify-center max-w-2xl">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div 
              className={`flex flex-col items-center px-6 ${
                step.clickable ? 'cursor-pointer' : 'cursor-default'
              }`}
              onClick={() => step.clickable && onStepClick?.(step.id)}
            >
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                  step.completed
                    ? 'bg-[var(--color-success)] border-[var(--color-success)] text-white'
                    : step.current
                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                    : step.clickable
                    ? 'bg-[var(--color-background)] border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)]/50'
                    : 'bg-[var(--color-background)] border-[var(--color-border)] text-[var(--color-muted)]'
                }`}
              >
                {step.completed ? (
                  <Check size={24} />
                ) : (
                  <span className="text-lg font-semibold">{index + 1}</span>
                )}
              </div>
              <div className="mt-3 text-center">
                <p className={`text-base font-semibold ${
                  step.completed || step.current
                    ? 'text-[var(--color-text)]'
                    : step.clickable
                    ? 'text-[var(--color-text)] hover:text-[var(--color-primary)]'
                    : 'text-[var(--color-muted)]'
                }`}>
                  {step.title}
                </p>
                <p className="text-sm text-[var(--color-muted)] mt-1">
                  {step.description}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-2 transition-all duration-300 ${
                  step.completed
                    ? 'bg-[var(--color-success)]'
                    : 'bg-[var(--color-border)]'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

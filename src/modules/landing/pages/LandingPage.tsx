import { ModeSelector } from '../../../components/ui/ModeSelector'

export function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-surface)] px-6 py-16">
      <div className="w-full max-w-6xl">
        <div className="card-surface rounded-3xl px-10 py-12 text-center mb-8">
          <div className="space-y-6">
            <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-[var(--color-primary)]">
              Trivia Cinematográfico
            </span>
            <h1 className="text-balance text-4xl font-semibold text-[var(--color-text)] sm:text-5xl">
              Escolha como você quer jogar
            </h1>
            <p className="mx-auto max-w-2xl text-pretty text-base text-[var(--color-muted)] sm:text-lg">
              Selecione o modo de jogo que melhor se adapta à sua noite de trivia. 
              Experimente com dados de teste, jogue offline ou conecte-se online para uma experiência completa.
            </p>
          </div>
        </div>

        <div className="card-surface rounded-3xl px-10 py-12">
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-2">
                Modos de Jogo
              </h2>
              <p className="text-[var(--color-muted)]">
                Escolha entre três opções para sua experiência de trivia
              </p>
            </div>
            
            <ModeSelector />
          </div>
        </div>
      </div>
    </main>
  )
}

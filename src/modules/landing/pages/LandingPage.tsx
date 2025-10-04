import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'

export function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-surface)] px-6 py-16">
      <div className="card-surface w-full max-w-3xl rounded-3xl px-10 py-12 text-center">
        <div className="space-y-6">
          <span className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-[var(--color-primary)]">
            Trivia Cinematográfico
          </span>
          <h1 className="text-balance text-4xl font-semibold text-[var(--color-text)] sm:text-5xl">
            Organize e conduza sua noite de trivia com clareza
          </h1>
          <p className="mx-auto max-w-xl text-pretty text-base text-[var(--color-muted)] sm:text-lg">
            Acesse o painel do anfitrião para controlar perguntas, tempo e pontuação ou abra o modo display para projetar o tabuleiro na TV.
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/control" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto" size="lg">
              Entrar no modo controle
            </Button>
          </Link>
          <Link to="/display" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto" size="lg">
              Abrir modo display
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}

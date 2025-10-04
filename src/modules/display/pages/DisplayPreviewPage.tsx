export function DisplayPreviewPage() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-surface)] px-6 py-16">
      <div className="card-surface w-full max-w-2xl rounded-3xl p-10 text-center">
        <h2 className="text-3xl font-semibold text-[var(--color-text)] sm:text-4xl">Modo display</h2>
        <p className="mt-4 text-pretty text-[var(--color-muted)]">
          O modo display apresenta o tabuleiro e as perguntas para os jogadores. Em breve esta tela será sincronizada com o painel de controle para refletir o estado da partida em tempo real.
        </p>
      </div>
    </section>
  )
}

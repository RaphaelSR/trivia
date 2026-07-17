import { Film, LogIn, UserPlus, History } from 'lucide-react'
import { useState } from 'react'
import { ModeSelector } from '../../../components/ui/ModeSelector'
import { GameLayout } from '../../../shared/components/GameLayout'
import { BrazilBackground } from '../../../shared/components/BrazilBackground'
import { EasterBackground } from '../../../shared/components/EasterBackground'
import { useThemeMode } from '../../../app/providers/useThemeMode'
import { isSupabaseConfigured } from '../../../shared/services/supabase.client'
import { AuthPanel } from '../../auth/components/AuthPanel'
import { useAuth } from '../../auth/hooks/useAuth'
import { useTranslation } from '@/shared/i18n'
import { useNavigate } from 'react-router-dom'
import { createSessionRepository } from '@/modules/game/infrastructure/repository.factory'
import type { TriviaSession } from '@/modules/trivia/types'

type AuthTab = 'signin' | 'signup'

export function LandingPage() {
  const { t } = useTranslation('landing')
  const { t: tCommon } = useTranslation('common')
  const { theme } = useThemeMode()
  const supabaseEnabled = isSupabaseConfigured()
  const { user } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState<AuthTab>('signin')
  const navigate = useNavigate()

  const displayName =
    (user?.user_metadata as Record<string, string> | undefined)?.display_name ??
    user?.email?.split('@')[0] ??
    tCommon('account.label')

  function openAuth(tab: AuthTab) {
    setAuthTab(tab)
    setAuthOpen(true)
  }

  function openHistoricalCopy(session: TriviaSession): boolean {
    // A experiência pública tem um único estilo de partida completa. O ID
    // interno `offline` continua por compatibilidade; com conta, o dashboard
    // sincroniza esta nova sessão em background assim que abrir.
    const saved = createSessionRepository('offline').saveSession(
      session,
      'offline',
      session.title,
      null,
    )
    if (!saved) return false
    setAuthOpen(false)
    navigate('/control?mode=offline')
    return true
  }

  return (
    <GameLayout className="relative flex items-center justify-center">
      {theme === 'brazil' && <BrazilBackground />}
      {theme === 'easter' && <EasterBackground />}

      {/* Modal de autenticação */}
      {supabaseEnabled && authOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setAuthOpen(false) }}
        >
          <AuthPanel
            initialTab={authTab}
            onClose={() => setAuthOpen(false)}
            onOpenHistoricalCopy={openHistoricalCopy}
          />
        </div>
      )}

      <section className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-10 py-8 sm:py-16 lg:py-24">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)]">
            <Film className="h-3.5 w-3.5" />
            {t('eyebrow')}
          </div>
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-[var(--color-text)] sm:text-4xl lg:text-5xl">
            {t('title')}
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-[var(--color-muted)]">
            {t('description')}
          </p>
        </div>

        {/* Mode Cards */}
        <div className="w-full">
          <ModeSelector />
        </div>

        {/* Barra de conta — visível junto dos estilos quando o Supabase está disponível.
            Entrar/criar conta NUNCA apaga a sessão local salva neste navegador. */}
        {supabaseEnabled && (
          <div className="card-surface flex w-full flex-col items-start justify-between gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:p-6">
            {user ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-sm font-semibold uppercase text-[var(--color-primary)]">
                    {displayName.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{t('auth.signedInAs', { name: displayName })}</p>
                    <p className="text-xs text-[var(--color-muted)]">{t('auth.signedInDescription')}</p>
                  </div>
                </div>
                <button
                  onClick={() => openAuth('signin')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  <History className="h-4 w-4" />
                  {t('auth.historyAction')}
                </button>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">{t('auth.signedOutTitle')}</p>
                  <p className="text-xs text-[var(--color-muted)]">{t('auth.signedOutDescription')}</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => openAuth('signin')}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    <LogIn className="h-4 w-4" />
                    {tCommon('account.signIn')}
                  </button>
                  <button
                    onClick={() => openAuth('signup')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-background)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-primary)_88%,var(--color-background)_12%)]"
                  >
                    <UserPlus className="h-4 w-4" />
                    {tCommon('account.signUp')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Info footer */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--color-muted)]">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
            {t('footer.balancedTurns')}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-secondary)]" />
            {t('footer.triviaAndMimica')}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
            {t('footer.hostDashboard')}
          </span>
        </div>
      </section>
    </GameLayout>
  )
}

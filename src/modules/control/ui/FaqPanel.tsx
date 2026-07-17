import { ChevronDown, ChevronRight, HelpCircle, Library, RotateCcw, Trophy, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/shared/i18n'

type FaqSection = {
  id: string
  title: string
  icon: typeof HelpCircle
  items: Array<{ question: string; answer: string }>
}

interface FaqPanelProps {
  onOpenOnboarding: () => void
}

export function FaqPanel({ onOpenOnboarding }: FaqPanelProps) {
  const { t } = useTranslation('control')

  const sections = useMemo<FaqSection[]>(() => [
    {
      id: 'getting-started',
      title: t('faq.sections.gettingStarted.title'),
      icon: HelpCircle,
      items: [
        { question: t('faq.sections.gettingStarted.items.mode.question'), answer: t('faq.sections.gettingStarted.items.mode.answer') },
        { question: t('faq.sections.gettingStarted.items.storage.question'), answer: t('faq.sections.gettingStarted.items.storage.answer') },
        { question: t('faq.sections.gettingStarted.items.onboarding.question'), answer: t('faq.sections.gettingStarted.items.onboarding.answer') },
      ],
    },
    {
      id: 'round-flow',
      title: t('faq.sections.roundFlow.title'),
      icon: RotateCcw,
      items: [
        { question: t('faq.sections.roundFlow.items.panel.question'), answer: t('faq.sections.roundFlow.items.panel.answer') },
        { question: t('faq.sections.roundFlow.items.close.question'), answer: t('faq.sections.roundFlow.items.close.answer') },
        { question: t('faq.sections.roundFlow.items.voided.question'), answer: t('faq.sections.roundFlow.items.voided.answer') },
        { question: t('faq.sections.roundFlow.items.finish.question'), answer: t('faq.sections.roundFlow.items.finish.answer') },
      ],
    },
    {
      id: 'trivia-scoring',
      title: t('faq.sections.triviaScoring.title'),
      icon: Trophy,
      items: [
        { question: t('faq.sections.triviaScoring.items.rules.question'), answer: t('faq.sections.triviaScoring.items.rules.answer') },
        { question: t('faq.sections.triviaScoring.items.split.question'), answer: t('faq.sections.triviaScoring.items.split.answer') },
        { question: t('faq.sections.triviaScoring.items.player.question'), answer: t('faq.sections.triviaScoring.items.player.answer') },
      ],
    },
    {
      id: 'mimica-scoring',
      title: t('faq.sections.mimicaScoring.title'),
      icon: UsersRound,
      items: [
        { question: t('faq.sections.mimicaScoring.items.modes.question'), answer: t('faq.sections.mimicaScoring.items.modes.answer') },
        { question: t('faq.sections.mimicaScoring.items.calculation.question'), answer: t('faq.sections.mimicaScoring.items.calculation.answer') },
        { question: t('faq.sections.mimicaScoring.items.order.question'), answer: t('faq.sections.mimicaScoring.items.order.answer') },
      ],
    },
    {
      id: 'teams-turns',
      title: t('faq.sections.teamsTurns.title'),
      icon: UsersRound,
      items: [
        { question: t('faq.sections.teamsTurns.items.build.question'), answer: t('faq.sections.teamsTurns.items.build.answer') },
        { question: t('faq.sections.teamsTurns.items.preview.question'), answer: t('faq.sections.teamsTurns.items.preview.answer') },
        { question: t('faq.sections.teamsTurns.items.edit.question'), answer: t('faq.sections.teamsTurns.items.edit.answer') },
        { question: t('faq.sections.teamsTurns.items.regenerate.question'), answer: t('faq.sections.teamsTurns.items.regenerate.answer') },
      ],
    },
    {
      id: 'library',
      title: t('faq.sections.library.title'),
      icon: Library,
      items: [
        { question: t('faq.sections.library.items.purpose.question'), answer: t('faq.sections.library.items.purpose.answer') },
        { question: t('faq.sections.library.items.pin.question'), answer: t('faq.sections.library.items.pin.answer') },
        { question: t('faq.sections.library.items.board.question'), answer: t('faq.sections.library.items.board.answer') },
      ],
    },
    {
      id: 'persistence',
      title: t('faq.sections.persistence.title'),
      icon: RotateCcw,
      items: [
        { question: t('faq.sections.persistence.items.account.question'), answer: t('faq.sections.persistence.items.account.answer') },
        { question: t('faq.sections.persistence.items.reset.question'), answer: t('faq.sections.persistence.items.reset.answer') },
        { question: t('faq.sections.persistence.items.pin.question'), answer: t('faq.sections.persistence.items.pin.answer') },
      ],
    },
  ], [t])

  const [openSectionId, setOpenSectionId] = useState('getting-started')

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-white/8 bg-black/10 p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--color-muted)]">{t('faq.eyebrow')}</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-[var(--color-text)]">{t('faq.title')}</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">{t('faq.description')}</p>
          </div>
          <Button variant="outline" onClick={onOpenOnboarding} className="gap-2">
            <HelpCircle className="h-4 w-4" />
            {t('faq.reopenOnboarding')}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section) => {
          const isOpen = openSectionId === section.id
          const Icon = section.icon

          return (
            <section key={section.id} className="overflow-hidden rounded-[24px] border border-white/8 bg-black/10">
              <button
                type="button"
                onClick={() => setOpenSectionId(isOpen ? '' : section.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[var(--color-primary)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-[var(--color-text)]">{section.title}</p>
                    <p className="text-xs text-[var(--color-muted)]">{t('faq.answerCount', { count: section.items.length })}</p>
                  </div>
                </div>
                {isOpen ? <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" /> : <ChevronRight className="h-4 w-4 text-[var(--color-muted)]" />}
              </button>

              {isOpen ? (
                <div className="space-y-4 border-t border-white/8 px-5 py-4">
                  {section.items.map((item) => (
                    <div key={item.question} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                      <p className="text-sm font-semibold text-[var(--color-text)]">{item.question}</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">{item.answer}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}

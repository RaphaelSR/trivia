import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gamepad2, Monitor, Play, Sparkles } from 'lucide-react'
import {
  DEFAULT_DEMO_SESSION_CONFIG,
  DEMO_MEMBERS_PER_TEAM_OPTIONS,
  DEMO_QUESTION_OPTIONS,
  DEMO_TEAM_OPTIONS,
} from '../../shared/constants/game'
import { useTranslation } from '@/shared/i18n'

function buildDemoRoute(teamCount: number, membersPerTeam: number, questionCount: number) {
  const searchParams = new URLSearchParams({
    mode: 'demo',
    demoTeams: String(teamCount),
    demoMembers: String(membersPerTeam),
    demoQuestions: String(questionCount),
  })

  return `/control?${searchParams.toString()}`
}

type SelectorProps = {
  label: string
  value: number
  options: readonly number[]
  valueLabel: string
  onChange: (value: number) => void
}

function DemoOptionSelector({ label, value, options, valueLabel, onChange }: SelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">{label}</span>
        <span className="text-sm font-semibold text-[var(--color-text)]">
          {valueLabel}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option === value

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-background)]'
                  : 'border-white/10 bg-black/10 text-[var(--color-text)] hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ModeSelector() {
  const { t } = useTranslation('landing')
  const { t: tCommon } = useTranslation('common')
  const [demoTeams, setDemoTeams] = useState(DEFAULT_DEMO_SESSION_CONFIG.teamCount)
  const [demoMembersPerTeam, setDemoMembersPerTeam] = useState(DEFAULT_DEMO_SESSION_CONFIG.membersPerTeam)
  const [demoQuestions, setDemoQuestions] = useState(DEFAULT_DEMO_SESSION_CONFIG.questionCount)

  const demoRoute = useMemo(
    () => buildDemoRoute(demoTeams, demoMembersPerTeam, demoQuestions),
    [demoMembersPerTeam, demoQuestions, demoTeams],
  )

  const demoSummary = useMemo(() => {
    const participantCount = demoTeams * demoMembersPerTeam
    return [
      tCommon('entities.team', { count: demoTeams }),
      t('demo.playersPerTeamSummary', { count: demoMembersPerTeam }),
      t('demo.peopleTotal', { count: participantCount }),
      tCommon('entities.question', { count: demoQuestions }),
    ]
  }, [demoMembersPerTeam, demoQuestions, demoTeams, t, tCommon])

  const gameFeatures = [
    t('game.featureGame'),
    t('game.featureAutosave'),
    t('game.featureAccount'),
  ]

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="card-surface h-full rounded-[32px] p-5 sm:p-6 xl:p-7">
        <div className="flex h-full flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="inline-flex rounded-2xl bg-[var(--color-primary)]/10 p-3.5 text-[var(--color-primary)]">
              <Monitor className="h-8 w-8" />
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
              <Sparkles className="h-3.5 w-3.5" />
              {t('demo.badge')}
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="max-w-[16ch] text-3xl font-semibold leading-[1.08] text-[var(--color-text)] xl:text-[2.15rem]">
              {t('demo.title')}
            </h3>
            <p className="max-w-[34rem] text-base leading-7 text-[var(--color-muted)]">
              {t('demo.description')}
            </p>
          </div>

          <div className="grid gap-4">
            <DemoOptionSelector
              label={t('demo.teams')}
              value={demoTeams}
              options={DEMO_TEAM_OPTIONS}
              valueLabel={tCommon('entities.team', { count: demoTeams })}
              onChange={setDemoTeams}
            />
            <DemoOptionSelector
              label={t('demo.playersPerTeam')}
              value={demoMembersPerTeam}
              options={DEMO_MEMBERS_PER_TEAM_OPTIONS}
              valueLabel={tCommon('entities.player', { count: demoMembersPerTeam })}
              onChange={setDemoMembersPerTeam}
            />
            <DemoOptionSelector
              label={t('demo.questions')}
              value={demoQuestions}
              options={DEMO_QUESTION_OPTIONS}
              valueLabel={tCommon('entities.question', { count: demoQuestions })}
              onChange={setDemoQuestions}
            />
          </div>

          <div className="flex flex-wrap gap-2.5">
            {demoSummary.map((feature) => (
              <div
                key={feature}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3.5 py-2 text-sm font-medium text-[var(--color-text)]"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]/80" />
                <span className="whitespace-nowrap">{feature}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[var(--color-primary)]/18 bg-[var(--color-primary)]/7 px-4 py-3 text-sm text-[var(--color-muted)]">
            {t('demo.helper')}
          </div>

          <div className="mt-auto pt-2">
            <Link
              to={demoRoute}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-transparent px-4 text-sm font-semibold text-[var(--color-text)] transition-all duration-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)] active:scale-[0.97] sm:w-auto sm:min-w-[220px]"
            >
              <Play className="h-4 w-4" />
              {t('demo.action')}
            </Link>
          </div>
        </div>
      </div>

      <div className="card-surface h-full rounded-[32px] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--color-primary)]/10 sm:p-6 xl:p-7">
        <div className="flex h-full flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="inline-flex rounded-2xl bg-[var(--color-secondary)]/12 p-3.5 text-[var(--color-secondary)]">
              <Gamepad2 className="h-8 w-8" />
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
              <Sparkles className="h-3.5 w-3.5" />
              {t('game.badge')}
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="max-w-[16ch] text-3xl font-semibold leading-[1.08] text-[var(--color-text)] xl:text-[2.15rem]">
              {t('game.title')}
            </h3>
            <p className="max-w-[34rem] text-base leading-7 text-[var(--color-muted)]">
              {t('game.description')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {gameFeatures.map((feature) => (
              <div
                key={feature}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3.5 py-2 text-sm font-medium text-[var(--color-text)]"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-secondary)]/90" />
                <span className="whitespace-nowrap">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-2">
            <Link
              to="/control?mode=offline"
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-secondary)] px-4 text-sm font-semibold text-[var(--color-text)] shadow-md transition-all duration-200 hover:bg-[color:color-mix(in_srgb,var(--color-secondary)_88%,var(--color-background)_12%)] hover:shadow-lg hover:shadow-[var(--color-secondary)]/25 active:scale-[0.97] sm:w-auto sm:min-w-[220px]"
            >
              <Play className="h-4 w-4" />
              {t('game.action')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

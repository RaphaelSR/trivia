import { RefreshCw, Shuffle, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { buildTurnSequence, getRecommendedPreviewTurnCount } from '@/modules/game/domain/turn-order'
import type { ParticipantDraft, TeamDraft } from '../types/control.types'
import {
  buildRandomizedTeamDrafts,
  createParticipantId,
  secureBrowserRandom,
} from '../utils/teamUtils'
import { convertDraftsToParticipants, convertDraftsToTeams } from '../utils/sessionUtils'
import { isValidEmail } from '@/shared/utils/email'
import type { InvitedContact } from '@/modules/auth/services/normalized-history.service'
import { TurnOrderPreview } from './TurnOrderPreview'

type TeamRandomizerModalProps = {
  isOpen: boolean
  onClose: () => void
  onApply: (drafts: TeamDraft[]) => void
  teamDrafts: TeamDraft[]
  gameMode: string
  inviteContacts: InvitedContact[]
  previewQuestionCount: number
}

function newCandidate(): ParticipantDraft {
  return { id: createParticipantId(), name: '', role: 'player' }
}

export function TeamRandomizerModal({
  isOpen,
  onClose,
  onApply,
  teamDrafts,
  gameMode,
  inviteContacts,
  previewQuestionCount,
}: TeamRandomizerModalProps) {
  const isOnline = gameMode === 'online'
  const [candidates, setCandidates] = useState<ParticipantDraft[]>([])
  const [teamCount, setTeamCount] = useState(2)
  const [result, setResult] = useState<TeamDraft[] | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const current = teamDrafts.flatMap((team) => team.members.map((member) => ({ ...member })))
    const initialCandidates = current.length > 0 ? current : [newCandidate(), newCandidate()]
    setCandidates(initialCandidates)
    setTeamCount(Math.min(Math.max(teamDrafts.length, 2), Math.max(initialCandidates.length, 2)))
    setResult(null)
  }, [isOpen, teamDrafts])

  const namedCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.name.trim().length > 0),
    [candidates],
  )

  const duplicateEmails = useMemo(() => {
    const counts = new Map<string, number>()
    candidates.forEach((candidate) => {
      const email = candidate.email?.trim().toLowerCase() ?? ''
      if (!isValidEmail(email)) return
      counts.set(email, (counts.get(email) ?? 0) + 1)
    })
    return [...counts.entries()].filter(([, count]) => count > 1).map(([email]) => email)
  }, [candidates])

  const preview = useMemo(() => {
    if (!result) return null
    const teams = convertDraftsToTeams(result, [])
    const participants = convertDraftsToParticipants(result)
    const turnCount = previewQuestionCount || getRecommendedPreviewTurnCount(teams, 1)
    return {
      teams,
      participants,
      sequence: buildTurnSequence(teams, turnCount),
    }
  }, [previewQuestionCount, result])

  const updateCandidate = (id: string, updates: Partial<ParticipantDraft>) => {
    setCandidates((current) => current.map((candidate) =>
      candidate.id === id ? { ...candidate, ...updates } : candidate,
    ))
    setResult(null)
  }

  const removeCandidate = (id: string) => {
    setCandidates((current) => current.filter((candidate) => candidate.id !== id))
    setResult(null)
  }

  const addCandidate = () => {
    setCandidates((current) => [...current, newCandidate()])
    setResult(null)
  }

  const draw = () => {
    const next = buildRandomizedTeamDrafts(
      teamDrafts,
      candidates,
      teamCount,
      secureBrowserRandom,
    )
    setResult(next.length > 0 ? next : null)
  }

  const canDraw = namedCandidates.length >= 2 &&
    teamCount >= 2 &&
    teamCount <= namedCandidates.length

  return (
    <Modal
      isOpen={isOpen}
      title="Sortear times"
      description="Reúna as pessoas, escolha quantos times jogarão e confira a formação antes de aplicá-la."
      onClose={onClose}
      size="xl"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <label className="block text-sm font-semibold text-[var(--color-text)]" htmlFor="draw-team-count">
              Quantidade de times
            </label>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Os tamanhos serão equilibrados automaticamente.
            </p>
            <input
              id="draw-team-count"
              type="number"
              min={2}
              max={Math.max(namedCandidates.length, 2)}
              value={teamCount}
              onChange={(event) => {
                setTeamCount(Number(event.target.value))
                setResult(null)
              }}
              className="mt-3 w-28 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">Pessoas</h3>
                <p className="text-xs text-[var(--color-muted)]">
                  {namedCandidates.length} participante{namedCandidates.length === 1 ? '' : 's'} pronto{namedCandidates.length === 1 ? '' : 's'}.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={addCandidate}>
                <UserPlus size={14} /> Adicionar
              </Button>
            </div>

            <div className="mt-4 max-h-[42vh] space-y-3 overflow-y-auto pr-1">
              {candidates.map((candidate, index) => (
                <div key={candidate.id} className="rounded-xl border border-[var(--color-border)] p-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs text-[var(--color-muted)]">{index + 1}</span>
                    <input
                      value={candidate.name}
                      onChange={(event) => updateCandidate(candidate.id, { name: event.target.value })}
                      placeholder="Nome da pessoa"
                      aria-label={`Nome da pessoa ${index + 1}`}
                      className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover pessoa ${index + 1}`}
                      onClick={() => removeCandidate(candidate.id)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                  {candidate.role !== 'player' ? (
                    <p className="mt-2 pl-8 text-xs text-[var(--color-muted)]">
                      Papel preservado: {candidate.role === 'host' ? 'anfitrião' : 'assistente'}.
                    </p>
                  ) : null}
                  {isOnline ? (
                    <div className="mt-2 pl-8">
                      <input
                        type="email"
                        list="draw-invite-contacts"
                        value={candidate.email ?? ''}
                        onChange={(event) => updateCandidate(candidate.id, { email: event.target.value })}
                        placeholder="e-mail opcional"
                        aria-label={`E-mail de ${candidate.name || `pessoa ${index + 1}`}`}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
                      />
                      {candidate.email?.trim() && !isValidEmail(candidate.email.trim()) ? (
                        <p className="mt-1 text-xs text-amber-500">Formato inválido: não reservará uma conta.</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {isOnline ? (
              <datalist id="draw-invite-contacts">
                {inviteContacts.map((contact) => (
                  <option key={contact.email} value={contact.email} label={contact.lastName} />
                ))}
              </datalist>
            ) : null}

            {duplicateEmails.length > 0 ? (
              <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
                E-mail repetido: uma conta poderá reivindicar somente um dos slots.
              </p>
            ) : null}
          </div>

          <Button className="w-full" onClick={draw} disabled={!canDraw}>
            <Shuffle size={16} /> {result ? 'Sortear novamente' : 'Sortear formação'}
          </Button>
          {!canDraw ? (
            <p className="text-center text-xs text-[var(--color-muted)]">
              Informe ao menos duas pessoas e não crie mais times do que participantes.
            </p>
          ) : null}
        </section>

        <section className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
          {!preview || !result ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
              <Shuffle size={28} className="text-[var(--color-muted)]" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">Prévia da formação</h3>
                <p className="mt-1 max-w-sm text-xs text-[var(--color-muted)]">
                  O sorteio ainda não altera a sessão. Você poderá revisar tudo antes de usar.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {result.map((team) => (
                  <div key={team.id} className="rounded-xl border border-[var(--color-border)] p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                      <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">{team.name}</h3>
                    </div>
                    <ol className="mt-2 space-y-1">
                      {team.members.map((member, index) => (
                        <li key={member.id} className="truncate text-xs text-[var(--color-muted)]">
                          {index + 1}. {member.name}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>

              <TurnOrderPreview
                teams={preview.teams}
                participants={preview.participants}
                turnSequence={preview.sequence}
                sequenceSource="draft"
                maxGroups={2}
                title="Primeiros turnos"
                description="A mesma alternância balanceada usada pelo jogo."
              />

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={draw}>
                  <RefreshCw size={15} /> Sortear novamente
                </Button>
                <Button
                  onClick={() => {
                    onApply(result)
                    onClose()
                  }}
                >
                  Usar esta formação
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}

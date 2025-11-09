import { ArrowDown, ArrowUp, Plus, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { TeamDraft } from '../types/control.types'
import type { TriviaParticipant } from '@/modules/trivia/types'

type TeamsManagementModalProps = {
  isOpen: boolean
  onClose: () => void
  teamDrafts: TeamDraft[]
  canSave: boolean
  onAddTeam: () => void
  onRemoveTeam: (teamId: string) => void
  onUpdateTeam: (teamId: string, updates: Partial<Omit<TeamDraft, 'id' | 'members'>>) => void
  onMoveTeam: (teamId: string, direction: -1 | 1) => void
  onAddParticipant: (teamId: string) => void
  onRemoveParticipant: (teamId: string, participantId: string) => void
  onUpdateParticipant: (
    teamId: string,
    participantId: string,
    updates: Partial<{ id: string; name: string; role: TriviaParticipant['role'] }>
  ) => void
  onMoveParticipant: (teamId: string, participantId: string, direction: -1 | 1) => void
  onSave: () => void
}

/**
 * Modal para gerenciar times e participantes
 */
export function TeamsManagementModal({
  isOpen,
  onClose,
  teamDrafts,
  canSave,
  onAddTeam,
  onRemoveTeam,
  onUpdateTeam,
  onMoveTeam,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateParticipant,
  onMoveParticipant,
  onSave,
}: TeamsManagementModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="Gestão de times"
      description="Ajuste nomes, participantes e ordem de turno das equipes."
      onClose={onClose}
    >
      <div className="flex items-center justify-between pb-4">
        <p className="text-sm text-[var(--color-muted)]">Organize os times e defina a rotação dos jogadores.</p>
        <Button variant="outline" size="sm" onClick={onAddTeam}>
          <Plus size={14} /> Adicionar time
        </Button>
      </div>
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        {teamDrafts.map((team, index) => (
          <div key={team.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                  Time {index + 1}
                </span>
                <input
                  value={team.name}
                  onChange={(event) => onUpdateTeam(team.id, { name: event.target.value })}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
                />
                <input
                  type="color"
                  value={team.color}
                  onChange={(event) => onUpdateTeam(team.id, { color: event.target.value })}
                  className="h-9 w-12 cursor-pointer rounded-md border border-[var(--color-border)] bg-[var(--color-background)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMoveTeam(team.id, -1)}
                  disabled={index === 0}
                  aria-label="Mover time para cima"
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMoveTeam(team.id, 1)}
                  disabled={index === teamDrafts.length - 1}
                  aria-label="Mover time para baixo"
                >
                  <ArrowDown size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveTeam(team.id)}
                  aria-label="Remover time"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
            <div className="space-y-3 px-4 pb-4">
              {team.members.map((member, memberIndex) => (
                <div key={member.id} className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <input
                      value={member.name}
                      onChange={(event) =>
                        onUpdateParticipant(team.id, member.id, { name: event.target.value })
                      }
                      className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)]"
                    />
                    <select
                      value={member.role}
                      onChange={(event) =>
                        onUpdateParticipant(team.id, member.id, {
                          role: event.target.value as TriviaParticipant['role'],
                        })
                      }
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-2 text-sm text-[var(--color-text)]"
                    >
                      <option value="host">Anfitrião</option>
                      <option value="assistant">Assistente</option>
                      <option value="player">Jogador</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onMoveParticipant(team.id, member.id, -1)}
                        disabled={memberIndex === 0}
                        aria-label="Mover participante para cima"
                      >
                        <ArrowUp size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onMoveParticipant(team.id, member.id, 1)}
                        disabled={memberIndex === team.members.length - 1}
                        aria-label="Mover participante para baixo"
                      >
                        <ArrowDown size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveParticipant(team.id, member.id)}
                        aria-label="Remover participante"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => onAddParticipant(team.id)}>
                <UserPlus size={14} /> Adicionar participante
              </Button>
            </div>
          </div>
        ))}
        {!teamDrafts.length ? (
          <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-4 py-10 text-center text-sm text-[var(--color-muted)]">
            Nenhum time cadastrado. Adicione um novo time para começar.
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <Button variant="secondary" disabled={!canSave} onClick={onSave}>
          Salvar alterações
        </Button>
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </Modal>
  )
}


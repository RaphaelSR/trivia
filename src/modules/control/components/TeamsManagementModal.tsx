import { ArrowDown, ArrowUp, Plus, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { TeamDraft } from '../types/control.types'
import type { TriviaParticipant, TriviaTeam } from '@/modules/trivia/types'
import { TurnOrderPreview } from './TurnOrderPreview'
import { isValidEmail } from '@/shared/utils/email'
import {
  listMyInvitedContacts,
  type InvitedContact,
} from '@/modules/auth/services/normalized-history.service'

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
    updates: Partial<{ id: string; name: string; role: TriviaParticipant['role']; email: string }>
  ) => void
  onMoveParticipant: (teamId: string, participantId: string, direction: -1 | 1) => void
  previewTeams: TriviaTeam[]
  previewParticipants: TriviaParticipant[]
  previewTurnSequence: string[]
  previewQuestionCount: number
  onSave: () => void
  /** Modo de jogo atual — campo de e-mail só aparece quando gameMode === 'online' */
  gameMode: string
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
  previewTeams,
  previewParticipants,
  previewTurnSequence,
  previewQuestionCount,
  onSave,
  gameMode,
}: TeamsManagementModalProps) {
  const isOnline = gameMode === 'online'
  const [previewOpen, setPreviewOpen] = useState(false)
  const [inviteContacts, setInviteContacts] = useState<InvitedContact[]>([])

  // Carrega contatos de convites anteriores do host apenas no modo online e
  // enquanto o modal está aberto. No-op silencioso se vazio (primeira partida).
  useEffect(() => {
    if (!isOnline || !isOpen) return
    listMyInvitedContacts().then(setInviteContacts).catch(() => {
      // nunca lança — listMyInvitedContacts já absorve erros
    })
  }, [isOnline, isOpen])
  const canPreview = useMemo(
    () =>
      previewQuestionCount > 0 &&
      previewTurnSequence.length > 0 &&
      previewTeams.length >= 2 &&
      previewTeams.every((team) => team.members.length > 0),
    [previewQuestionCount, previewTeams, previewTurnSequence.length],
  )

  // Contagem de e-mails válidos para o rodapé não-bloqueante (só no modo online).
  const validEmailCount = useMemo(() => {
    if (!isOnline) return 0
    return teamDrafts.flatMap((t) => t.members).filter((m) => isValidEmail(m.email ?? '')).length
  }, [isOnline, teamDrafts])

  const totalParticipantCount = useMemo(
    () => teamDrafts.flatMap((t) => t.members).length,
    [teamDrafts],
  )

  return (
    <>
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
                    {isOnline && (
                      <div className="space-y-1">
                        <input
                          type="email"
                          list="invite-contacts"
                          value={member.email ?? ''}
                          onChange={(event) => {
                            const raw = event.target.value
                            onUpdateParticipant(team.id, member.id, { email: raw })
                          }}
                          placeholder="e-mail (opcional, para vincular conta)"
                          aria-label={`E-mail de ${member.name}`}
                          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)]"
                        />
                        {/* Helper reativo: só mostra quando há algum texto digitado */}
                        {(member.email ?? '') !== '' && (
                          <p className="text-xs text-[var(--color-muted)]">
                            {isValidEmail(member.email ?? '')
                              ? 'Será vinculado automaticamente quando entrar com este e-mail.'
                              : 'Verifique o e-mail — sem isto o jogador ainda joga normalmente.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => onAddParticipant(team.id)}>
                  <UserPlus size={14} /> Adicionar participante
                </Button>
              </div>
            </div>
          ))}
          {/* datalist de autocomplete: privacy-safe (apenas e-mails que o próprio
              host já convidou antes, via RPC SECURITY INVOKER + RLS owner-only).
              Renderizado somente em modo online; invisível para demo/offline. */}
          {isOnline && (
            <datalist id="invite-contacts">
              {inviteContacts.map((c) => (
                <option key={c.email} value={c.email} label={c.lastName} />
              ))}
            </datalist>
          )}

          {!teamDrafts.length ? (
            <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-4 py-10 text-center text-sm text-[var(--color-muted)]">
              Nenhum time cadastrado. Adicione um novo time para começar.
            </p>
          ) : null}

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-[var(--color-text)]">Preview da partida</h4>
                <p className="text-sm text-[var(--color-muted)]">
                  A prévia completa só aparece quando a sessão já tem times válidos e perguntas reais no board.
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  A rodada fecha quando todos os participantes aparecerem pelo menos uma vez.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setPreviewOpen(true)} disabled={!canPreview}>
                  Ver preview completo
                </Button>
              </div>
            </div>

            {!canPreview ? (
              <div className="mt-3 rounded-xl border border-[var(--color-secondary)]/20 bg-[var(--color-secondary)]/10 px-3 py-2 text-xs text-[var(--color-muted)]">
                Preencha times com participantes e tenha perguntas no board para liberar a prévia real da partida.
              </div>
            ) : null}
          </div>
        </div>
        {/* Rodapé não-bloqueante: aparece apenas em modo online com ≥1 e-mail válido.
            Informa ao host quantos jogadores serão vinculados, sem bloquear salvar. */}
        {isOnline && validEmailCount > 0 && (
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            {validEmailCount} de {totalParticipantCount} jogador
            {totalParticipantCount !== 1 ? 'es' : ''} ser
            {validEmailCount !== 1 ? 'ão vinculados' : 'á vinculado'} por e-mail. O jogo funciona
            com ou sem isso.
          </p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" disabled={!canSave} onClick={onSave}>
            Salvar alterações
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={previewOpen}
        title="Preview completo da partida"
        description="Confira a ordem inteira da sessão com base nos times atuais e no board já preenchido."
        onClose={() => setPreviewOpen(false)}
        size="xl"
      >
        <TurnOrderPreview
          teams={previewTeams}
          participants={previewParticipants}
          turnSequence={previewTurnSequence}
          sequenceSource="draft"
          title="Ordem prevista para a sessão"
          description="Esta prévia usa a sequência real do jogo e mostra a partida inteira dentro do cenário atual."
        />
      </Modal>
    </>
  )
}

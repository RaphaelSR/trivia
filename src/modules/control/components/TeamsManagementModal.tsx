import { ArrowDown, ArrowUp, Plus, QrCode, Shuffle, Trash2, UserPlus } from 'lucide-react'
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
import { TeamRandomizerModal } from './TeamRandomizerModal'
import { LiveSessionInviteModal } from './LiveSessionInviteModal'
import { ParticipantAvatar } from '@/shared/components/ParticipantAvatar'
import type { ParticipantIdentity } from '@/modules/auth/services/profile-avatar.service'
import { useTranslation } from '@/shared/i18n'

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
  onReplaceDrafts: (drafts: TeamDraft[]) => void
  canRandomizeRoster: boolean
  canInviteLivePlayers?: boolean
  hasUnsavedLiveRosterChanges?: boolean
  sessionClientId?: string
  onPrepareLiveInvite?: () => Promise<boolean>
  participantIdentities?: Record<string, ParticipantIdentity>
  /** Recursos de conta disponíveis para esta partida (sync, convites e identidades). */
  connectedFeaturesEnabled?: boolean
  /** @deprecated Compatibilidade temporária com consumidores anteriores. */
  gameMode?: string
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
  onReplaceDrafts,
  canRandomizeRoster,
  canInviteLivePlayers = false,
  hasUnsavedLiveRosterChanges = false,
  sessionClientId = '',
  onPrepareLiveInvite = async () => false,
  participantIdentities = {},
  connectedFeaturesEnabled,
  gameMode,
}: TeamsManagementModalProps) {
  const { t } = useTranslation(['control', 'common'])
  const canUseConnectedFeatures = gameMode === 'demo'
    ? false
    : connectedFeaturesEnabled ?? gameMode === 'online'
  const [previewOpen, setPreviewOpen] = useState(false)
  const [randomizerOpen, setRandomizerOpen] = useState(false)
  const [liveInviteOpen, setLiveInviteOpen] = useState(false)
  const [inviteContacts, setInviteContacts] = useState<InvitedContact[]>([])

  // Carrega contatos anteriores apenas quando os recursos conectados estão ativos e
  // enquanto o modal está aberto. No-op silencioso se vazio (primeira partida).
  useEffect(() => {
    if (!canUseConnectedFeatures || !isOpen) return
    listMyInvitedContacts().then(setInviteContacts).catch(() => {
      // nunca lança — listMyInvitedContacts já absorve erros
    })
  }, [canUseConnectedFeatures, isOpen])
  const canPreview = useMemo(
    () =>
      previewQuestionCount > 0 &&
      previewTurnSequence.length > 0 &&
      previewTeams.length >= 2 &&
      previewTeams.every((team) => team.members.length > 0),
    [previewQuestionCount, previewTeams, previewTurnSequence.length],
  )

  // Contagem de e-mails válidos para o rodapé não-bloqueante.
  const validEmailCount = useMemo(() => {
    if (!canUseConnectedFeatures) return 0
    return teamDrafts.flatMap((t) => t.members).filter((m) => isValidEmail(m.email ?? '')).length
  }, [canUseConnectedFeatures, teamDrafts])

  const totalParticipantCount = useMemo(
    () => teamDrafts.flatMap((t) => t.members).length,
    [teamDrafts],
  )

  return (
    <>
      <Modal
        isOpen={isOpen}
        title={t('teams.title', { ns: 'control' })}
        description={t('teams.description', { ns: 'control' })}
        onClose={onClose}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <p className="text-sm text-[var(--color-muted)]">{t('teams.helper', { ns: 'control' })}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRandomizerOpen(true)}
              disabled={!canRandomizeRoster}
            >
              <Shuffle size={14} /> {t('teams.randomize', { ns: 'control' })}
            </Button>
            <Button variant="outline" size="sm" onClick={onAddTeam}>
              <Plus size={14} /> {t('teams.addTeam', { ns: 'control' })}
            </Button>
          </div>
        </div>
        {!canRandomizeRoster ? (
          <p className="mb-4 rounded-xl border border-[var(--color-secondary)]/20 bg-[var(--color-secondary)]/10 px-3 py-2 text-xs text-[var(--color-muted)]">
            {t('teams.randomizeUnavailable', { ns: 'control' })}
          </p>
        ) : null}
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {teamDrafts.map((team, index) => (
            <div key={team.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
                    {t('teams.teamNumber', { ns: 'control', number: index + 1 })}
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
                    aria-label={t('teams.moveTeamUp', { ns: 'control' })}
                  >
                    <ArrowUp size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onMoveTeam(team.id, 1)}
                    disabled={index === teamDrafts.length - 1}
                    aria-label={t('teams.moveTeamDown', { ns: 'control' })}
                  >
                    <ArrowDown size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveTeam(team.id)}
                    aria-label={t('teams.removeTeam', { ns: 'control' })}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              <div className="space-y-3 px-4 pb-4">
                {team.members.map((member, memberIndex) => (
                  <div key={member.id} className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <ParticipantAvatar
                        name={member.name || t('teams.participantFallback', { ns: 'control' })}
                        src={participantIdentities[member.id]?.avatarUrl}
                        size={34}
                      />
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
                        <option value="host">{t('teams.roles.host', { ns: 'control' })}</option>
                        <option value="assistant">{t('teams.roles.assistant', { ns: 'control' })}</option>
                        <option value="player">{t('teams.roles.player', { ns: 'control' })}</option>
                      </select>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onMoveParticipant(team.id, member.id, -1)}
                          disabled={memberIndex === 0}
                          aria-label={t('teams.moveParticipantUp', { ns: 'control' })}
                        >
                          <ArrowUp size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onMoveParticipant(team.id, member.id, 1)}
                          disabled={memberIndex === team.members.length - 1}
                          aria-label={t('teams.moveParticipantDown', { ns: 'control' })}
                        >
                          <ArrowDown size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveParticipant(team.id, member.id)}
                          aria-label={t('teams.removeParticipant', { ns: 'control' })}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    {canUseConnectedFeatures && (
                      <div className="space-y-1">
                        <input
                          type="email"
                          list="invite-contacts"
                          value={member.email ?? ''}
                          onChange={(event) => {
                            const raw = event.target.value
                            onUpdateParticipant(team.id, member.id, { email: raw })
                          }}
                          placeholder={t('teams.emailPlaceholder', { ns: 'control' })}
                          aria-label={t('teams.emailLabel', { ns: 'control', name: member.name })}
                          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)]"
                        />
                        {/* Helper reativo: só mostra quando há algum texto digitado */}
                        {(member.email ?? '') !== '' && (
                          <p className="text-xs text-[var(--color-muted)]">
                            {isValidEmail(member.email ?? '')
                              ? t('teams.validEmail', { ns: 'control' })
                              : t('teams.invalidEmail', { ns: 'control' })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => onAddParticipant(team.id)}>
                  <UserPlus size={14} /> {t('teams.addParticipant', { ns: 'control' })}
                </Button>
              </div>
            </div>
          ))}
          {/* Datalist privacy-safe: apenas e-mails que o próprio host já convidou,
              via RPC SECURITY INVOKER + RLS owner-only. Demo não monta este bloco. */}
          {canUseConnectedFeatures && (
            <datalist id="invite-contacts">
              {inviteContacts.map((c) => (
                <option key={c.email} value={c.email} label={c.lastName} />
              ))}
            </datalist>
          )}

          {!teamDrafts.length ? (
            <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-4 py-10 text-center text-sm text-[var(--color-muted)]">
              {t('teams.empty', { ns: 'control' })}
            </p>
          ) : null}

          {canUseConnectedFeatures && canInviteLivePlayers ? (
            <div className="rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                    <QrCode size={16} className="text-[var(--color-primary)]" />
                    {t('teams.inviteTitle', { ns: 'control' })}
                  </h4>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {hasUnsavedLiveRosterChanges
                      ? t('teams.inviteUnsaved', { ns: 'control' })
                      : t('teams.inviteReady', { ns: 'control' })}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  disabled={hasUnsavedLiveRosterChanges}
                  onClick={() => setLiveInviteOpen(true)}
                >
                  {t('teams.openInvite', { ns: 'control' })}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-[var(--color-text)]">{t('teams.previewTitle', { ns: 'control' })}</h4>
                <p className="text-sm text-[var(--color-muted)]">
                  {t('teams.previewDescription', { ns: 'control' })}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {t('teams.previewRound', { ns: 'control' })}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setPreviewOpen(true)} disabled={!canPreview}>
                  {t('teams.openPreview', { ns: 'control' })}
                </Button>
              </div>
            </div>

            {!canPreview ? (
              <div className="mt-3 rounded-xl border border-[var(--color-secondary)]/20 bg-[var(--color-secondary)]/10 px-3 py-2 text-xs text-[var(--color-muted)]">
                {t('teams.previewUnavailable', { ns: 'control' })}
              </div>
            ) : null}
          </div>
        </div>
        {/* Rodapé não-bloqueante: aparece com recursos conectados e ≥1 e-mail válido.
            Informa ao host quantos jogadores serão vinculados, sem bloquear salvar. */}
        {canUseConnectedFeatures && validEmailCount > 0 && (
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            {t('teams.emailLinkSummary', { ns: 'control', linked: validEmailCount, total: totalParticipantCount })}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" disabled={!canSave} onClick={onSave}>
            {t('teams.save', { ns: 'control' })}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('actions.close', { ns: 'common' })}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={previewOpen}
        title={t('teams.fullPreviewTitle', { ns: 'control' })}
        description={t('teams.fullPreviewDescription', { ns: 'control' })}
        onClose={() => setPreviewOpen(false)}
        size="xl"
      >
        <TurnOrderPreview
          teams={previewTeams}
          participants={previewParticipants}
          turnSequence={previewTurnSequence}
          sequenceSource="draft"
          title={t('teams.plannedOrderTitle', { ns: 'control' })}
          description={t('teams.plannedOrderDescription', { ns: 'control' })}
        />
      </Modal>

      <TeamRandomizerModal
        isOpen={randomizerOpen}
        onClose={() => setRandomizerOpen(false)}
        onApply={onReplaceDrafts}
        teamDrafts={teamDrafts}
        connectedFeaturesEnabled={canUseConnectedFeatures}
        gameMode={gameMode}
        inviteContacts={inviteContacts}
        previewQuestionCount={previewQuestionCount}
      />

      {canUseConnectedFeatures && canInviteLivePlayers ? (
        <LiveSessionInviteModal
          isOpen={liveInviteOpen}
          onClose={() => setLiveInviteOpen(false)}
          sessionClientId={sessionClientId}
          onPrepareSync={onPrepareLiveInvite}
        />
      ) : null}
    </>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Loader2, RefreshCw, Unlink, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal'
import { Modal } from '@/components/ui/Modal'
import { LocalQrCode } from '@/shared/components/LocalQrCode'
import { ParticipantAvatar } from '@/shared/components/ParticipantAvatar'
import {
  getLiveSessionInvite,
  listLiveSessionParticipants,
  revokeLiveSessionClaim,
  type LiveSessionInvite,
  type LiveSessionParticipant,
} from '@/modules/auth/services/live-session-claim.service'
import {
  listLiveParticipantIdentities,
  type ParticipantIdentity,
} from '@/modules/auth/services/profile-avatar.service'
import { useTranslation } from '@/shared/i18n'

type LiveSessionInviteModalProps = {
  isOpen: boolean
  onClose: () => void
  sessionClientId: string
  onPrepareSync: () => Promise<boolean>
}

export function LiveSessionInviteModal({
  isOpen,
  onClose,
  sessionClientId,
  onPrepareSync,
}: LiveSessionInviteModalProps) {
  const { t } = useTranslation(['control', 'common'])
  const [invite, setInvite] = useState<LiveSessionInvite | null>(null)
  const [participants, setParticipants] = useState<LiveSessionParticipant[]>([])
  const [identities, setIdentities] = useState<Record<string, ParticipantIdentity>>({})
  const [preparing, setPreparing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pendingRevoke, setPendingRevoke] = useState<LiveSessionParticipant | null>(null)

  const refreshParticipants = useCallback(async (token: string, showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    const [result, identityRows] = await Promise.all([
      listLiveSessionParticipants(token),
      listLiveParticipantIdentities(sessionClientId),
    ])
    if (!result.error) setParticipants(result.participants)
    setIdentities(Object.fromEntries(identityRows.map((identity) => [identity.participantClientId, identity])))
    setError(result.error)
    if (showSpinner) setRefreshing(false)
  }, [sessionClientId])

  const prepare = useCallback(async () => {
    setPreparing(true)
    setError(null)
    const synced = await onPrepareSync()
    if (!synced) {
      setPreparing(false)
      setError(t('liveInvite.syncError', { ns: 'control' }))
      return
    }

    const result = await getLiveSessionInvite(sessionClientId)
    setPreparing(false)
    setInvite(result.invite)
    setError(result.error)
    if (result.invite) {
      await refreshParticipants(result.invite.joinToken, true)
    }
  }, [onPrepareSync, refreshParticipants, sessionClientId, t])

  useEffect(() => {
    if (!isOpen) return
    setInvite(null)
    setParticipants([])
    setIdentities({})
    setCopied(false)
    void prepare()
  }, [isOpen, prepare])

  useEffect(() => {
    if (!isOpen || !invite) return
    const interval = window.setInterval(() => {
      void refreshParticipants(invite.joinToken)
    }, 5000)
    return () => window.clearInterval(interval)
  }, [invite, isOpen, refreshParticipants])

  async function copyLink() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(t('liveInvite.manualCopy', { ns: 'control' }))
    }
  }

  async function confirmRevoke() {
    const participant = pendingRevoke
    setPendingRevoke(null)
    if (!participant?.claimId || !invite) return
    const result = await revokeLiveSessionClaim(participant.claimId)
    setError(result.error)
    await refreshParticipants(invite.joinToken, true)
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        title={t('liveInvite.title', { ns: 'control' })}
        description={t('liveInvite.description', { ns: 'control' })}
        onClose={onClose}
        size="lg"
      >
        {preparing ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">{t('liveInvite.syncingRoster', { ns: 'control' })}</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {t('liveInvite.syncingDescription', { ns: 'control' })}
              </p>
            </div>
          </div>
        ) : invite ? (
          <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
              <LocalQrCode
                value={invite.url}
                label={t('liveInvite.qrLabel', { ns: 'control' })}
                size={190}
              />
              <p className="text-center text-xs text-[var(--color-muted)]">
                {t('liveInvite.qrDescription', { ns: 'control' })}
              </p>
              <Button variant="secondary" size="sm" onClick={() => void copyLink()}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? t('liveInvite.copied', { ns: 'control' }) : t('liveInvite.copy', { ns: 'control' })}
              </Button>
              <input
                readOnly
                value={invite.url}
                onFocus={(event) => event.currentTarget.select()}
                aria-label={t('liveInvite.linkLabel', { ns: 'control' })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-2 text-[10px] text-[var(--color-muted)]"
              />
            </div>

            <div className="min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">{t('liveInvite.rosterStatus', { ns: 'control' })}</h3>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {t('liveInvite.rosterDescription', { ns: 'control' })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('liveInvite.refreshStatus', { ns: 'control' })}
                  disabled={refreshing}
                  onClick={() => void refreshParticipants(invite.joinToken, true)}
                >
                  <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                </Button>
              </div>

              {error ? (
                <p role="status" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </p>
              ) : null}

              <ul className="max-h-[48vh] space-y-2 overflow-y-auto" role="list">
                {participants.map((participant) => (
                  <li
                    key={participant.participantClientId}
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5"
                  >
                    <ParticipantAvatar
                      name={participant.displayName}
                      src={identities[participant.participantClientId]?.avatarUrl}
                      size={34}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-text)]">
                        {participant.displayName}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {participant.teamName ?? t('liveInvite.noTeam', { ns: 'control' })}
                      </p>
                    </div>
                    {participant.claimed ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)]">
                          <UserCheck size={13} /> {t('liveInvite.claimed', { ns: 'control' })}
                        </span>
                        {participant.claimId ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('liveInvite.unlinkPerson', { ns: 'control', name: participant.displayName })}
                            onClick={() => setPendingRevoke(participant)}
                          >
                            <Unlink size={14} />
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="shrink-0 text-xs text-[var(--color-muted)]">{t('liveInvite.waiting', { ns: 'control' })}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-5 text-center">
            <p className="text-sm text-[var(--color-muted)]">
              {error ?? t('liveInvite.prepareError', { ns: 'control' })}
            </p>
            <Button variant="secondary" onClick={() => void prepare()}>
              <RefreshCw size={15} /> {t('actions.retry', { ns: 'common' })}
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmActionModal
        isOpen={pendingRevoke !== null}
        onClose={() => setPendingRevoke(null)}
        onConfirm={() => void confirmRevoke()}
        title={t('liveInvite.unlinkTitle', { ns: 'control' })}
        description={t('liveInvite.unlinkDescription', { ns: 'control', name: pendingRevoke?.displayName ?? t('liveInvite.participantFallback', { ns: 'control' }) })}
        confirmLabel={t('liveInvite.unlink', { ns: 'control' })}
        variant="warning"
      />
    </>
  )
}

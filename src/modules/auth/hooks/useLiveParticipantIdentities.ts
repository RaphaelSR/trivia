import { useCallback, useEffect, useState } from 'react'
import {
  listLiveParticipantIdentities,
  type ParticipantIdentity,
} from '../services/profile-avatar.service'

export function useLiveParticipantIdentities(
  sessionClientId: string,
  enabled: boolean,
) {
  const [identities, setIdentities] = useState<Record<string, ParticipantIdentity>>({})

  const refresh = useCallback(async () => {
    if (!enabled || !sessionClientId) {
      setIdentities({})
      return
    }
    const rows = await listLiveParticipantIdentities(sessionClientId)
    setIdentities(Object.fromEntries(rows.map((identity) => [identity.participantClientId, identity])))
  }, [enabled, sessionClientId])

  useEffect(() => {
    if (!enabled) {
      setIdentities({})
      return
    }
    void refresh()
    const interval = window.setInterval(() => void refresh(), 15000)
    const handleFocus = () => void refresh()
    window.addEventListener('focus', handleFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [enabled, refresh])

  return { identities, refresh }
}

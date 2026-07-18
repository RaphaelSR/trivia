import { useCallback, useEffect, useState } from 'react'
import {
  getMyProfileIdentity,
  type ProfileIdentity,
} from '../services/profile-avatar.service'

/** Identidade visual da própria conta; nunca entra no snapshot da partida. */
export function useMyProfileIdentity(userId: string | null, enabled = true) {
  const [identity, setIdentity] = useState<ProfileIdentity | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setIdentity(null)
      setLoading(false)
      return null
    }

    setLoading(true)
    const profile = await getMyProfileIdentity()
    setIdentity(profile)
    setLoading(false)
    return profile
  }, [enabled, userId])

  useEffect(() => {
    let current = true
    if (!enabled || !userId) {
      setIdentity(null)
      setLoading(false)
      return () => {
        current = false
      }
    }

    setLoading(true)
    void getMyProfileIdentity().then((profile) => {
      if (!current) return
      setIdentity(profile)
      setLoading(false)
    })

    return () => {
      current = false
    }
  }, [enabled, userId])

  return { identity, loading, refresh, setIdentity }
}

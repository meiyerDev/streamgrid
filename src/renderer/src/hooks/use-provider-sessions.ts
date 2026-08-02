import { useCallback, useEffect, useState } from 'react'
import type { ProviderId, ProviderSession } from '../../../shared/providers'

export interface UseProviderSessions {
  sessions: Partial<Record<ProviderId, ProviderSession>>
  loading: boolean
  activeLogin: ProviderId | null
  login: (id: ProviderId) => void
  closeLogin: (id: ProviderId) => Promise<void>
  logout: (id: ProviderId) => Promise<void>
  refresh: () => Promise<void>
}

async function loadSessions(): Promise<Partial<Record<ProviderId, ProviderSession>>> {
  const list = await window.api.sessions.list()
  const next: Partial<Record<ProviderId, ProviderSession>> = {}
  for (const session of list) next[session.providerId] = session
  return next
}

export function useProviderSessions(): UseProviderSessions {
  const [sessions, setSessions] = useState<Partial<Record<ProviderId, ProviderSession>>>({})
  const [loading, setLoading] = useState(true)
  const [activeLogin, setActiveLogin] = useState<ProviderId | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setSessions(await loadSessions())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    loadSessions().then((next) => {
      if (!mounted) return
      setSessions(next)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  const login = useCallback((id: ProviderId) => setActiveLogin(id), [])

  const closeLogin = useCallback(async (id: ProviderId) => {
    setActiveLogin(null)
    const session = await window.api.sessions.detect(id)
    setSessions((prev) => ({ ...prev, [id]: session }))
  }, [])

  const logout = useCallback(
    async (id: ProviderId) => {
      await window.api.sessions.logout(id)
      await refresh()
    },
    [refresh]
  )

  return { sessions, loading, activeLogin, login, closeLogin, logout, refresh }
}

import { useCallback, useEffect, useState } from 'react'
import type { FollowedChannel } from '../../../shared/subscriptions'

export interface UseSubscribedChannels {
  channels: FollowedChannel[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

async function fetchFollowedChannels(): Promise<{
  channels: FollowedChannel[]
  error: string | null
}> {
  const result = await window.api.subscriptions.getFollowed()
  if (result.ok && result.channels) {
    return { channels: result.channels, error: null }
  }
  return { channels: [], error: result.error ?? 'Error desconocido' }
}

export function useSubscribedChannels(): UseSubscribedChannels {
  const [channels, setChannels] = useState<FollowedChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { channels: fetchedChannels, error: fetchedError } = await fetchFollowedChannels()
    setChannels(fetchedChannels)
    setError(fetchedError)
    setLoading(false)
  }, [])

  useEffect(() => {
    let mounted = true
    fetchFollowedChannels().then(({ channels: fetchedChannels, error: fetchedError }) => {
      if (!mounted) return
      setChannels(fetchedChannels)
      setError(fetchedError)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  return { channels, loading, error, refresh }
}

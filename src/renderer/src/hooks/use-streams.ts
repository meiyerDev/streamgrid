import { useCallback, useEffect, useState } from 'react'
import type { ProviderId } from '../../../shared/providers'
import type { StreamConfig, StreamLayout } from '../../../shared/streams'

export interface UseStreams {
  streams: StreamConfig[]
  loading: boolean
  addStream: (providerId: ProviderId, channel: string) => Promise<void>
  removeStream: (id: string) => Promise<void>
  updateLayout: (id: string, layout: StreamLayout) => Promise<void>
}

export function useStreams(): UseStreams {
  const [streams, setStreams] = useState<StreamConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    window.api.streams.list().then((next) => {
      if (!mounted) return
      setStreams(next)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  const addStream = useCallback(async (providerId: ProviderId, channel: string) => {
    setStreams(await window.api.streams.add({ providerId, channel }))
  }, [])

  const removeStream = useCallback(async (id: string) => {
    setStreams(await window.api.streams.remove(id))
  }, [])

  const updateLayout = useCallback(async (id: string, layout: StreamLayout) => {
    setStreams(await window.api.streams.updateLayout(id, layout))
  }, [])

  return { streams, loading, addStream, removeStream, updateLayout }
}

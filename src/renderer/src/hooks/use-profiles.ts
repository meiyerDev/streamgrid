import { useCallback, useEffect, useState } from 'react'
import type { ProviderId } from '../../../shared/providers'
import type { ProfilesStore, StreamConfig, StreamLayout } from '../../../shared/streams'

export interface UseProfiles {
  profiles: ProfilesStore['profiles']
  activeProfileId: string
  activeStreams: StreamConfig[]
  loading: boolean
  createProfile: (name: string) => Promise<void>
  renameProfile: (id: string, name: string) => Promise<void>
  removeProfile: (id: string) => Promise<void>
  setActive: (id: string) => Promise<void>
  addStream: (providerId: ProviderId, channel: string) => Promise<void>
  removeStream: (id: string) => Promise<void>
  updateLayout: (id: string, layout: StreamLayout) => Promise<void>
}

export function useProfiles(): UseProfiles {
  const [store, setStore] = useState<ProfilesStore>({ activeProfileId: '', profiles: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    window.api.profiles.list().then((next) => {
      if (!mounted) return
      setStore(next)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  const activeProfileId = store.activeProfileId
  const active = store.profiles.find((p) => p.id === activeProfileId) ?? store.profiles[0]
  const activeStreams = active ? active.streams : []

  const createProfile = useCallback(async (name: string) => {
    setStore(await window.api.profiles.create(name))
  }, [])

  const renameProfile = useCallback(async (id: string, name: string) => {
    setStore(await window.api.profiles.rename(id, name))
  }, [])

  const removeProfile = useCallback(async (id: string) => {
    setStore(await window.api.profiles.remove(id))
  }, [])

  const setActive = useCallback(async (id: string) => {
    setStore(await window.api.profiles.setActive(id))
  }, [])

  const setStreams = useCallback((streams: StreamConfig[]) => {
    setStore((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => (p.id === prev.activeProfileId ? { ...p, streams } : p))
    }))
  }, [])

  const addStream = useCallback(
    async (providerId: ProviderId, channel: string) => {
      setStreams(await window.api.streams.add({ providerId, channel }))
    },
    [setStreams]
  )

  const removeStream = useCallback(
    async (id: string) => {
      setStreams(await window.api.streams.remove(id))
    },
    [setStreams]
  )

  const updateLayout = useCallback(
    async (id: string, layout: StreamLayout) => {
      setStreams(await window.api.streams.updateLayout(id, layout))
    },
    [setStreams]
  )

  return {
    profiles: store.profiles,
    activeProfileId,
    activeStreams,
    loading,
    createProfile,
    renameProfile,
    removeProfile,
    setActive,
    addStream,
    removeStream,
    updateLayout
  }
}

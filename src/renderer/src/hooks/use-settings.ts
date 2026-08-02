import { useCallback, useEffect, useState } from 'react'
import type { AppSettings, DisplayInfo } from '../../../shared/settings'
import { defaultSettings } from '../../../shared/settings'

export function useSettings(): {
  settings: AppSettings
  displays: DisplayInfo[]
  loading: boolean
  update: (patch: Partial<AppSettings>) => Promise<void>
} {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [stored, monitorList] = await Promise.all([
          window.api.settings.get(),
          window.api.settings.listDisplays()
        ])
        setSettings(stored)
        setDisplays(monitorList)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await window.api.settings.set(patch)
    setSettings(next)
  }, [])

  return { settings, displays, loading, update }
}

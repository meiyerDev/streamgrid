import { useCallback, useEffect, useState } from 'react'
import type { UpdaterState } from '../../../shared/updater'

const IDLE_STATE: UpdaterState = { status: 'idle', currentVersion: '', disabled: false }

export function useUpdater(): {
  state: UpdaterState
  check: () => void
  install: () => void
} {
  const [state, setState] = useState<UpdaterState>(IDLE_STATE)

  useEffect(() => {
    let disposed = false
    void window.api.updater.getState().then((initial) => {
      if (!disposed) setState(initial)
    })
    const unsubscribe = window.api.updater.onEvent((event) => {
      setState((prev) => {
        switch (event.type) {
          case 'checking':
            return { ...prev, status: 'checking', error: undefined }
          case 'available':
            return { ...prev, status: 'available', newVersion: event.version, error: undefined }
          case 'not-available':
            return {
              ...prev,
              status: 'uptodate',
              newVersion: undefined,
              percent: undefined,
              error: undefined
            }
          case 'progress':
            return {
              ...prev,
              status: 'downloading',
              percent: event.percent,
              transferred: event.transferred,
              total: event.total,
              bytesPerSecond: event.bytesPerSecond
            }
          case 'downloaded':
            return { ...prev, status: 'downloaded', newVersion: event.version, percent: 100 }
          case 'error':
            return { ...prev, status: 'error', error: event.message }
        }
      })
    })
    return () => {
      disposed = true
      unsubscribe()
    }
  }, [])

  const check = useCallback(() => {
    void window.api.updater.check().then(setState)
  }, [])

  const install = useCallback(() => {
    void window.api.updater.install()
  }, [])

  return { state, check, install }
}

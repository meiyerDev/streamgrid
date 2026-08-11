import { useEffect, useRef } from 'react'
import { Toast } from '@base-ui/react/toast'

import { useUpdater } from '../hooks/use-updater'
import { useToast } from '../hooks/use-toast'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DownloadProgress({
  percent,
  version,
  transferred,
  total
}: {
  percent: number
  version?: string
  transferred?: number
  total?: number
}): React.JSX.Element {
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <div className="flex flex-col gap-2">
      <Toast.Title className="text-sm font-bold text-white">
        {version ? `Descargando v${version}…` : 'Descargando actualización…'}
      </Toast.Title>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-blurple to-magenta transition-[width] duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <Toast.Description className="text-xs text-white/60">
        {Math.round(clamped)}%
        {transferred != null && total != null
          ? ` · ${formatBytes(transferred)} / ${formatBytes(total)}`
          : ''}
      </Toast.Description>
    </div>
  )
}

export function UpdaterListener(): React.JSX.Element | null {
  const { state, install } = useUpdater()
  const { toast, update, dismiss } = useToast()
  const toastId = useRef<string | null>(null)

  useEffect(() => {
    switch (state.status) {
      case 'available':
      case 'downloading': {
        const id = toastId.current ?? toast({ type: 'progress', timeout: 0 })
        toastId.current = id
        update(id, {
          type: 'progress',
          timeout: 0,
          title: state.newVersion ? `Actualización v${state.newVersion}` : 'Actualización',
          render: (
            <DownloadProgress
              percent={state.percent ?? 0}
              version={state.newVersion}
              transferred={state.transferred}
              total={state.total}
            />
          )
        })
        break
      }
      case 'downloaded': {
        const id = toastId.current ?? toast({})
        toastId.current = id
        update(id, {
          timeout: 0,
          title: 'Actualización lista',
          description: `StreamGrid v${state.newVersion} se descargó. Reinicia para aplicarla.`,
          action: { label: 'Reiniciar e instalar', onClick: install }
        })
        break
      }
      case 'uptodate':
      case 'error': {
        if (toastId.current) {
          dismiss(toastId.current)
          toastId.current = null
        }
        break
      }
      default:
        break
    }
  }, [state, toast, update, dismiss, install])

  return null
}

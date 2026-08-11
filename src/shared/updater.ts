export type UpdaterStatus =
  'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'uptodate' | 'error'

export interface UpdaterState {
  status: UpdaterStatus
  currentVersion: string
  newVersion?: string
  percent?: number
  transferred?: number
  total?: number
  bytesPerSecond?: number
  error?: string
  disabled?: boolean
}

export type UpdaterEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | {
      type: 'progress'
      percent: number
      transferred: number
      total: number
      bytesPerSecond: number
    }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

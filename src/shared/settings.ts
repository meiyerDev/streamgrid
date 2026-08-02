export type DisplayMode = 'windowed' | 'fullscreen'

export interface AppSettings {
  displayMode: DisplayMode
  monitorId: string | null
  masterVolume: number
}

export interface DisplayInfo {
  id: string
  label: string
  primary: boolean
  bounds: { x: number; y: number; width: number; height: number }
}

export const DEFAULT_VOLUME = 100
export const MIN_VOLUME = 0
export const MAX_VOLUME = 100

export const defaultSettings: AppSettings = {
  displayMode: 'windowed',
  monitorId: null,
  masterVolume: DEFAULT_VOLUME
}

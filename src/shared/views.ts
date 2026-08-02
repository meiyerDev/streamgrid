import type { StreamConfig } from './streams'

export interface ViewBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface ViewsSyncPayload {
  streams: StreamConfig[]
  bounds: Record<string, ViewBounds>
  edit: boolean
}

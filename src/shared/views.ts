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

export interface ChatMessage {
  channel: string
  user: string
  color?: string
  message: string
}

export type ChatStatus =
  | { kind: 'connected'; authorized: boolean }
  | { kind: 'disconnected' }
  | { kind: 'error'; message: string }

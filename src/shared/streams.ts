import type { ProviderId } from './providers'

export interface StreamLayout {
  x: number
  y: number
  w: number
  h: number
  customized?: boolean
}

export interface StreamConfig {
  id: string
  providerId: ProviderId
  channel: string
  layout?: StreamLayout
}

export interface ChatConfig {
  id: string
  layout?: StreamLayout
}

export interface StreamProfile {
  id: string
  name: string
  streams: StreamConfig[]
  chats: ChatConfig[]
}

export interface ProfilesStore {
  activeProfileId: string
  profiles: StreamProfile[]
}

export const GRID_COLS = 12
export const MAX_GRID_COLS = 48
export const MIN_GRID_COL_WIDTH = 160
export const GRID_ROW_HEIGHT = 30
export const GRID_MARGIN: [number, number] = [8, 8]

export const DEFAULT_STREAM_W = 6
export const DEFAULT_STREAM_H = 10

export const MIN_STREAM_W = 3
export const MIN_STREAM_H = 3

export function defaultStreamLayout(streams: StreamConfig[]): StreamLayout {
  const maxBottom = streams.reduce(
    (max, stream) => Math.max(max, (stream.layout?.y ?? 0) + (stream.layout?.h ?? 0)),
    0
  )
  return { x: 0, y: maxBottom, w: DEFAULT_STREAM_W, h: DEFAULT_STREAM_H }
}

export function defaultChatLayout(): StreamLayout {
  return { x: 6, y: 0, w: DEFAULT_STREAM_W, h: DEFAULT_STREAM_H }
}

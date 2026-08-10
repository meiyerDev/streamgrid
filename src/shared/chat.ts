import type { ProviderId } from './providers'

export interface ChatChannel {
  providerId: ProviderId
  channel: string
}

export interface ChatMessage {
  channel: string
  username: string
  message: string
  timestamp: number
}

export type ChatStatus = 'idle' | 'connecting' | 'connected' | 'disconnected'

export interface ChatStatusPayload {
  providerId: ProviderId
  status: ChatStatus
}

export const CHAT_MESSAGE_CAP = 500

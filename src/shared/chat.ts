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

export const CHAT_MSG_MAX_LENGTH = 500

export interface ChatSendInput {
  channel: string
  message: string
}

export interface ChatSendResult {
  ok: boolean
  error?: string
}

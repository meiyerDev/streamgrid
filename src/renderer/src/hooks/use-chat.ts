import { createContext, useContext } from 'react'
import type { ChatSession } from '../../../shared/providers'
import type { ChatMessage } from '../../../shared/views'

export interface FeedEntry extends ChatMessage {
  time: string
}

export interface UseChat {
  feed: FeedEntry[]
  connected: boolean
  authorized: boolean
  error: string | null
  channels: string[]
  session: ChatSession
  send: (channel: string, message: string) => Promise<void>
  setChannels: (channels: string[]) => Promise<void>
  refresh: () => Promise<void>
}

export const ChatContext = createContext<UseChat | null>(null)

export const MAX_FEED = 500

export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function useChat(): UseChat {
  const context = useContext(ChatContext)
  if (!context) throw new Error('useChat must be used within a ChatProvider')
  return context
}

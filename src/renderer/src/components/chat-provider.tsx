import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ChatSession } from '../../../shared/providers'
import { ChatContext, formatTime, MAX_FEED, type FeedEntry, type UseChat } from '../hooks/use-chat'

export function ChatProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [connected, setConnected] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<ChatSession>({ loggedIn: false })
  const [channels, setChannelsState] = useState<string[]>([])
  const mountedRef = useRef(true)
  const channelsRef = useRef<string[]>([])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      void window.api.chat.disconnect()
    }
  }, [])

  useEffect(() => {
    void window.api.sessions.detectChat().then((next) => {
      if (!mountedRef.current) return
      setSession(next)
      setAuthorized(next.loggedIn && Boolean(next.token))
    })
    void window.api.chat.connect()
    const unsubMessage = window.api.chat.onMessage((message) => {
      setFeed((prev) => [
        ...prev.slice(-(MAX_FEED - 1)),
        { ...message, time: formatTime(new Date()) }
      ])
    })
    const unsubStatus = window.api.chat.onStatus((status) => {
      if (!mountedRef.current) return
      switch (status.kind) {
        case 'connected':
          setConnected(true)
          setAuthorized(status.authorized)
          setError(null)
          return
        case 'disconnected':
          setConnected(false)
          return
        case 'error':
          setError(status.message)
          return
      }
    })
    return () => {
      unsubMessage()
      unsubStatus()
    }
  }, [])

  const setChannels = useCallback(async (next: string[]) => {
    setChannelsState(next)
    channelsRef.current = next
    await window.api.chat.setChannels(next)
  }, [])

  const send = useCallback(async (channel: string, message: string) => {
    await window.api.chat.send(channel, message)
  }, [])

  const refresh = useCallback(async () => {
    const next = await window.api.sessions.detectChat()
    if (!mountedRef.current) return
    setSession(next)
    setAuthorized(next.loggedIn && Boolean(next.token))
    await window.api.chat.disconnect()
    await window.api.chat.connect()
    await window.api.chat.setChannels(channelsRef.current)
  }, [])

  const value = useMemo<UseChat>(
    () => ({ feed, connected, authorized, error, channels, session, send, setChannels, refresh }),
    [feed, connected, authorized, error, channels, session, send, setChannels, refresh]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

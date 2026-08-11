import { forwardRef, useEffect, useMemo, useRef, useState, type HTMLAttributes } from 'react'
import { ChevronDown, Filter, GripVertical, MessagesSquare, Send, X } from 'lucide-react'
import {
  CHAT_MESSAGE_CAP,
  CHAT_MSG_MAX_LENGTH,
  type ChatMessage,
  type ChatStatus
} from '../../../shared/chat'
import type { TwitchChatStatus } from '../../../shared/chat-auth'
import type { StreamConfig } from '../../../shared/streams'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown'

interface ChatTileProps extends HTMLAttributes<HTMLDivElement> {
  edit: boolean
  profileId: string
  streams: StreamConfig[]
  onHide: () => void
}

const STATUS_LABELS: Record<ChatStatus, string> = {
  idle: 'Inactivo',
  connecting: 'Conectando…',
  connected: 'Conectado',
  disconnected: 'Reconectando…'
}

const STATUS_DOT: Record<ChatStatus, string> = {
  idle: 'bg-white/30',
  connecting: 'bg-yellow-400',
  connected: 'bg-green',
  disconnected: 'bg-red-400'
}

const USER_COLORS = [
  'var(--color-blurple)',
  'var(--color-green)',
  'var(--color-magenta)',
  'var(--color-link)'
]

function formatHour(timestamp: number): string {
  const date = new Date(timestamp)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function userColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) >>> 0
  return USER_COLORS[hash % USER_COLORS.length]
}

export const ChatTile = forwardRef<HTMLDivElement, ChatTileProps>(function ChatTile(
  { edit, profileId, streams, onHide, className, style, children, ...rest },
  ref
): React.JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [authStatus, setAuthStatus] = useState<TwitchChatStatus>({ authenticated: false })
  const [channel, setChannel] = useState(streams[0]?.channel ?? '')
  const [filterChannels, setFilterChannels] = useState<Set<string>>(
    () => new Set(streams.map((stream) => stream.channel))
  )
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const streamsRef = useRef(streams)
  streamsRef.current = streams

  useEffect(() => {
    const unsubscribe = window.api.chat.onMessage((message) => {
      setMessages((prev) => [...prev, message].slice(-CHAT_MESSAGE_CAP))
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = window.api.chat.onStatus(({ status: next }) => setStatus(next))
    return unsubscribe
  }, [])

  useEffect(() => {
    setMessages([])
    setStatus('idle')
    setDraft('')
    setError(undefined)
    setFilterChannels(new Set(streamsRef.current.map((stream) => stream.channel)))
  }, [profileId])

  useEffect(() => {
    let mounted = true
    window.api.chatAuth.getStatus().then((next) => {
      if (!mounted) return
      setAuthStatus(next)
    })
    return () => {
      mounted = false
    }
  }, [profileId])

  useEffect(() => {
    if (!streams.some((stream) => stream.channel === channel)) {
      setChannel(streams[0]?.channel ?? '')
    }
  }, [streams, channel])

  useEffect(() => {
    const channels = new Set(streams.map((stream) => stream.channel))
    setFilterChannels((prev) => {
      if (channels.size === 0) return new Set()
      const next = new Set([...prev].filter((c) => channels.has(c)))
      for (const c of channels) next.add(c)
      return next
    })
  }, [streams])

  const allSelected =
    streams.length > 0 && streams.every((stream) => filterChannels.has(stream.channel))
  const filterKey = allSelected ? 'all' : [...filterChannels].sort().join(',')

  const visibleMessages = useMemo(
    () =>
      allSelected ? messages : messages.filter((message) => filterChannels.has(message.channel)),
    [messages, allSelected, filterChannels]
  )

  useEffect(() => {
    const el = scrollerRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [visibleMessages, status, filterKey])

  function handleScroll(): void {
    const el = scrollerRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    stickToBottom.current = nearBottom
    setShowScrollDown(!nearBottom)
  }

  function scrollToBottom(): void {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    stickToBottom.current = true
    setShowScrollDown(false)
  }

  const channelItems = useMemo(
    () => Object.fromEntries(streams.map((stream) => [stream.channel, stream.channel])),
    [streams]
  )

  const trimmed = draft.trim()
  const canSend = trimmed.length > 0 && trimmed.length <= CHAT_MSG_MAX_LENGTH && !sending

  async function handleSend(event?: React.FormEvent): Promise<void> {
    event?.preventDefault()
    if (!canSend) return
    setSending(true)
    setError(undefined)
    try {
      const result = await window.api.chat.sendMessage({ channel, message: trimmed })
      if (result.ok) {
        setDraft('')
      } else {
        setError(result.error ?? 'No se pudo enviar el mensaje')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div ref={ref} className={className} style={style} data-chat-id="" {...rest}>
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg bg-onyx">
        {edit ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface/95 backdrop-blur-sm">
            <span className="flex items-center gap-3">
              <span
                className="stream-tile-drag-handle flex size-9 cursor-grab items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/20 active:cursor-grabbing"
                aria-hidden="true"
              >
                <GripVertical size={20} />
              </span>
              <MessagesSquare className="size-8 text-white/80" aria-hidden="true" />
            </span>
            <span className="text-xl font-extrabold uppercase tracking-tight text-white">Chat</span>
            <button
              onClick={onHide}
              aria-label="Ocultar el chat"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/20 hover:text-white"
            >
              <X size={16} aria-hidden="true" />
              Ocultar
            </button>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2">
              <span
                className={`size-2 shrink-0 rounded-full ${STATUS_DOT[status]}`}
                aria-hidden="true"
              />
              <span className="text-xs font-semibold uppercase tracking-tight text-white/80">
                Chat general
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Filtrar canales"
                  title="Filtrar canales"
                  className="ml-auto h-6 shrink-0 rounded-md px-2 text-xs font-medium"
                >
                  <Filter size={12} aria-hidden="true" />
                  {allSelected
                    ? 'Todos'
                    : filterChannels.size === 1
                      ? '1 canal'
                      : `${filterChannels.size} canales`}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-40">
                  <DropdownMenuCheckboxItem
                    checked={allSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilterChannels(new Set(streams.map((stream) => stream.channel)))
                      } else {
                        setFilterChannels(new Set())
                      }
                    }}
                  >
                    Todos
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {streams.map((stream) => (
                    <DropdownMenuCheckboxItem
                      key={stream.channel}
                      checked={filterChannels.has(stream.channel)}
                      onCheckedChange={(checked) => {
                        setFilterChannels((prev) => {
                          const next = new Set(prev)
                          if (checked) {
                            next.add(stream.channel)
                          } else {
                            next.delete(stream.channel)
                          }
                          return next
                        })
                      }}
                    >
                      <span className="truncate">{stream.channel}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-xs text-white/40">{STATUS_LABELS[status]}</span>
            </div>
            <div className="relative min-h-0 flex-1">
              <div ref={scrollerRef} onScroll={handleScroll} className="h-full overflow-y-auto">
                {visibleMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-4 text-center">
                    <span className="text-sm text-white/40">
                      {filterChannels.size === 0
                        ? 'Ningún canal seleccionado'
                        : 'Esperando mensajes de los streams activos…'}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 px-3 py-2">
                    {visibleMessages.map((message, index) => (
                      <p
                        key={`${message.timestamp}-${message.username}-${message.message}-${index}`}
                        className="break-words text-sm leading-snug"
                      >
                        <span className="text-white/60">{`[${message.channel}]`}</span>
                        <span
                          className="font-semibold"
                          style={{ color: userColor(message.username) }}
                        >
                          {message.username}
                        </span>
                        <span className="text-white/40">{` (${formatHour(message.timestamp)}): `}</span>
                        <span className="text-white/90">{message.message}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={scrollToBottom}
                aria-label="Ir a los mensajes recientes"
                title="Ir a los mensajes recientes"
                className={`absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full border border-white/10 bg-blurple text-white shadow-lg transition hover:bg-blurple/90 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.95] ${
                  showScrollDown && visibleMessages.length > 0
                    ? 'translate-y-0 opacity-100'
                    : 'pointer-events-none translate-y-2 opacity-0'
                }`}
              >
                <ChevronDown size={20} aria-hidden="true" />
              </button>
            </div>
            {authStatus.authenticated && streams.length > 0 && (
              <form onSubmit={handleSend} className="shrink-0 border-t border-white/10 p-2">
                <div className="flex items-end gap-2">
                  <Select
                    items={channelItems}
                    value={channel}
                    onValueChange={(value) => {
                      if (value) setChannel(value)
                    }}
                  >
                    <SelectTrigger
                      aria-label="Canal de destino"
                      title="Canal de destino"
                      className="h-9 w-32 shrink-0 gap-1 px-3 text-xs"
                    >
                      <SelectValue placeholder="Canal" className="min-w-0 truncate" />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {streams.map((stream) => (
                        <SelectItem key={stream.channel} value={stream.channel}>
                          <span className="truncate">{stream.channel}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void handleSend()
                      }
                    }}
                    placeholder="Escribe un mensaje…"
                    maxLength={CHAT_MSG_MAX_LENGTH}
                    rows={1}
                    disabled={sending}
                    className="min-h-9 min-w-0 flex-1 resize-none py-2"
                  />
                  <button
                    type="submit"
                    aria-label="Enviar mensaje"
                    title="Enviar mensaje"
                    disabled={!canSend}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blurple text-white transition hover:bg-blurple/90 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={16} aria-hidden="true" />
                  </button>
                </div>
                {error && <p className="mt-1.5 px-1 text-xs text-red-400">{error}</p>}
              </form>
            )}
          </>
        )}
      </div>
      {children}
    </div>
  )
})

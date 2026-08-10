import { forwardRef, useEffect, useRef, useState, type HTMLAttributes } from 'react'
import { GripVertical, MessagesSquare, X } from 'lucide-react'
import { CHAT_MESSAGE_CAP, type ChatMessage, type ChatStatus } from '../../../shared/chat'

interface ChatTileProps extends HTMLAttributes<HTMLDivElement> {
  edit: boolean
  profileId: string
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
  { edit, profileId, onHide, className, style, children, ...rest },
  ref
): React.JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('idle')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

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
  }, [profileId])

  useEffect(() => {
    const el = scrollerRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages, status])

  function handleScroll(): void {
    const el = scrollerRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
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
              <span className="ml-auto text-xs text-white/40">{STATUS_LABELS[status]}</span>
            </div>
            <div
              ref={scrollerRef}
              onScroll={handleScroll}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center px-4 text-center">
                  <span className="text-sm text-white/40">
                    Esperando mensajes de los streams activos…
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-1 px-3 py-2">
                  {messages.map((message, index) => (
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
          </>
        )}
      </div>
      {children}
    </div>
  )
})

import { forwardRef, useEffect, useRef, useState, type HTMLAttributes } from 'react'
import { GripVertical, MessageSquare, Send } from 'lucide-react'
import type { ChatConfig } from '../../../shared/streams'
import { useChat } from '../hooks/use-chat'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

interface ChatTileProps extends HTMLAttributes<HTMLDivElement> {
  chat: ChatConfig
  edit: boolean
  onRemove: () => void
}

export const ChatTile = forwardRef<HTMLDivElement, ChatTileProps>(function ChatTile(
  { chat, edit, onRemove, className, style, children, ...rest },
  ref
): React.JSX.Element {
  const { feed, authorized, error, channels, session, send } = useChat()
  const [target, setTarget] = useState<string>(channels[0] ?? '')
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!target && channels.length > 0) setTarget(channels[0])
  }, [channels, target])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [feed])

  const canSend = authorized && Boolean(target) && text.trim().length > 0

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!canSend) return
    await send(target, text)
    setText('')
  }

  return (
    <div ref={ref} className={className} style={style} data-chat-id={chat.id} {...rest}>
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg bg-onyx">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <MessageSquare size={16} className="shrink-0 text-blurple" aria-hidden="true" />
          <span className="truncate text-sm font-semibold text-white">Chat general</span>
          <span
            className="ml-auto flex items-center gap-1.5 text-xs text-white/60"
            title={
              authorized
                ? `Enviando como ${session.username ?? ''}`
                : 'El chat está en modo solo lectura'
            }
          >
            <span
              className={`size-2 rounded-full ${authorized ? 'bg-green' : 'bg-white/30'}`}
              aria-hidden="true"
            />
            {authorized ? (session.username ?? 'Conectado') : 'Solo lectura'}
          </span>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-3 text-sm">
          {feed.length === 0 ? (
            <p className="text-xs text-white/40">
              {error ?? 'Conectando al chat… Añade streams al mosaico para ver sus mensajes aquí.'}
            </p>
          ) : (
            feed.map((entry, index) => (
              <div key={index} className="leading-snug">
                <span className="font-semibold text-blurple">[{entry.channel}]</span>{' '}
                <span
                  style={entry.color ? { color: entry.color } : undefined}
                  className="font-semibold"
                >
                  {entry.user}
                </span>{' '}
                <span className="text-white/40">({entry.time}):</span>{' '}
                <span className="text-white/90">{entry.message}</span>
              </div>
            ))
          )}
        </div>

        {edit ? (
          <div className="flex items-center justify-center gap-3 border-t border-white/10 px-4 py-3 bg-surface/60 backdrop-blur-sm">
            <span className="stream-tile-drag-handle flex size-9 cursor-grab items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/20 active:cursor-grabbing">
              <GripVertical size={20} aria-hidden="true" />
            </span>
            <span className="flex items-center gap-2">
              <MessageSquare size={16} className="text-white/60" aria-hidden="true" />
              <span className="text-sm font-semibold text-white/80">Chat general</span>
            </span>
            <button
              onClick={onRemove}
              aria-label="Quitar chat"
              className="inline-flex items-center justify-center rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/20 hover:text-white"
            >
              Quitar
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 border-t border-white/10 px-3 py-2.5"
          >
            {!authorized ? (
              <p className="px-1 text-xs text-white/50">
                Autoriza el chat en <span className="font-semibold text-white/80">Cuentas</span>{' '}
                para poder enviar mensajes.
              </p>
            ) : channels.length === 0 ? (
              <p className="px-1 text-xs text-white/50">
                Añade al menos un stream al mosaico para poder chatear.
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <Select
                  items={Object.fromEntries(channels.map((channel) => [channel, channel]))}
                  value={target}
                  onValueChange={(value) => {
                    if (value) setTarget(value)
                  }}
                >
                  <SelectTrigger className="h-9 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel} value={channel}>
                        {channel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={`Mensaje en #${target}`}
                  className="h-9 min-w-0 flex-1 rounded-xl bg-surface px-3 text-sm text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2"
                />
                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label="Enviar"
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blurple text-white transition hover:bg-blurple/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </form>
        )}
      </div>
      {children}
    </div>
  )
})

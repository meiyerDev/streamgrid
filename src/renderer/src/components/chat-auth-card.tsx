import { useEffect, useState } from 'react'
import { LogIn, LogOut, MessagesSquare, UserRound } from 'lucide-react'
import type { TwitchChatStatus } from '../../../shared/chat-auth'

export function ChatAuthCard(): React.JSX.Element {
  const [status, setStatus] = useState<TwitchChatStatus>({ authenticated: false })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    let mounted = true
    window.api.chatAuth.getStatus().then((next) => {
      if (!mounted) return
      setStatus(next)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  const handleLogin = async (): Promise<void> => {
    setBusy(true)
    setError(undefined)
    try {
      const next = await window.api.chatAuth.login()
      setStatus(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo conectar el chat')
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async (): Promise<void> => {
    setBusy(true)
    try {
      const next = await window.api.chatAuth.logout()
      setStatus(next)
    } finally {
      setBusy(false)
    }
  }

  const message = status.authenticated ? undefined : (status.error ?? error)

  if (status.authenticated) {
    return (
      <article className="flex w-80 flex-col overflow-hidden rounded-[2rem] bg-surface p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-blurple/20 text-blurple">
            <MessagesSquare size={24} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold uppercase tracking-tight text-white">Twitch</h2>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Chat de escritura
            </p>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2">
          <span className="size-2 rounded-full bg-green" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
            Chat conectado
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-white/10">
            <UserRound size={18} className="text-white/80" aria-hidden="true" />
          </span>
          <span className="text-xl font-extrabold uppercase tracking-tight text-white">
            {status.username}
          </span>
        </div>
        <button
          onClick={handleLogout}
          disabled={busy}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:opacity-60"
        >
          {busy ? (
            <span
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
          ) : (
            <LogOut size={18} aria-hidden="true" />
          )}
          Desconectar
        </button>
      </article>
    )
  }

  return (
    <article className="flex w-80 flex-col overflow-hidden rounded-[2rem] bg-surface p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-xl bg-blurple/20 text-blurple">
          <MessagesSquare size={24} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-extrabold uppercase tracking-tight text-white">Twitch</h2>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Chat de escritura
          </p>
        </div>
      </div>
      <p className="mt-6 text-sm leading-relaxed text-white/60">
        Conecta tu cuenta para habilitar el envío de mensajes en los canales.
      </p>
      <button
        onClick={handleLogin}
        disabled={busy || loading}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-blurple px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:opacity-60"
      >
        {busy ? (
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : (
          <LogIn size={18} aria-hidden="true" />
        )}
        {busy ? 'Conectando…' : 'Conectar Twitch Chat'}
      </button>
      {message ? (
        <p className="mt-4 text-sm text-red-400">{message}</p>
      ) : (
        <p className="mt-4 text-xs text-white/40">
          Abrirá una ventana de Twitch para autorizar la conexión.
        </p>
      )}
    </article>
  )
}

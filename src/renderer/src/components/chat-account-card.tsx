import { LogOut, MessageSquare, UserRound } from 'lucide-react'
import type { ChatSession } from '../../../shared/providers'

interface ChatAccountCardProps {
  session?: ChatSession
  loading: boolean
  onLogin: () => void
  onLogout: () => void
}

export function ChatAccountCard({
  session,
  loading,
  onLogin,
  onLogout
}: ChatAccountCardProps): React.JSX.Element {
  const authorized = Boolean(session?.loggedIn && session?.token)

  return (
    <article className="relative flex w-80 flex-col overflow-hidden rounded-[2rem] bg-gradient-to-br from-blurple to-magenta p-8 text-white transition-transform duration-200 hover:-translate-y-1">
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden="true"
      />
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
          <MessageSquare size={22} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-2xl font-extrabold uppercase tracking-tight">Chat</h2>
          <p className="text-xs opacity-80">Chat unificado de Twitch</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span
          className={`size-2 rounded-full ${authorized ? 'bg-green' : 'bg-white/40'}`}
          aria-hidden="true"
        />
        <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
          {authorized ? 'Autorizado' : 'Solo lectura'}
        </span>
      </div>
      <p className="mt-2 text-sm opacity-90">
        {authorized
          ? 'Puedes leer y enviar mensajes en el chat.'
          : 'Puedes leer el chat. Autoriza tu cuenta de Twitch para poder enviar mensajes.'}
      </p>

      {authorized ? (
        <div className="mt-6 flex items-center gap-3">
          {session?.avatarUrl ? (
            <img
              src={session.avatarUrl}
              alt={session.username ?? 'Usuario'}
              className="size-10 rounded-full object-cover ring-2 ring-white/40"
            />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full bg-white/15">
              <UserRound size={20} aria-hidden="true" />
            </span>
          )}
          <span className="text-lg font-bold">{session?.username ?? 'Conectado'}</span>
        </div>
      ) : null}

      <button
        onClick={authorized ? onLogout : onLogin}
        disabled={loading}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:opacity-60"
      >
        {loading ? (
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : authorized ? (
          <LogOut size={18} aria-hidden="true" />
        ) : (
          <MessageSquare size={18} aria-hidden="true" />
        )}
        {authorized ? 'Cerrar sesión' : 'Autorizar chat'}
      </button>
    </article>
  )
}

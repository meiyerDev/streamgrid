import { LogIn, LogOut, UserRound } from 'lucide-react'
import type { ProviderDef, ProviderSession } from '../../../shared/providers'
import { PROVIDER_ICONS } from '../providers'

interface ProviderCardProps {
  provider: ProviderDef
  session?: ProviderSession
  loading: boolean
  onLogin: () => void
  onLogout: () => void
}

export function ProviderCard({
  provider,
  session,
  loading,
  onLogin,
  onLogout
}: ProviderCardProps): React.JSX.Element {
  const Icon = PROVIDER_ICONS[provider.id]

  if (session?.loggedIn) {
    return (
      <article
        className="relative flex w-80 flex-col overflow-hidden rounded-[2rem] p-8 transition-transform duration-200 hover:-translate-y-1"
        style={{ backgroundColor: provider.colors.accent, color: provider.colors.onAccent }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />
        {session.avatarUrl ? (
          <img
            src={session.avatarUrl}
            alt={session.username ?? provider.name}
            className="size-16 rounded-full object-cover ring-2 ring-white/40"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-white/15">
            <UserRound size={28} aria-hidden="true" />
          </div>
        )}
        <div className="mt-6 flex items-center gap-2">
          <span className="size-2 rounded-full bg-green" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
            Conectado
          </span>
        </div>
        <h2 className="mt-1 text-3xl font-extrabold uppercase tracking-tight">
          {session.username ?? provider.name}
        </h2>
        <button
          onClick={onLogout}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97]"
        >
          <LogOut size={18} aria-hidden="true" />
          Cerrar sesión
        </button>
      </article>
    )
  }

  return (
    <article
      className="relative flex w-80 flex-col overflow-hidden rounded-[2rem] p-8 transition-transform duration-200 hover:-translate-y-1"
      style={{ backgroundColor: provider.colors.accent, color: provider.colors.onAccent }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden="true"
      />
      <Icon className="size-14" />
      <h2 className="mt-6 text-3xl font-extrabold uppercase tracking-tight">{provider.name}</h2>
      <p className="mt-1 text-sm opacity-80">{provider.tagline}</p>
      <button
        onClick={onLogin}
        disabled={loading}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:opacity-60"
        style={{ backgroundColor: provider.colors.cta, color: provider.colors.onCta }}
      >
        {loading ? (
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : (
          <LogIn size={18} aria-hidden="true" />
        )}
        Iniciar sesión
      </button>
    </article>
  )
}

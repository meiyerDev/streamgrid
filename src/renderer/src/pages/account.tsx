import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { CHAT_PROVIDER, PROVIDERS, getProvider, type ChatSession } from '../../../shared/providers'
import { ProviderCard } from '../components/provider-card'
import { LoginModal } from '../components/login-modal'
import { ChatAccountCard } from '../components/chat-account-card'
import { useProviderSessions } from '../hooks/use-provider-sessions'
import { useChat } from '../hooks/use-chat'
import { useCallback, useEffect, useState } from 'react'

export function AccountPage(): React.JSX.Element {
  const { sessions, loading, activeLogin, login, closeLogin, logout, refresh } =
    useProviderSessions()
  const chatRefresh = useChat().refresh
  const activeProvider = activeLogin ? getProvider(activeLogin) : undefined
  const [chatSession, setChatSession] = useState<ChatSession | null>(null)
  const [chatLoading, setChatLoading] = useState(true)
  const [chatLoginOpen, setChatLoginOpen] = useState(false)

  const refreshChat = useCallback(async () => {
    setChatLoading(true)
    try {
      setChatSession(await window.api.sessions.detectChat())
    } finally {
      setChatLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    window.api.sessions.detectChat().then((next) => {
      if (!mounted) return
      setChatSession(next)
      setChatLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <main className="flex flex-col items-center justify-center gap-10">
      <Link
        to="/"
        aria-label="Back to Streams"
        title="Back to Streams"
        className="fixed left-4 top-4 inline-flex items-center gap-2 rounded-lg bg-surface/40 px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-surface hover:text-white"
      >
        <ArrowLeft size={20} aria-hidden="true" />
        Streams
      </Link>
      <h1 className="text-4xl font-extrabold uppercase tracking-tight text-white">Cuentas</h1>
      <div className="flex flex-wrap items-stretch justify-center gap-6">
        {PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            session={sessions[provider.id]}
            loading={loading}
            onLogin={() => login(provider.id)}
            onLogout={() => logout(provider.id)}
          />
        ))}
        <ChatAccountCard
          session={chatSession ?? undefined}
          loading={chatLoading}
          onLogin={() => setChatLoginOpen(true)}
          onLogout={() => {
            void window.api.sessions
              .logoutChat()
              .then(() => refreshChat())
              .then(() => chatRefresh())
          }}
        />
      </div>
      {activeLogin && activeProvider && (
        <LoginModal
          provider={activeProvider}
          onClose={() => closeLogin(activeLogin)}
          onLoggedIn={() => refresh()}
        />
      )}
      {chatLoginOpen && (
        <LoginModal
          provider={CHAT_PROVIDER}
          onClose={() => setChatLoginOpen(false)}
          onLoggedIn={() => {
            setChatLoginOpen(false)
            void refreshChat().then(() => chatRefresh())
          }}
        />
      )}
    </main>
  )
}

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { WebviewElement } from '../webview'

export interface LoginTarget {
  name: string
  partition: string
  homeUrl: string
  loginUrl: string
}

interface LoginModalProps {
  provider: LoginTarget
  onClose: () => void
  onLoggedIn: () => void
}

export function LoginModal({ provider, onClose, onLoggedIn }: LoginModalProps): React.JSX.Element {
  const webviewRef = useRef<WebviewElement | null>(null)

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleNavigate = (event: { url: string }): void => {
      if (event.url.startsWith(provider.homeUrl)) onLoggedIn()
    }

    webview.addEventListener('did-navigate', handleNavigate)
    webview.addEventListener('did-navigate-in-page', handleNavigate)
    return () => {
      webview.removeEventListener('did-navigate', handleNavigate)
      webview.removeEventListener('did-navigate-in-page', handleNavigate)
    }
  }, [provider.homeUrl, onLoggedIn])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-[70vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-onyx shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Iniciar sesión en ${provider.name}`}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-bold text-white">Iniciar sesión en {provider.name}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <webview
          ref={webviewRef}
          src={provider.loginUrl}
          // eslint-disable-next-line react/no-unknown-property
          partition={provider.partition}
          // eslint-disable-next-line react/no-unknown-property
          allowpopups
          className="h-full w-full flex-1 bg-white"
        />
      </div>
    </div>
  )
}

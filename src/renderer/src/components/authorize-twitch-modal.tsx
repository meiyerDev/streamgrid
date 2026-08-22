import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle, Loader2, LogIn, X } from 'lucide-react'
import type { ProviderDef } from '../../../shared/providers'
import type { WebviewElement } from '../webview'

export type AuthorizePhase = 'login' | 'authorizing' | 'authorizing_complete' | 'done' | 'error'

export interface AuthorizeTwitchResult {
  success: boolean
  cookiesSaved: boolean
  username?: string
  error?: string
}

interface AuthorizeTwitchModalProps {
  provider: ProviderDef
  onAuthorize: () => Promise<AuthorizeTwitchResult>
  onClose: () => void
}

const PHASE_LABELS: Record<AuthorizePhase, string> = {
  login: 'Iniciando sesión en Twitch…',
  authorizing: 'Autorizando chat…',
  authorizing_complete: 'Autorización completa',
  done: 'Listo',
  error: 'Error'
}

export function AuthorizeTwitchModal({
  provider,
  onAuthorize,
  onClose
}: AuthorizeTwitchModalProps): React.JSX.Element {
  const webviewRef = useRef<WebviewElement | null>(null)
  const [phase, setPhase] = useState<AuthorizePhase>('login')
  const [error, setError] = useState<string | undefined>()
  const authorizeStarted = useRef(false)

  const handleAuthorize = useCallback(async (): Promise<void> => {
    try {
      const result = await onAuthorize()
      if (result.success) {
        setPhase('authorizing_complete')
        setTimeout(() => {
          setPhase('done')
          setTimeout(onClose, 800)
        }, 600)
      } else {
        setError(result.error)
        setPhase('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setPhase('error')
    }
  }, [onAuthorize, onClose])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleNavigate = (event: { url: string }): void => {
      if (event.url.startsWith(provider.homeUrl) && !authorizeStarted.current) {
        authorizeStarted.current = true
        setPhase('authorizing')
        void handleAuthorize()
      }
    }

    webview.addEventListener('did-navigate', handleNavigate)
    webview.addEventListener('did-navigate-in-page', handleNavigate)
    return () => {
      webview.removeEventListener('did-navigate', handleNavigate)
      webview.removeEventListener('did-navigate-in-page', handleNavigate)
    }
  }, [provider.homeUrl, handleAuthorize])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && phase !== 'authorizing') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, onClose])

  const canClose = phase !== 'authorizing'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      onClick={canClose ? onClose : undefined}
      role="presentation"
    >
      <div
        className="flex h-[70vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-onyx shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Autorizar Twitch"
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">Autorizar Twitch</h2>
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-blurple/20 px-3 py-1 text-xs font-semibold text-blurple"
              aria-live="polite"
            >
              {phase === 'authorizing' || phase === 'authorizing_complete' ? (
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              ) : phase === 'done' ? (
                <CheckCircle size={12} aria-hidden="true" />
              ) : (
                <LogIn size={12} aria-hidden="true" />
              )}
              {PHASE_LABELS[phase]}
            </span>
          </div>
          {canClose && (
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="relative flex-1">
          <webview
            ref={webviewRef}
            src={provider.loginUrl}
            // eslint-disable-next-line react/no-unknown-property
            partition={provider.partition}
            // eslint-disable-next-line react/no-unknown-property
            allowpopups
            className="h-full w-full flex-1 bg-white"
          />

          {phase !== 'login' && (
            <div className="absolute inset-0 flex items-center justify-center bg-onyx/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={48} className="animate-spin text-blurple" aria-hidden="true" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-white">{PHASE_LABELS[phase]}</p>
                  {phase === 'authorizing' && (
                    <p className="mt-1 text-sm text-white/60">Completando autorización del chat…</p>
                  )}
                  {phase === 'authorizing_complete' && (
                    <p className="mt-1 text-sm text-green-400">¡Listo! Redirigiendo…</p>
                  )}
                  {phase === 'error' && error && (
                    <p className="mt-1 text-sm text-red-400">{error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

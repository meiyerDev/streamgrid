import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { PROVIDERS, type ProviderId } from '../../../shared/providers'
import { PROVIDER_ICONS } from '../providers'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useSubscribedChannels } from '../hooks/use-subscriptions'

interface AddStreamFormProps {
  onAdd: (providerId: ProviderId, channel: string) => Promise<void>
  onCancel: () => void
}

function ProviderOption({ providerId }: { providerId: ProviderId }): React.JSX.Element {
  const provider = PROVIDERS.find((item) => item.id === providerId)
  if (!provider) return <span className="text-white/60">Desconocido</span>
  const Icon = PROVIDER_ICONS[provider.id]
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {provider.name}
    </span>
  )
}

const PROVIDER_ITEMS: Record<ProviderId, React.ReactNode> = Object.fromEntries(
  PROVIDERS.map((provider) => [
    provider.id,
    <ProviderOption key={provider.id} providerId={provider.id} />
  ])
) as Record<ProviderId, React.ReactNode>

export function AddStreamForm({ onAdd, onCancel }: AddStreamFormProps): React.JSX.Element {
  const [providerId, setProviderId] = useState<ProviderId>(PROVIDERS[0].id)
  const [channel, setChannel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const { channels: followedChannels, loading: loadingFollowed } = useSubscribedChannels()

  const trimmed = channel.trim()
  const invalid = trimmed.length === 0

  const suggestions =
    channel.trim().length > 0 && providerId === 'twitch'
      ? followedChannels.filter(
          (c) =>
            c.providerId === providerId &&
            c.channel.toLowerCase().includes(channel.trim().toLowerCase())
        )
      : []

  const showSuggestionsDropdown = showSuggestions && suggestions.length > 0

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (invalid || adding) return
    setAdding(true)
    setError(null)
    setShowSuggestions(false)
    try {
      await onAdd(providerId, trimmed)
      setChannel('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo añadir el stream')
    } finally {
      setAdding(false)
    }
  }

  function handleSelectSuggestion(channelName: string): void {
    setChannel(channelName)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="stream-provider" className="text-sm font-semibold text-white/80">
          Provider
        </label>
        <Select
          items={PROVIDER_ITEMS}
          value={providerId}
          onValueChange={(value) => {
            if (value) setProviderId(value)
          }}
        >
          <SelectTrigger id="stream-provider">
            <SelectValue placeholder="Elige un provider" />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                <ProviderOption providerId={provider.id} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="relative flex flex-col gap-1.5">
        <label htmlFor="stream-channel" className="text-sm font-semibold text-white/80">
          Canal
        </label>
        <input
          ref={inputRef}
          id="stream-channel"
          value={channel}
          onChange={(event) => {
            setChannel(event.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="nombre del canal"
          autoComplete="off"
          className="h-11 w-full rounded-xl bg-surface px-4 text-sm text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        {showSuggestionsDropdown && (
          <div
            ref={suggestionsRef}
            className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl bg-surface py-1 shadow-lg"
          >
            {loadingFollowed ? (
              <div className="px-4 py-2 text-sm text-white/50">Cargando seguidos...</div>
            ) : (
              suggestions.map((suggestion) => {
                const provider = PROVIDERS.find((p) => p.id === suggestion.providerId)
                const Icon = provider ? PROVIDER_ICONS[provider.id] : null
                return (
                  <button
                    key={`${suggestion.providerId}-${suggestion.channel}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion.channel)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                  >
                    {Icon && <Icon className="size-4 shrink-0 text-blurple" aria-hidden="true" />}
                    <span className="truncate">{suggestion.channel}</span>
                    <span className="ml-auto text-xs text-white/40">seguido</span>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={invalid || adding}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blurple px-6 py-3 text-sm font-semibold text-white transition hover:bg-blurple/90 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {adding ? (
            <span
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
          ) : (
            <Plus size={18} aria-hidden="true" />
          )}
          Agregar
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={adding}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface px-6 py-3 text-sm font-semibold text-white/70 transition hover:bg-surface hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97] disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

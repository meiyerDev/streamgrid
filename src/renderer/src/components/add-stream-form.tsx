import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PROVIDERS, type ProviderId } from '../../../shared/providers'
import { PROVIDER_ICONS } from '../providers'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

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

  const trimmed = channel.trim()
  const invalid = trimmed.length === 0

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (invalid || adding) return
    setAdding(true)
    setError(null)
    try {
      await onAdd(providerId, trimmed)
      setChannel('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo añadir el stream')
    } finally {
      setAdding(false)
    }
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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="stream-channel" className="text-sm font-semibold text-white/80">
          Canal
        </label>
        <input
          id="stream-channel"
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
          placeholder="nombre del canal"
          className="h-11 w-full rounded-xl bg-surface px-4 text-sm text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2"
        />
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

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PROVIDERS, type ProviderId } from '../../../shared/providers'
import { PROVIDER_ICONS } from '../providers'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useSubscribedChannels } from '../hooks/use-subscriptions'

const OTHER_VALUE = '__other__'

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
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const [selectedChannelLabel, setSelectedChannelLabel] = useState<string | null>(null)
  const [otherChannel, setOtherChannel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const { channels: followedChannels, loading: loadingFollowed } = useSubscribedChannels()

  const channelItems: { label: React.ReactNode; value: string }[] = followedChannels
    .filter((c) => c.providerId === providerId)
    .map((c) => ({
      label: (
        <span className="flex items-center gap-2">
          {c.channel}
          <span className="text-xs text-white/40">seguido</span>
        </span>
      ),
      value: c.channel
    }))

  const channelToSubmit =
    selectedChannel === OTHER_VALUE ? otherChannel.trim() : (selectedChannel ?? '').trim()

  const isInvalid = channelToSubmit.length === 0

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (isInvalid || adding) return
    setAdding(true)
    setError(null)
    try {
      await onAdd(providerId, channelToSubmit)
      setSelectedChannel(null)
      setSelectedChannelLabel(null)
      setOtherChannel('')
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
            if (value) {
              setProviderId(value)
              setSelectedChannel(null)
              setSelectedChannelLabel(null)
              setOtherChannel('')
            }
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
        <Select
          items={channelItems}
          value={selectedChannel ?? undefined}
          onValueChange={(value) => {
            if (value === OTHER_VALUE) {
              setSelectedChannel(value)
              setSelectedChannelLabel('Otro...')
            } else {
              setSelectedChannel(value ?? null)
              setSelectedChannelLabel(null)
            }
          }}
        >
          <SelectTrigger id="stream-channel">
            <SelectValue placeholder="Elige un canal">
              {selectedChannelLabel ?? undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OTHER_VALUE} className="border-t border-white/10 text-white/60">
              Otro...
            </SelectItem>
            {loadingFollowed ? (
              <div className="px-3 py-2 text-sm text-white/50">Cargando seguidos...</div>
            ) : channelItems.length === 0 ? (
              <div className="px-3 py-2 text-sm text-white/50">Sin canales seguidos</div>
            ) : (
              channelItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      {selectedChannel === OTHER_VALUE && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="stream-channel-other" className="text-sm font-semibold text-white/80">
            Nombre del canal
          </label>
          <input
            id="stream-channel-other"
            value={otherChannel}
            onChange={(event) => setOtherChannel(event.target.value)}
            placeholder="nombre del canal"
            autoComplete="off"
            className="h-11 w-full rounded-xl bg-surface px-4 text-sm text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2"
          />
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={isInvalid || adding}
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

import { forwardRef, type HTMLAttributes } from 'react'
import { GripVertical, X } from 'lucide-react'
import { getProvider } from '../../../shared/providers'
import type { StreamConfig } from '../../../shared/streams'
import { PROVIDER_ICONS } from '../providers'

interface StreamTileProps extends HTMLAttributes<HTMLDivElement> {
  stream: StreamConfig
  edit: boolean
  onRemove: () => void
}

export const StreamTile = forwardRef<HTMLDivElement, StreamTileProps>(function StreamTile(
  { stream, edit, onRemove, className, style, children, ...rest },
  ref
): React.JSX.Element {
  const provider = getProvider(stream.providerId)
  const Icon = provider ? PROVIDER_ICONS[provider.id] : undefined

  return (
    <div ref={ref} className={className} style={style} data-stream-id={stream.id} {...rest}>
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-black">
        {edit && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface/95 backdrop-blur-sm">
            <span className="flex items-center gap-3">
              <span
                className="stream-tile-drag-handle flex size-9 cursor-grab items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/20 active:cursor-grabbing"
                aria-hidden="true"
              >
                <GripVertical size={20} />
              </span>
              {Icon && <Icon className="size-8 text-white/80" aria-hidden="true" />}
            </span>
            <span className="text-xl font-extrabold uppercase tracking-tight text-white">
              {stream.channel}
            </span>
            <button
              onClick={onRemove}
              aria-label={`Quitar ${stream.channel}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/20 hover:text-white"
            >
              <X size={16} aria-hidden="true" />
              Quitar
            </button>
          </div>
        )}
      </div>
      {children}
    </div>
  )
})

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, LayoutGrid, Pencil, Settings, UserRound, X } from 'lucide-react'
import ReactGridLayout, { useContainerWidth, type Layout, type LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { getProvider } from '../../../shared/providers'
import {
  DEFAULT_STREAM_H,
  DEFAULT_STREAM_W,
  GRID_COLS,
  GRID_MARGIN,
  GRID_ROW_HEIGHT,
  MAX_STREAM_W,
  MIN_STREAM_H,
  MIN_STREAM_W,
  type StreamConfig,
  type StreamLayout
} from '../../../shared/streams'
import type { ViewBounds, ViewsSyncPayload } from '../../../shared/views'
import { AddStreamForm } from '../components/add-stream-form'
import { StreamTile } from '../components/stream-tile'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '../components/ui/drawer'
import { useStreams } from '../hooks/use-streams'
import { PROVIDER_ICONS } from '../providers'

function StreamRow({
  stream,
  onRemove
}: {
  stream: StreamConfig
  onRemove: () => void
}): React.JSX.Element {
  const provider = getProvider(stream.providerId)
  const Icon = provider ? PROVIDER_ICONS[provider.id] : undefined

  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3">
      {Icon && <Icon className="size-5 shrink-0 text-white/80" aria-hidden="true" />}
      <div className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-sm font-semibold text-white">{stream.channel}</span>
        {provider && <span className="text-xs text-white/50">{provider.name}</span>}
      </div>
      <button
        onClick={onRemove}
        aria-label={`Quitar ${stream.channel}`}
        title={`Quitar ${stream.channel}`}
        className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

function buildGridLayout(streams: StreamConfig[]): Layout {
  const layout: LayoutItem[] = []
  let bottom = 0
  for (const stream of streams) {
    if (stream.layout) {
      layout.push({ i: stream.id, ...stream.layout })
      bottom = Math.max(bottom, stream.layout.y + stream.layout.h)
    } else {
      layout.push({
        i: stream.id,
        x: 0,
        y: bottom,
        w: DEFAULT_STREAM_W,
        h: DEFAULT_STREAM_H
      })
      bottom += DEFAULT_STREAM_H
    }
  }
  const maxBottom = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0)
  const customizedById = new Map(
    streams.map((stream) => [stream.id, stream.layout?.customized ?? false])
  )
  for (const item of layout) {
    item.minW = MIN_STREAM_W
    item.minH = MIN_STREAM_H
    item.maxW = MAX_STREAM_W
    const coveredBelow = layout.some(
      (other) =>
        other.i !== item.i &&
        other.y >= item.y + item.h &&
        other.x < item.x + item.w &&
        other.x + other.w > item.x
    )
    if (!customizedById.get(item.i) && !coveredBelow && item.y + item.h < maxBottom) {
      item.h = maxBottom - item.y
    }
  }
  return layout
}

interface AdminDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: ReactNode
  triggerClassName?: string
  streams: StreamConfig[]
  adding: boolean
  onAddingChange: (adding: boolean) => void
  onAdd: (providerId: StreamConfig['providerId'], channel: string) => Promise<void>
  onRemove: (id: string) => void
}

function AdminDrawer({
  open,
  onOpenChange,
  trigger,
  triggerClassName,
  streams,
  adding,
  onAddingChange,
  onAdd,
  onRemove
}: AdminDrawerProps): React.JSX.Element {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      {trigger && <DrawerTrigger className={triggerClassName}>{trigger}</DrawerTrigger>}
      <DrawerContent className="w-[26rem] max-w-[90vw]">
        <DrawerHeader className="px-6 pt-6">
          <DrawerTitle>Administrar streams</DrawerTitle>
          <DrawerDescription>
            Configura los streams que se muestran en tu mosaico.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
          {adding ? (
            <AddStreamForm
              onAdd={async (providerId, channel) => {
                await onAdd(providerId, channel)
                onAddingChange(false)
              }}
              onCancel={() => onAddingChange(false)}
            />
          ) : streams.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-canvas px-6 py-10 text-center">
              <span className="text-3xl font-extrabold uppercase tracking-tight text-white/90">
                Mosaico vacío
              </span>
              <p className="max-w-60 text-sm text-white/60">
                Todavía no hay streams en el mosaico. Añade el primero para empezar a verlos.
              </p>
            </div>
          ) : (
            streams.map((stream) => (
              <StreamRow key={stream.id} stream={stream} onRemove={() => onRemove(stream.id)} />
            ))
          )}
        </div>
        <DrawerFooter className="px-6 pb-6">
          {!adding && (
            <button
              onClick={() => onAddingChange(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blurple px-6 py-3 text-sm font-semibold text-white transition hover:bg-blurple/90 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97]"
            >
              <LayoutGrid size={18} aria-hidden="true" />
              Añadir stream
            </button>
          )}
          <DrawerClose className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface px-6 py-3 text-sm font-semibold text-white/70 transition hover:bg-surface hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97]">
            Cerrar
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

export function HomePage(): React.JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addingStream, setAddingStream] = useState(false)
  const [edit, setEdit] = useState(false)
  const { streams, addStream, removeStream, updateLayout } = useStreams()
  const { width, containerRef, mounted } = useContainerWidth()

  const gridLayout = useMemo(() => buildGridLayout(streams), [streams])

  const [height, setHeight] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = (): void => setHeight(el.clientHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [containerRef, mounted, streams.length])

  const computeBounds = useCallback((): Record<string, ViewBounds> => {
    const container = containerRef.current
    const bounds: Record<string, ViewBounds> = {}
    if (!container) return bounds
    for (const node of container.querySelectorAll<HTMLElement>(
      '.react-grid-item[data-stream-id]'
    )) {
      const id = node.dataset.streamId
      if (!id) continue
      const rect = node.getBoundingClientRect()
      bounds[id] = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      }
    }
    return bounds
  }, [containerRef])

  const syncTimer = useRef<number | null>(null)
  const pendingSync = useRef<ViewsSyncPayload | null>(null)

  const hideViews = edit || drawerOpen

  const pushSync = useCallback(() => {
    pendingSync.current = {
      streams,
      bounds: computeBounds(),
      edit: hideViews
    }
    if (syncTimer.current !== null) return
    syncTimer.current = window.setTimeout(() => {
      syncTimer.current = null
      const payload = pendingSync.current
      pendingSync.current = null
      if (payload && mounted && width > 0) void window.api.views.sync(payload)
    }, 100)
  }, [streams, computeBounds, mounted, width, hideViews])

  useEffect(() => {
    if (!mounted || width <= 0 || streams.length === 0) return
    void window.api.views.sync({
      streams,
      bounds: computeBounds(),
      edit: hideViews
    })
  }, [mounted, width, streams, edit, drawerOpen, gridLayout, computeBounds, hideViews])

  useEffect(() => {
    const el = containerRef.current
    if (!el || streams.length === 0) return
    const onScroll = (): void => {
      void window.api.views.sync({
        streams,
        bounds: computeBounds(),
        edit: hideViews
      })
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [mounted, streams, computeBounds, hideViews, containerRef])

  useEffect(() => {
    return () => {
      if (syncTimer.current !== null) window.clearTimeout(syncTimer.current)
      void window.api.views.sync({ streams: [], bounds: {}, edit: false })
    }
  }, [])

  const handleLayoutChange = useCallback(() => {
    pushSync()
  }, [pushSync])

  const persistLayout = useCallback(
    async (layout: Layout, resized?: boolean) => {
      await Promise.all(
        layout.map((item) => {
          const current = streams.find((stream) => stream.id === item.i)
          return updateLayout(item.i, {
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
            customized: resized ? true : (current?.layout?.customized ?? false)
          } satisfies StreamLayout)
        })
      )
    },
    [streams, updateLayout]
  )

  const handleDragStop = useCallback(
    (layout: Layout) => {
      void persistLayout(layout)
    },
    [persistLayout]
  )

  const handleResizeStop = useCallback(
    (layout: Layout) => {
      void persistLayout(layout, true)
    },
    [persistLayout]
  )

  const navButtonClass =
    'flex size-10 items-center justify-center rounded-lg bg-surface/40 text-white/70 transition-colors hover:bg-surface hover:text-white'

  const emptyTrigger = (
    <>
      <LayoutGrid size={18} aria-hidden="true" />
      Administrar
    </>
  )

  const drawerProps = {
    open: drawerOpen,
    onOpenChange: setDrawerOpen,
    streams,
    adding: addingStream,
    onAddingChange: setAddingStream,
    onAdd: addStream,
    onRemove: (id: string) => void removeStream(id)
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-canvas text-white">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight text-white">Streams</h1>
        <nav className="flex items-center gap-2">
          {streams.length > 0 && (
            <button
              onClick={() => setEdit((value) => !value)}
              aria-label={edit ? 'Terminar edición' : 'Editar mosaico'}
              title={edit ? 'Terminar edición' : 'Editar mosaico'}
              className="flex size-10 items-center justify-center rounded-lg bg-blurple text-white transition-colors hover:bg-blurple/90"
            >
              {edit ? (
                <Check size={20} aria-hidden="true" />
              ) : (
                <Pencil size={20} aria-hidden="true" />
              )}
            </button>
          )}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Administrar"
            title="Administrar"
            className={navButtonClass}
          >
            <LayoutGrid size={20} aria-hidden="true" />
          </button>
          <Link to="/account" aria-label="Account" title="Account" className={navButtonClass}>
            <UserRound size={20} aria-hidden="true" />
          </Link>
          <Link to="/settings" aria-label="Settings" title="Settings" className={navButtonClass}>
            <Settings size={20} aria-hidden="true" />
          </Link>
        </nav>
      </header>

      {streams.length === 0 ? (
        <main className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-10 text-center">
          <h1 className="text-5xl font-extrabold uppercase tracking-tight text-white">Streams</h1>
          <AdminDrawer
            trigger={emptyTrigger}
            triggerClassName="inline-flex items-center gap-2 rounded-xl bg-surface px-6 py-3 text-sm font-semibold text-white transition hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97]"
            {...drawerProps}
          />
        </main>
      ) : (
        <div ref={containerRef} className="min-h-0 w-full flex-1 overflow-y-auto">
          {mounted && width > 0 && height > 0 && (
            <ReactGridLayout
              width={width}
              layout={gridLayout}
              gridConfig={{
                cols: GRID_COLS,
                rowHeight: GRID_ROW_HEIGHT,
                margin: GRID_MARGIN
              }}
              dragConfig={{ enabled: edit, handle: '.stream-tile-drag-handle' }}
              resizeConfig={{ enabled: edit }}
              onLayoutChange={handleLayoutChange}
              onDragStop={handleDragStop}
              onResizeStop={handleResizeStop}
            >
              {streams.map((stream) => (
                <StreamTile
                  key={stream.id}
                  stream={stream}
                  edit={edit}
                  onRemove={() => void removeStream(stream.id)}
                />
              ))}
            </ReactGridLayout>
          )}
          <AdminDrawer {...drawerProps} />
        </div>
      )}
    </div>
  )
}

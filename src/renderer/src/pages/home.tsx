import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from 'react'
import { Link } from '@tanstack/react-router'
import { Check, LayoutGrid, Pencil, Save, Settings2, UserRound, X } from 'lucide-react'
import ReactGridLayout, { useContainerWidth, type Layout, type LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { getProvider } from '../../../shared/providers'
import {
  DEFAULT_STREAM_H,
  GRID_COLS,
  GRID_MARGIN,
  GRID_ROW_HEIGHT,
  MAX_GRID_COLS,
  MIN_GRID_COL_WIDTH,
  MIN_STREAM_H,
  MIN_STREAM_W,
  type StreamConfig,
  type StreamLayout
} from '../../../shared/streams'
import type { ViewBounds, ViewsSyncPayload } from '../../../shared/views'
import { AddStreamForm } from '../components/add-stream-form'
import { ProfileSaveDialog } from '../components/profile-save-dialog'
import { ProfileTabs } from '../components/profile-tabs'
import { StreamTile } from '../components/stream-tile'
import { SettingsDrawer } from '../components/settings-drawer'
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
import { useProfiles } from '../hooks/use-profiles'
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

function fitRowHeight(rows: number, availableHeight: number): number {
  if (rows <= 0 || availableHeight <= 0) return GRID_ROW_HEIGHT
  const marginY = GRID_MARGIN[1]
  let rh = Math.floor((availableHeight - (rows + 1) * marginY) / rows)
  if (rh < 1) {
    rh = Math.max(1, Math.floor((availableHeight - 2) / rows))
  }
  return Math.min(rh, GRID_ROW_HEIGHT)
}

function buildGridLayout(streams: StreamConfig[], cols: number): Layout {
  const layout: LayoutItem[] = []
  const defaultW = Math.max(MIN_STREAM_W, Math.round(cols / 2))
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
        w: defaultW,
        h: DEFAULT_STREAM_H
      })
      bottom += DEFAULT_STREAM_H
    }
  }
  for (const item of layout) {
    item.minW = MIN_STREAM_W
    item.minH = MIN_STREAM_H
    item.maxW = cols
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
  profileId: string
  activeProfileName: string
  onRename: (id: string, name: string) => void
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
  onRemove,
  profileId,
  activeProfileName,
  onRename
}: AdminDrawerProps): React.JSX.Element {
  const [saveOpen, setSaveOpen] = useState(false)

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
          <button
            onClick={() => setSaveOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface px-6 py-3 text-sm font-semibold text-white/70 transition hover:bg-surface hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97]"
          >
            <Save size={18} aria-hidden="true" />
            Guardar perfil
          </button>
          <DrawerClose className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface px-6 py-3 text-sm font-semibold text-white/70 transition hover:bg-surface hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97]">
            Cerrar
          </DrawerClose>
        </DrawerFooter>
        {saveOpen && (
          <ProfileSaveDialog
            open={saveOpen}
            onOpenChange={setSaveOpen}
            profileName={activeProfileName}
            onSave={(name) => onRename(profileId, name)}
          />
        )}
      </DrawerContent>
    </Drawer>
  )
}

export function HomePage(): React.JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addingStream, setAddingStream] = useState(false)
  const [edit, setEdit] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const {
    activeStreams: streams,
    addStream,
    removeStream,
    updateLayout,
    profiles,
    activeProfileId,
    setActive,
    createProfile,
    removeProfile,
    renameProfile
  } = useProfiles()
  const { containerRef } = useContainerWidth()
  const [mounted, setMounted] = useState(false)
  const [width, setWidth] = useState(0)
  const hasStreams = streams.length > 0
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0]

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = (): void => {
      setWidth((prev) => (prev === el.clientWidth ? prev : el.clientWidth))
      setMounted(true)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      observer.disconnect()
      setMounted(false)
    }
  }, [containerRef, hasStreams])

  const cols = useMemo(
    () =>
      width > 0
        ? Math.max(
            GRID_COLS,
            Math.min(MAX_GRID_COLS, Math.floor((width + GRID_MARGIN[0]) / MIN_GRID_COL_WIDTH))
          )
        : GRID_COLS,
    [width]
  )

  const gridLayout = useMemo(() => buildGridLayout(streams, cols), [streams, cols])

  const maxRows = useMemo(
    () => Math.max(0, ...gridLayout.map((item) => item.y + item.h)),
    [gridLayout]
  )

  const [height, setHeight] = useState(0)

  const rowHeight = useMemo(() => fitRowHeight(maxRows, height), [maxRows, height])

  const gridStyle = useMemo<CSSProperties>(() => {
    const pitchX =
      (width - (cols - 1) * GRID_MARGIN[0] - GRID_MARGIN[0] * 2) / cols + GRID_MARGIN[0]
    const pitchY = rowHeight + GRID_MARGIN[1]
    return {
      '--grid-pitch-x': `${pitchX}px`,
      '--grid-pitch-y': `${pitchY}px`,
      '--grid-pad': `${GRID_MARGIN[0]}px`,
      '--grid-line': 'rgba(139, 150, 255, 0.22)'
    } as CSSProperties
  }, [width, rowHeight, cols])

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

  const hideViews = edit || drawerOpen || settingsOpen

  const pushSync = useCallback(() => {
    pendingSync.current = {
      streams,
      bounds: {},
      edit: hideViews
    }
    if (syncTimer.current !== null) return
    syncTimer.current = window.setTimeout(() => {
      syncTimer.current = null
      const payload = pendingSync.current
      pendingSync.current = null
      if (payload && mounted && width > 0) {
        void window.api.views.sync({ ...payload, bounds: computeBounds() })
      }
    }, 100)
  }, [streams, computeBounds, mounted, width, hideViews])

  useEffect(() => {
    if (syncTimer.current !== null) {
      window.clearTimeout(syncTimer.current)
      syncTimer.current = null
    }
    pendingSync.current = null
  }, [activeProfileId])

  useEffect(() => {
    if (!mounted || width <= 0) return
    void window.api.views.sync({
      streams,
      bounds: computeBounds(),
      edit: hideViews
    })
  }, [mounted, width, streams, edit, drawerOpen, gridLayout, computeBounds, hideViews])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
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
    if (!mounted || streams.length === 0) return
    let frames = 0
    const onResized = (): void => {
      // double rAF to guarantee the grid has reflowed to the new layout
      frames = 2
      const tick = (): void => {
        frames -= 1
        if (frames > 0) {
          requestAnimationFrame(tick)
        } else {
          pushSync()
        }
      }
      requestAnimationFrame(tick)
    }
    const unsubscribe = window.api.views.onResized(onResized)
    return unsubscribe
  }, [mounted, streams.length, pushSync])

  const persistLayout = useCallback(
    async (layout: Layout) => {
      await Promise.all(
        layout.map((item) =>
          updateLayout(item.i, {
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
            customized: true
          } satisfies StreamLayout)
        )
      )
    },
    [updateLayout]
  )

  const persistTimer = useRef<number | null>(null)
  const pendingLayout = useRef<Layout | null>(null)

  const flushPersist = useCallback(() => {
    if (persistTimer.current !== null) {
      window.clearTimeout(persistTimer.current)
      persistTimer.current = null
    }
    const layout = pendingLayout.current
    pendingLayout.current = null
    if (layout) void persistLayout(layout)
  }, [persistLayout])

  useEffect(() => {
    return () => {
      flushPersist()
      if (syncTimer.current !== null) window.clearTimeout(syncTimer.current)
      void window.api.views.sync({ streams: [], bounds: {}, edit: false })
    }
  }, [flushPersist])

  const handleLayoutChange = useCallback(
    (layout: Layout) => {
      pushSync()
      pendingLayout.current = layout
      if (persistTimer.current !== null) return
      persistTimer.current = window.setTimeout(() => {
        persistTimer.current = null
        const next = pendingLayout.current
        pendingLayout.current = null
        if (next) void persistLayout(next)
      }, 200)
    },
    [pushSync, persistLayout]
  )

  const handleDragStop = useCallback(
    (layout: Layout) => {
      pendingLayout.current = layout
      flushPersist()
    },
    [flushPersist]
  )

  const handleResizeStop = handleDragStop

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
    onRemove: (id: string) => void removeStream(id),
    profileId: activeProfileId,
    activeProfileName: activeProfile?.name ?? '',
    onRename: (id: string, name: string) => void renameProfile(id, name)
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-canvas text-white">
      <header className="flex shrink-0 items-center border-b border-white/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <h1 className="shrink-0 text-2xl font-extrabold uppercase tracking-tight text-white">
            streamgrid
          </h1>
          <ProfileTabs
            profiles={profiles}
            activeProfileId={activeProfileId}
            onSelect={(id) => void setActive(id)}
            onRemove={(id) => void removeProfile(id)}
            onCreate={() => createProfile('')}
          />
        </div>
        <nav className="ml-auto flex items-center gap-2">
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
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Ajustes"
            title="Ajustes"
            className={navButtonClass}
          >
            <Settings2 size={20} aria-hidden="true" />
          </button>
          <Link to="/account" aria-label="Account" title="Account" className={navButtonClass}>
            <UserRound size={20} aria-hidden="true" />
          </Link>
        </nav>
      </header>

      {streams.length === 0 ? (
        <main className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-10 text-center">
          <h1 className="text-5xl font-extrabold uppercase tracking-tight text-white">
            streamgrid
          </h1>
          <AdminDrawer
            trigger={emptyTrigger}
            triggerClassName="inline-flex items-center gap-2 rounded-xl bg-surface px-6 py-3 text-sm font-semibold text-white transition hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97]"
            {...drawerProps}
          />
        </main>
      ) : (
        <div ref={containerRef} className="min-h-0 w-full flex-1 overflow-hidden">
          {mounted && width > 0 && height > 0 && (
            <ReactGridLayout
              width={width}
              layout={gridLayout}
              className={edit ? 'grid-lines' : undefined}
              style={gridStyle}
              gridConfig={{
                cols,
                rowHeight,
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
      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}

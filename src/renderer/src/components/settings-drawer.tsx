import { Download, LogOut, RefreshCcw, Rocket, Volume2 } from 'lucide-react'
import type { DisplayMode } from '../../../shared/settings'
import { MAX_VOLUME } from '../../../shared/settings'
import { useSettings } from '../hooks/use-settings'
import { useUpdater } from '../hooks/use-updater'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from './ui/drawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

const MODE_LABELS: Record<DisplayMode, string> = {
  windowed: 'Ventana',
  fullscreen: 'Pantalla completa'
}

interface SettingsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function UpdateSection(): React.JSX.Element {
  const { state, check, install } = useUpdater()

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-sm font-semibold text-white">
        <Download size={16} aria-hidden="true" />
        Actualizaciones
      </span>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3">
        <div className="flex min-w-0 flex-col text-left">
          <span className="text-sm font-semibold text-white">StreamGrid</span>
          <span className="text-xs text-white/50">v{state.currentVersion}</span>
          {state.status === 'error' && (
            <span className="mt-1 text-xs text-red-400">{state.error}</span>
          )}
        </div>
        {state.disabled ? (
          <button
            type="button"
            disabled
            title="El actualizador solo está activo en la aplicación instalada"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-white/40"
          >
            <RefreshCcw size={14} aria-hidden="true" />
            No disponible en dev
          </button>
        ) : state.status === 'downloading' && state.percent != null ? (
          <div className="flex shrink-0 items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blurple to-magenta transition-[width] duration-300"
                style={{ width: `${state.percent}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs tabular-nums text-white/70">
              {Math.round(state.percent)}%
            </span>
          </div>
        ) : state.status === 'checking' ? (
          <button
            type="button"
            disabled
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-white/50"
          >
            <RefreshCcw size={14} className="animate-spin" aria-hidden="true" />
            Buscando…
          </button>
        ) : state.status === 'downloaded' ? (
          <button
            type="button"
            onClick={install}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blurple px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blurple/90"
          >
            <Rocket size={14} aria-hidden="true" />
            Reiniciar e instalar
          </button>
        ) : (
          <button
            type="button"
            onClick={check}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-surface hover:text-white"
          >
            <RefreshCcw size={14} aria-hidden="true" />
            {state.newVersion ? `Nueva v${state.newVersion}` : 'Buscar'}
          </button>
        )}
      </div>
    </div>
  )
}

export function SettingsDrawer({ open, onOpenChange }: SettingsDrawerProps): React.JSX.Element {
  const { settings, displays, loading, update } = useSettings()
  const mode = settings.displayMode
  const isFullscreen = mode !== 'windowed'

  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className="w-[26rem] max-w-[90vw]">
        <DrawerHeader className="px-6 pt-6">
          <DrawerTitle>Ajustes</DrawerTitle>
          <DrawerDescription>
            Configura el modo de ventana y el volumen maestro del mosaico.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-white">Modo de ventana</span>
            <Select
              value={mode}
              onValueChange={(value) => void update({ displayMode: value as DisplayMode })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Modo de ventana">
                  {(value) => (value ? MODE_LABELS[value as DisplayMode] : null)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MODE_LABELS) as DisplayMode[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {MODE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isFullscreen && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-white">Monitor</span>
              <Select
                value={settings.monitorId ?? undefined}
                onValueChange={(value) => void update({ monitorId: value ?? null })}
                disabled={loading || displays.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un monitor">
                    {(value) => {
                      if (!value) return null
                      const match = displays.find((d) => d.id === value)
                      return match ? `${match.label}${match.primary ? ' (principal)' : ''}` : value
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {displays.map((display) => (
                    <SelectItem key={display.id} value={display.id}>
                      {display.label}
                      {display.primary ? ' (principal)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <Volume2 size={16} aria-hidden="true" />
              Volumen maestro
            </span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={MAX_VOLUME}
                value={settings.masterVolume}
                onChange={(event) => void update({ masterVolume: Number(event.target.value) })}
                className="w-full accent-blurple"
                aria-label="Volumen maestro"
              />
              <span className="w-10 shrink-0 text-right text-sm tabular-nums text-white/70">
                {settings.masterVolume}%
              </span>
            </div>
          </div>

          <UpdateSection />
        </div>
        <div className="border-t px-6 py-4">
          <button
            type="button"
            onClick={() => void window.api.app.quit()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20"
          >
            <LogOut size={16} aria-hidden="true" />
            Salir al escritorio
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

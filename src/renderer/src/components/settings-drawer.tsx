import { LogOut, Volume2 } from 'lucide-react'
import type { DisplayMode } from '../../../shared/settings'
import { MAX_VOLUME } from '../../../shared/settings'
import { useSettings } from '../hooks/use-settings'
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

import { app, ipcMain, screen, type BrowserWindow } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { defaultSettings, type AppSettings, type DisplayInfo } from '../shared/settings'

function settingsFilePath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function loadSettings(): AppSettings {
  try {
    const raw = readFileSync(settingsFilePath(), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return { ...defaultSettings, ...(parsed as Partial<AppSettings>) }
    }
  } catch {
    // fall through to defaults
  }
  return { ...defaultSettings }
}

export function getSettings(): AppSettings {
  return loadSettings()
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...loadSettings(), ...patch }
  writeFileSync(settingsFilePath(), JSON.stringify(next, null, 2), 'utf-8')
  return next
}

export function listDisplays(): DisplayInfo[] {
  const primary = screen.getPrimaryDisplay()
  return screen.getAllDisplays().map((display) => ({
    id: String(display.id),
    label:
      display.label ||
      (display.id === primary.id ? 'Pantalla principal' : `Pantalla ${display.id}`),
    primary: display.id === primary.id,
    bounds: {
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height
    }
  }))
}

function resolveDisplay(settings: AppSettings): DisplayInfo | undefined {
  const monitors = listDisplays()
  return (
    monitors.find((monitor) => monitor.id === settings.monitorId) ??
    monitors.find((monitor) => monitor.primary) ??
    monitors[0]
  )
}

const lastWindowBounds = new Map<number, { x: number; y: number; width: number; height: number }>()

function applyDisplayMode(win: BrowserWindow, mode: AppSettings['displayMode']): void {
  if (!win) return
  const display = resolveDisplay(getSettings())
  const target = display?.bounds

  if (mode === 'fullscreen') {
    if (!lastWindowBounds.has(win.id)) lastWindowBounds.set(win.id, win.getBounds())
    win.setKiosk(false)
    win.setFullScreen(false)
    if (target) win.setBounds(target)
    win.setFullScreen(true)
    return
  }

  if (win.isKiosk()) win.setKiosk(false)
  if (win.isFullScreen()) win.setFullScreen(false)
  const restore = lastWindowBounds.get(win.id)
  if (restore) {
    lastWindowBounds.delete(win.id)
    win.setBounds(restore)
  }
}

export function applySettings(win: BrowserWindow | null): void {
  if (!win) return
  const settings = getSettings()
  applyDisplayMode(win, settings.displayMode)
}

export function registerSettingsHandlers(onApply: (settings: AppSettings) => void): void {
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_event, patch: Partial<AppSettings>) => {
    const next = setSettings(patch)
    onApply(next)
    return next
  })
  ipcMain.handle('displays:list', () => listDisplays())
}

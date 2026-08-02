import { BrowserWindow, ipcMain, shell, WebContentsView } from 'electron'
import { getProvider, type ProviderId } from '../shared/providers'
import type { ViewBounds, ViewsSyncPayload } from '../shared/views'

function playerUrl(providerId: ProviderId, channel: string): string {
  const def = getProvider(providerId)
  if (def?.id === 'twitch') {
    return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=twitch.tv`
  }
  if (def) return `${def.homeUrl}/${encodeURIComponent(channel)}`
  return ''
}

function roundRect(bounds: ViewBounds): ViewBounds {
  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height)
  }
}

function sameBounds(a: ViewBounds, b: ViewBounds): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}

let mainWindow: BrowserWindow | null = null
const views = new Map<string, WebContentsView>()
const lastBounds = new Map<string, ViewBounds>()

function createView(id: string, providerId: ProviderId, channel: string): void {
  if (!mainWindow) return
  const def = getProvider(providerId)
  if (!def) return

  const view = new WebContentsView({
    webPreferences: {
      partition: def.partition,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  view.setBackgroundColor('#000000')
  view.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.contentView.addChildView(view)
  views.set(id, view)
  void view.webContents.loadURL(playerUrl(providerId, channel))
}

function destroyView(id: string): void {
  const view = views.get(id)
  if (!view) return
  mainWindow?.contentView.removeChildView(view)
  view.webContents.close()
  views.delete(id)
  lastBounds.delete(id)
}

function destroyAllViews(): void {
  for (const id of [...views.keys()]) destroyView(id)
}

export function attachViewManager(win: BrowserWindow): void {
  mainWindow = win
  win.on('closed', destroyAllViews)
}

function syncViews(payload: ViewsSyncPayload): void {
  if (!mainWindow) return

  const ids = new Set(payload.streams.map((stream) => stream.id))

  for (const id of [...views.keys()]) {
    if (!ids.has(id)) destroyView(id)
  }

  for (const stream of payload.streams) {
    if (!views.has(stream.id)) createView(stream.id, stream.providerId, stream.channel)
    const view = views.get(stream.id)
    if (!view) continue

    const bounds = payload.bounds[stream.id]
    if (bounds) {
      const rounded = roundRect(bounds)
      const prev = lastBounds.get(stream.id)
      view.setBounds(rounded)
      const changed = !prev || !sameBounds(prev, rounded)
      if (changed) view.webContents.invalidate()
      lastBounds.set(stream.id, rounded)
    }
    view.setVisible(!payload.edit)
  }
}

export function registerViewHandlers(): void {
  ipcMain.handle('views:sync', (_event, payload: ViewsSyncPayload) => syncViews(payload))
}

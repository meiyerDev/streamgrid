import { BrowserWindow, ipcMain, shell, WebContentsView } from 'electron'
import { getProvider, type ProviderId } from '../shared/providers'
import { getSettings } from './settings'
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

  view.webContents.on('did-finish-load', () => {
    applyVolume(id)
  })

  mainWindow.contentView.addChildView(view)
  views.set(id, view)
  void view.webContents.loadURL(playerUrl(providerId, channel))
}

function applyVolume(id: string): void {
  const view = views.get(id)
  if (!view) return
  const volume = Math.max(0, Math.min(1, getSettings().masterVolume / 100))
  const script = `(() => {
    window.__sgMasterVolume = ${volume}
    const set = (el) => {
      if (!el.__sgHooked) {
        el.__sgHooked = true
        el.addEventListener('volumechange', () => { el.volume = window.__sgMasterVolume })
      }
      el.volume = window.__sgMasterVolume
    }
    document.querySelectorAll('video, audio').forEach(set)
    new MutationObserver((muts) => {
      for (const mut of muts) {
        for (const node of mut.addedNodes) {
          if (node.nodeType === 1) {
            if (node.matches('video, audio')) set(node)
            document.querySelectorAll('video, audio').forEach(set)
          }
        }
      }
    }).observe(document, { childList: true, subtree: true })
  })()`
  void view.webContents.executeJavaScript(script).catch(() => undefined)
}

export function applyMasterVolume(): void {
  for (const id of views.keys()) applyVolume(id)
}

function destroyView(id: string): void {
  const view = views.get(id)
  if (!view) return
  if (mainWindow && !mainWindow.isDestroyed() && !view.webContents.isDestroyed()) {
    mainWindow.contentView.removeChildView(view)
    view.webContents.close()
  }
  views.delete(id)
  lastBounds.delete(id)
}

function destroyAllViews(): void {
  for (const id of [...views.keys()]) destroyView(id)
  views.clear()
  lastBounds.clear()
}

export function attachViewManager(win: BrowserWindow): void {
  mainWindow = win
  win.on('close', destroyAllViews)
  win.on('closed', () => {
    mainWindow = null
  })
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
    if (!view || view.webContents.isDestroyed()) continue

    const bounds = payload.bounds[stream.id]
    if (bounds) {
      const rounded = roundRect(bounds)
      const prev = lastBounds.get(stream.id)
      view.setBounds(rounded)
      const changed = !prev || !sameBounds(prev, rounded)
      if (changed && !payload.edit) {
        view.setVisible(false)
        view.setBounds(rounded)
        view.setVisible(true)
      }
      lastBounds.set(stream.id, rounded)
    }
    view.setVisible(!payload.edit)
  }
}

export function registerViewHandlers(): void {
  ipcMain.handle('views:sync', (_event, payload: ViewsSyncPayload) => syncViews(payload))
}

import { app, ipcMain, type BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdaterEvent, UpdaterState } from '../shared/updater'

let mainWindowGetter: (() => BrowserWindow | null) | null = null
let state: UpdaterState = { status: 'idle', currentVersion: app.getVersion() }

function send(event: UpdaterEvent): void {
  switch (event.type) {
    case 'checking':
      state = { ...state, status: 'checking', error: undefined }
      break
    case 'available':
      state = { ...state, status: 'available', newVersion: event.version, error: undefined }
      break
    case 'not-available':
      state = { ...state, status: 'uptodate', newVersion: undefined, percent: undefined }
      break
    case 'progress':
      state = {
        ...state,
        status: 'downloading',
        percent: event.percent,
        transferred: event.transferred,
        total: event.total,
        bytesPerSecond: event.bytesPerSecond
      }
      break
    case 'downloaded':
      state = { ...state, status: 'downloaded', newVersion: event.version, percent: 100 }
      break
    case 'error':
      state = { ...state, status: 'error', error: event.message }
      break
  }
  mainWindowGetter?.()?.webContents.send('updater:event', event)
}

function isUpdaterEnabled(): boolean {
  return app.isPackaged || process.env.STREAMGRID_UPDATE_TEST === '1'
}

export function getUpdaterState(): UpdaterState {
  return state
}

export function registerUpdater(getWindow: () => BrowserWindow | null): void {
  mainWindowGetter = getWindow

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  if (!app.isPackaged && process.env.STREAMGRID_UPDATE_TEST === '1') {
    autoUpdater.forceDevUpdateConfig = true
  }

  autoUpdater.on('checking-for-update', () => send({ type: 'checking' }))
  autoUpdater.on('update-available', (info) => send({ type: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => send({ type: 'not-available' }))
  autoUpdater.on('download-progress', (progress) =>
    send({
      type: 'progress',
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    })
  )
  autoUpdater.on('update-downloaded', (info) => send({ type: 'downloaded', version: info.version }))
  autoUpdater.on('error', (error) => send({ type: 'error', message: error.message }))

  const disabled = !isUpdaterEnabled()
  state = { ...state, disabled }
  ipcMain.handle('updater:getState', () => ({ ...state, disabled }))
  ipcMain.handle('updater:check', () => {
    if (isUpdaterEnabled()) {
      void autoUpdater.checkForUpdates()
    }
    return { ...state, disabled }
  })
  ipcMain.handle('updater:install', () => {
    if (state.status === 'downloaded') {
      autoUpdater.quitAndInstall()
    }
  })
}

export function scheduleUpdateCheck(delayMs: number): void {
  if (!isUpdaterEnabled()) return
  setTimeout(() => {
    void autoUpdater.checkForUpdates()
  }, delayMs)
}

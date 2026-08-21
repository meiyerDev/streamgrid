import { app, ipcMain, type BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdaterEvent, UpdaterState } from '../shared/updater'
import {
  isLinuxManagedInstall,
  linuxCheckForUpdate,
  linuxQuitAndUpdate,
  resolveLinuxUpdater
} from './linux-updater'

let mainWindowGetter: (() => BrowserWindow | null) | null = null
let state: UpdaterState = { status: 'idle', currentVersion: app.getVersion() }
let linuxReadyPromise: Promise<boolean> | null = null

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

function isLinuxExternalUpdater(): boolean {
  return process.platform === 'linux'
}

function baseUpdaterAllowed(): boolean {
  return app.isPackaged || process.env.STREAMGRID_UPDATE_TEST === '1'
}

async function ensureLinuxReady(): Promise<boolean> {
  if (!isLinuxExternalUpdater()) return true
  if (!linuxReadyPromise) {
    linuxReadyPromise = resolveLinuxUpdater().then((path) => {
      if (path == null) return false
      // Managed ~/.local install, or dev/test with the script available
      return (
        isLinuxManagedInstall() || process.env.STREAMGRID_UPDATE_TEST === '1' || !app.isPackaged
      )
    })
  }
  const ready = await linuxReadyPromise
  state = { ...state, disabled: !baseUpdaterAllowed() || !ready }
  return ready
}

function isUpdaterEnabledSync(): boolean {
  if (!baseUpdaterAllowed()) return false
  if (isLinuxExternalUpdater()) {
    // Until ensureLinuxReady resolves, treat as disabled
    return state.disabled === false
  }
  return true
}

export function getUpdaterState(): UpdaterState {
  return state
}

async function runLinuxCheck(): Promise<void> {
  const ready = await ensureLinuxReady()
  if (!ready || !baseUpdaterAllowed()) return
  send({ type: 'checking' })
  try {
    const result = await linuxCheckForUpdate()
    if (result.error && !result.latest) {
      send({ type: 'error', message: result.error })
      return
    }
    if (result.updateAvailable && result.latest) {
      // Download happens in the external updater on install; mark ready to apply.
      send({ type: 'available', version: result.latest })
      send({ type: 'downloaded', version: result.latest })
    } else {
      send({ type: 'not-available' })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    send({ type: 'error', message })
  }
}

function registerElectronUpdater(): void {
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
}

export function registerUpdater(getWindow: () => BrowserWindow | null): void {
  mainWindowGetter = getWindow

  if (isLinuxExternalUpdater()) {
    state = { ...state, disabled: true }
    void ensureLinuxReady()
  } else {
    registerElectronUpdater()
    state = { ...state, disabled: !baseUpdaterAllowed() }
  }

  ipcMain.handle('updater:getState', async () => {
    if (isLinuxExternalUpdater()) await ensureLinuxReady()
    return { ...state, disabled: !isUpdaterEnabledSync() }
  })
  ipcMain.handle('updater:check', async () => {
    if (isLinuxExternalUpdater()) {
      await runLinuxCheck()
      return { ...state, disabled: !isUpdaterEnabledSync() }
    }
    if (!baseUpdaterAllowed()) return { ...state, disabled: true }
    void autoUpdater.checkForUpdates()
    return { ...state, disabled: false }
  })
  ipcMain.handle('updater:install', async () => {
    if (state.status !== 'downloaded' && state.status !== 'available') return
    if (isLinuxExternalUpdater()) {
      try {
        await linuxQuitAndUpdate()
        app.quit()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        send({ type: 'error', message })
      }
      return
    }
    if (state.status === 'downloaded') {
      autoUpdater.quitAndInstall()
    }
  })
}

export function scheduleUpdateCheck(delayMs: number): void {
  setTimeout(() => {
    if (isLinuxExternalUpdater()) {
      void runLinuxCheck()
      return
    }
    if (!baseUpdaterAllowed()) return
    void autoUpdater.checkForUpdates()
  }, delayMs)
}

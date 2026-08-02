import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { ProviderId, ProviderSession } from '../shared/providers'
import type { StreamConfig, StreamLayout } from '../shared/streams'
import type { ViewsSyncPayload } from '../shared/views'

// Custom APIs for renderer
const api = {
  sessions: {
    list: (): Promise<ProviderSession[]> => ipcRenderer.invoke('sessions:list'),
    detect: (id: ProviderId): Promise<ProviderSession> => ipcRenderer.invoke('sessions:detect', id),
    logout: (id: ProviderId): Promise<void> => ipcRenderer.invoke('sessions:logout', id)
  },
  streams: {
    list: (): Promise<StreamConfig[]> => ipcRenderer.invoke('streams:list'),
    add: (input: { providerId: ProviderId; channel: string }): Promise<StreamConfig[]> =>
      ipcRenderer.invoke('streams:add', input),
    remove: (id: string): Promise<StreamConfig[]> => ipcRenderer.invoke('streams:remove', id),
    updateLayout: (id: string, layout: StreamLayout): Promise<StreamConfig[]> =>
      ipcRenderer.invoke('streams:updateLayout', id, layout)
  },
  views: {
    sync: (payload: ViewsSyncPayload): Promise<void> => ipcRenderer.invoke('views:sync', payload),
    onResized: (cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('window:resized', listener)
      return () => ipcRenderer.removeListener('window:resized', listener)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

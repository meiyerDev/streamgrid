import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { ProviderId, ProviderSession } from '../shared/providers'
import type { ProfilesStore, StreamConfig, StreamLayout } from '../shared/streams'
import type { AppSettings, DisplayInfo } from '../shared/settings'
import type { ViewsSyncPayload } from '../shared/views'
import type {
  ChatChannel,
  ChatMessage,
  ChatSendInput,
  ChatSendResult,
  ChatStatusPayload
} from '../shared/chat'
import type { TwitchChatStatus } from '../shared/chat-auth'
import type { UpdaterEvent, UpdaterState } from '../shared/updater'

// Custom APIs for renderer
const api = {
  sessions: {
    list: (): Promise<ProviderSession[]> => ipcRenderer.invoke('sessions:list'),
    detect: (id: ProviderId): Promise<ProviderSession> => ipcRenderer.invoke('sessions:detect', id),
    logout: (id: ProviderId): Promise<void> => ipcRenderer.invoke('sessions:logout', id)
  },
  profiles: {
    list: (): Promise<ProfilesStore> => ipcRenderer.invoke('profiles:list'),
    create: (name: string): Promise<ProfilesStore> => ipcRenderer.invoke('profiles:create', name),
    rename: (id: string, name: string): Promise<ProfilesStore> =>
      ipcRenderer.invoke('profiles:rename', id, name),
    remove: (id: string): Promise<ProfilesStore> => ipcRenderer.invoke('profiles:remove', id),
    setActive: (id: string): Promise<ProfilesStore> => ipcRenderer.invoke('profiles:setActive', id),
    updateChat: (patch: { enabled?: boolean; layout?: StreamLayout }): Promise<ProfilesStore> =>
      ipcRenderer.invoke('profiles:updateChat', patch)
  },
  streams: {
    add: (input: { providerId: ProviderId; channel: string }): Promise<StreamConfig[]> =>
      ipcRenderer.invoke('streams:add', input),
    remove: (id: string): Promise<StreamConfig[]> => ipcRenderer.invoke('streams:remove', id),
    updateLayout: (id: string, layout: StreamLayout): Promise<StreamConfig[]> =>
      ipcRenderer.invoke('streams:updateLayout', id, layout)
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    set: (patch: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:set', patch),
    listDisplays: (): Promise<DisplayInfo[]> => ipcRenderer.invoke('displays:list')
  },
  app: {
    quit: (): Promise<void> => ipcRenderer.invoke('app:quit')
  },
  views: {
    sync: (payload: ViewsSyncPayload): Promise<void> => ipcRenderer.invoke('views:sync', payload),
    onResized: (cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('window:resized', listener)
      return () => ipcRenderer.removeListener('window:resized', listener)
    }
  },
  chat: {
    setChannels: (channels: ChatChannel[]): Promise<void> =>
      ipcRenderer.invoke('chat:setChannels', channels),
    sendMessage: (input: ChatSendInput): Promise<ChatSendResult> =>
      ipcRenderer.invoke('chat:sendMessage', input),
    onMessage: (cb: (message: ChatMessage) => void): (() => void) => {
      const listener = (_event: unknown, message: ChatMessage): void => cb(message)
      ipcRenderer.on('chat:message', listener)
      return () => ipcRenderer.removeListener('chat:message', listener)
    },
    onStatus: (cb: (payload: ChatStatusPayload) => void): (() => void) => {
      const listener = (_event: unknown, payload: ChatStatusPayload): void => cb(payload)
      ipcRenderer.on('chat:status', listener)
      return () => ipcRenderer.removeListener('chat:status', listener)
    }
  },
  chatAuth: {
    getStatus: (): Promise<TwitchChatStatus> => ipcRenderer.invoke('chatAuth:getStatus'),
    login: (): Promise<TwitchChatStatus> => ipcRenderer.invoke('chatAuth:login'),
    logout: (): Promise<TwitchChatStatus> => ipcRenderer.invoke('chatAuth:logout')
  },
  updater: {
    getState: (): Promise<UpdaterState> => ipcRenderer.invoke('updater:getState'),
    check: (): Promise<UpdaterState> => ipcRenderer.invoke('updater:check'),
    install: (): Promise<void> => ipcRenderer.invoke('updater:install'),
    onEvent: (cb: (event: UpdaterEvent) => void): (() => void) => {
      const listener = (_event: unknown, updaterEvent: UpdaterEvent): void => cb(updaterEvent)
      ipcRenderer.on('updater:event', listener)
      return () => ipcRenderer.removeListener('updater:event', listener)
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

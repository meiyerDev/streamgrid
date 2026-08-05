import { ElectronAPI } from '@electron-toolkit/preload'
import type { ChatSession, ProviderId, ProviderSession } from '../shared/providers'
import type { ChatConfig, ProfilesStore, StreamConfig, StreamLayout } from '../shared/streams'
import type { AppSettings, DisplayInfo } from '../shared/settings'
import type { ChatMessage, ChatStatus, ViewsSyncPayload } from '../shared/views'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      sessions: {
        list: () => Promise<ProviderSession[]>
        detect: (id: ProviderId) => Promise<ProviderSession>
        logout: (id: ProviderId) => Promise<void>
        detectChat: () => Promise<ChatSession>
        logoutChat: () => Promise<void>
      }
      chats: {
        add: () => Promise<ChatConfig[]>
        remove: (id: string) => Promise<ChatConfig[]>
        updateLayout: (id: string, layout: StreamLayout) => Promise<ChatConfig[]>
      }
      chat: {
        connect: () => Promise<void>
        disconnect: () => Promise<void>
        setChannels: (channels: string[]) => Promise<void>
        send: (channel: string, message: string) => Promise<void>
        onMessage: (cb: (message: ChatMessage) => void) => () => void
        onStatus: (cb: (status: ChatStatus) => void) => () => void
      }
      profiles: {
        list: () => Promise<ProfilesStore>
        create: (name: string) => Promise<ProfilesStore>
        rename: (id: string, name: string) => Promise<ProfilesStore>
        remove: (id: string) => Promise<ProfilesStore>
        setActive: (id: string) => Promise<ProfilesStore>
      }
      streams: {
        add: (input: { providerId: ProviderId; channel: string }) => Promise<StreamConfig[]>
        remove: (id: string) => Promise<StreamConfig[]>
        updateLayout: (id: string, layout: StreamLayout) => Promise<StreamConfig[]>
      }
      settings: {
        get: () => Promise<AppSettings>
        set: (patch: Partial<AppSettings>) => Promise<AppSettings>
        listDisplays: () => Promise<DisplayInfo[]>
      }
      views: {
        sync: (payload: ViewsSyncPayload) => Promise<void>
        onResized: (cb: () => void) => () => void
      }
      app: {
        quit: () => Promise<void>
      }
    }
  }
}

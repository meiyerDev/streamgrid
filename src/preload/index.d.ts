import { ElectronAPI } from '@electron-toolkit/preload'
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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      sessions: {
        list: () => Promise<ProviderSession[]>
        detect: (id: ProviderId) => Promise<ProviderSession>
        logout: (id: ProviderId) => Promise<void>
      }
      profiles: {
        list: () => Promise<ProfilesStore>
        create: (name: string) => Promise<ProfilesStore>
        rename: (id: string, name: string) => Promise<ProfilesStore>
        remove: (id: string) => Promise<ProfilesStore>
        setActive: (id: string) => Promise<ProfilesStore>
        updateChat: (patch: { enabled?: boolean; layout?: StreamLayout }) => Promise<ProfilesStore>
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
      chat: {
        setChannels: (channels: ChatChannel[]) => Promise<void>
        sendMessage: (input: ChatSendInput) => Promise<ChatSendResult>
        onMessage: (cb: (message: ChatMessage) => void) => () => void
        onStatus: (cb: (payload: ChatStatusPayload) => void) => () => void
      }
      chatAuth: {
        getStatus: () => Promise<TwitchChatStatus>
        login: () => Promise<TwitchChatStatus>
        logout: () => Promise<TwitchChatStatus>
      }
      app: {
        quit: () => Promise<void>
      }
      updater: {
        getState: () => Promise<UpdaterState>
        check: () => Promise<UpdaterState>
        install: () => Promise<void>
        onEvent: (cb: (event: UpdaterEvent) => void) => () => void
      }
    }
  }
}

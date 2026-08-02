import { ElectronAPI } from '@electron-toolkit/preload'
import type { ProviderId, ProviderSession } from '../shared/providers'
import type { StreamConfig, StreamLayout } from '../shared/streams'
import type { ViewsSyncPayload } from '../shared/views'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      sessions: {
        list: () => Promise<ProviderSession[]>
        detect: (id: ProviderId) => Promise<ProviderSession>
        logout: (id: ProviderId) => Promise<void>
      }
      streams: {
        list: () => Promise<StreamConfig[]>
        add: (input: { providerId: ProviderId; channel: string }) => Promise<StreamConfig[]>
        remove: (id: string) => Promise<StreamConfig[]>
        updateLayout: (id: string, layout: StreamLayout) => Promise<StreamConfig[]>
      }
      views: {
        sync: (payload: ViewsSyncPayload) => Promise<void>
      }
    }
  }
}

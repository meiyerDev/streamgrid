import type { ProviderId } from './providers'

export interface FollowedChannel {
  providerId: ProviderId
  channel: string
}

export interface SubscriptionsStatus {
  authenticated: boolean
  hasFollowsScope: boolean
  error?: string
}

export interface GetFollowedResult {
  ok: boolean
  channels?: FollowedChannel[]
  error?: string
}

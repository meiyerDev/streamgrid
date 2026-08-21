import type { ProviderId } from '../shared/providers'

const TWITCH_API_BASE = 'https://api.twitch.tv/helix'
const TWITCH_CLIENT_ID = 'wlxvt7l02mx8w6hnmubw8wc7uagzvj'

export interface FollowedChannel {
  providerId: ProviderId
  channel: string
}

interface HelixFollowedResponse {
  data: Array<{
    broadcaster_login: string
    broadcaster_name: string
    broadcaster_id: string
  }>
  pagination?: {
    cursor?: string
  }
}

export async function getFollowedChannels(
  userId: string,
  token: string
): Promise<FollowedChannel[]> {
  const url = new URL(`${TWITCH_API_BASE}/channels/followed`)
  url.searchParams.set('user_id', userId)

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Client-Id': TWITCH_CLIENT_ID
    }
  })

  if (!response.ok) {
    throw new Error(`Helix API error: ${response.status}`)
  }

  const data = (await response.json()) as HelixFollowedResponse

  return data.data.map((follow) => ({
    providerId: 'twitch' as ProviderId,
    channel: follow.broadcaster_login
  }))
}

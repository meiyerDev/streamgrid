import { ipcMain } from 'electron'
import { getStoredSession } from './chat-auth'
import { getFollowedChannels, type FollowedChannel } from './twitch-api'

export interface SubscriptionsStatus {
  authenticated: boolean
  hasFollowsScope: boolean
  error?: string
}

function getStatus(): SubscriptionsStatus {
  const session = getStoredSession()
  if (!session) {
    return { authenticated: false, hasFollowsScope: false }
  }
  return { authenticated: true, hasFollowsScope: true }
}

async function getFollowed(): Promise<{
  ok: boolean
  channels?: FollowedChannel[]
  error?: string
}> {
  const session = getStoredSession()
  if (!session) {
    return { ok: false, error: 'No hay sesión de Twitch activa' }
  }

  try {
    const channels = await getFollowedChannels(session.userId, session.token)
    return { ok: true, channels }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

export function registerSubscriptionHandlers(): void {
  ipcMain.handle('subscriptions:getStatus', () => getStatus())
  ipcMain.handle('subscriptions:getFollowed', () => getFollowed())
}

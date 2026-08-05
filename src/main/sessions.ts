import { ipcMain, session } from 'electron'
import {
  CHAT_PROVIDER,
  getProvider,
  type ChatSession,
  type ProviderDef,
  type ProviderId,
  type ProviderSession
} from '../shared/providers'

const TWITCH_PUBLIC_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'

async function twitchCookies(partition: string): Promise<{ token?: string; username?: string }> {
  const cookies = await session.fromPartition(partition).cookies.get({})
  return {
    token: cookies.find((cookie) => cookie.name === 'auth-token')?.value,
    username: cookies.find((cookie) => cookie.name === 'auth-user')?.value
  }
}

async function detectTwitch(def: ProviderDef): Promise<ProviderSession> {
  const base: ProviderSession = { providerId: def.id, loggedIn: false }
  const { token } = await twitchCookies(def.partition)

  if (!token) return base

  const fallbackUsername = (await twitchCookies(def.partition)).username

  try {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-ID': TWITCH_PUBLIC_CLIENT_ID
      }
    })

    if (response.ok) {
      const payload = (await response.json()) as {
        data: Array<{ display_name: string; profile_image_url: string }>
      }
      const user = payload.data[0]
      if (user) {
        return {
          providerId: def.id,
          loggedIn: true,
          username: user.display_name,
          avatarUrl: user.profile_image_url
        }
      }
    }
  } catch {
    // API best-effort; fall through to cookie-only session
  }

  return {
    providerId: def.id,
    loggedIn: true,
    username: fallbackUsername
  }
}

const DETECTORS: Record<ProviderId, (def: ProviderDef) => Promise<ProviderSession>> = {
  twitch: detectTwitch
}

export async function detectSession(id: ProviderId): Promise<ProviderSession> {
  const def = getProvider(id)
  if (!def) throw new Error(`Unknown provider: ${id}`)

  const detect = DETECTORS[id]
  if (!detect) return { providerId: id, loggedIn: false }

  try {
    return await detect(def)
  } catch {
    return { providerId: id, loggedIn: false }
  }
}

export async function detectAllSessions(): Promise<ProviderSession[]> {
  const defs = Object.keys(DETECTORS) as ProviderId[]
  return Promise.all(defs.map((id) => detectSession(id)))
}

export async function logoutProvider(id: ProviderId): Promise<void> {
  const def = getProvider(id)
  if (!def) throw new Error(`Unknown provider: ${id}`)
  await session.fromPartition(def.partition).clearStorageData()
}

export async function detectChat(): Promise<ChatSession> {
  const { token } = await twitchCookies(CHAT_PROVIDER.partition)
  if (!token) return { loggedIn: false }

  const fallbackUsername = (await twitchCookies(CHAT_PROVIDER.partition)).username

  try {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-ID': TWITCH_PUBLIC_CLIENT_ID
      }
    })

    if (response.ok) {
      const payload = (await response.json()) as {
        data: Array<{ display_name: string; profile_image_url: string }>
      }
      const user = payload.data[0]
      if (user) {
        return {
          loggedIn: true,
          username: user.display_name,
          avatarUrl: user.profile_image_url,
          token
        }
      }
    }
  } catch {
    // API best-effort; fall through to cookie-only session
  }

  return { loggedIn: true, username: fallbackUsername, token }
}

export async function logoutChat(): Promise<void> {
  await session.fromPartition(CHAT_PROVIDER.partition).clearStorageData()
}

export function registerSessionHandlers(): void {
  ipcMain.handle('sessions:list', () => detectAllSessions())
  ipcMain.handle('sessions:detect', (_event, id: ProviderId) => detectSession(id))
  ipcMain.handle('sessions:logout', (_event, id: ProviderId) => logoutProvider(id))
  ipcMain.handle('sessions:chat:detect', () => detectChat())
  ipcMain.handle('sessions:chat:logout', () => logoutChat())
}

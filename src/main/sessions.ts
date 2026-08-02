import { ipcMain, session } from 'electron'
import {
  getProvider,
  type ProviderDef,
  type ProviderId,
  type ProviderSession
} from '../shared/providers'

const TWITCH_PUBLIC_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'

async function detectTwitch(def: ProviderDef): Promise<ProviderSession> {
  const base: ProviderSession = { providerId: def.id, loggedIn: false }
  const cookies = await session.fromPartition(def.partition).cookies.get({})
  const token = cookies.find((cookie) => cookie.name === 'auth-token')?.value

  if (!token) return base

  const fallbackUsername = cookies.find((cookie) => cookie.name === 'auth-user')?.value

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

export function registerSessionHandlers(): void {
  ipcMain.handle('sessions:list', () => detectAllSessions())
  ipcMain.handle('sessions:detect', (_event, id: ProviderId) => detectSession(id))
  ipcMain.handle('sessions:logout', (_event, id: ProviderId) => logoutProvider(id))
}

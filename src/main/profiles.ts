import { app, ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { getProvider, type ProviderId } from '../shared/providers'
import {
  defaultChatLayout,
  defaultStreamLayout,
  type ChatConfig,
  type ProfilesStore,
  type StreamConfig,
  type StreamLayout,
  type StreamProfile
} from '../shared/streams'

function profilesFilePath(): string {
  return join(app.getPath('userData'), 'profiles.json')
}

function legacyStreamsFilePath(): string {
  return join(app.getPath('userData'), 'streams.json')
}

function loadProfiles(): ProfilesStore {
  try {
    const raw = readFileSync(profilesFilePath(), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as ProfilesStore).profiles) &&
      typeof (parsed as ProfilesStore).activeProfileId === 'string'
    ) {
      const store = parsed as ProfilesStore
      let changed = false
      const normalized = store.profiles.map((profile) => {
        const streams = Array.isArray(profile.streams) ? profile.streams : []
        const chats = Array.isArray(profile.chats) ? profile.chats : []
        if (streams !== profile.streams || chats !== profile.chats) changed = true
        return { ...profile, streams, chats }
      })
      if (changed) saveProfiles({ ...store, profiles: normalized })
      return { ...store, profiles: normalized }
    }
  } catch {
    // fall through to migration / default
  }
  return migrate()
}

function migrate(): ProfilesStore {
  const legacy: ProfilesStore = { activeProfileId: '', profiles: [] }

  try {
    if (existsSync(legacyStreamsFilePath())) {
      const raw = readFileSync(legacyStreamsFilePath(), 'utf-8')
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const migrated = parsed as StreamConfig[]
        if (migrated.length > 0) {
          legacy.profiles.push({
            id: randomUUID(),
            name: 'Default',
            streams: migrated,
            chats: []
          })
        }
      }
    }
  } catch {
    // ignore migration errors; start fresh
  }

  return legacy
}

function saveProfiles(store: ProfilesStore): void {
  writeFileSync(profilesFilePath(), JSON.stringify(store, null, 2), 'utf-8')
}

export function listProfiles(): ProfilesStore {
  return loadProfiles()
}

export function createProfile(name: string): ProfilesStore {
  const store = loadProfiles()
  const profile: StreamProfile = {
    id: randomUUID(),
    name: name.trim() || 'Nuevo perfil',
    streams: [],
    chats: []
  }
  store.profiles.push(profile)
  store.activeProfileId = profile.id
  saveProfiles(store)
  return store
}

export function renameProfile(id: string, name: string): ProfilesStore {
  const store = loadProfiles()
  const clean = name.trim()
  store.profiles = store.profiles.map((p) => (p.id === id && clean ? { ...p, name: clean } : p))
  saveProfiles(store)
  return store
}

export function removeProfile(id: string): ProfilesStore {
  const store = loadProfiles()
  const remaining = store.profiles.filter((p) => p.id !== id)
  let activeId = store.activeProfileId
  if (activeId === id) {
    activeId = remaining.length > 0 ? remaining[0].id : ''
  }
  store.profiles = remaining
  store.activeProfileId = activeId
  saveProfiles(store)
  return store
}

export function setActiveProfile(id: string): ProfilesStore {
  const store = loadProfiles()
  if (store.profiles.some((p) => p.id === id)) {
    store.activeProfileId = id
    saveProfiles(store)
  }
  return store
}

function activeProfile(store: ProfilesStore): StreamProfile {
  const active =
    store.profiles.find((p) => p.id === store.activeProfileId) ?? store.profiles[0] ?? null
  if (!active) {
    return { id: '', name: '', streams: [], chats: [] }
  }
  return active
}

function updateActiveProfile(updater: (profile: StreamProfile) => StreamProfile): void {
  const next = loadProfiles()
  const active = activeProfile(next)
  if (!active.id) return
  next.profiles = next.profiles.map((p) => (p.id === active.id ? updater(p) : p))
  saveProfiles(next)
}

function ensureActiveProfile(): StreamProfile {
  const store = loadProfiles()
  const active = activeProfile(store)
  if (active.id) return active

  const profile: StreamProfile = {
    id: randomUUID(),
    name: 'Default',
    streams: [],
    chats: []
  }
  store.profiles.push(profile)
  store.activeProfileId = profile.id
  saveProfiles(store)
  return profile
}

export function addStream(input: { providerId: ProviderId; channel: string }): StreamConfig[] {
  if (!getProvider(input.providerId)) throw new Error(`Unknown provider: ${input.providerId}`)

  const channel = input.channel.trim()
  if (!channel) throw new Error('Channel name cannot be empty')

  const profile = ensureActiveProfile()
  const nextStreams = [...profile.streams]
  nextStreams.push({
    id: randomUUID(),
    providerId: input.providerId,
    channel,
    layout: defaultStreamLayout(nextStreams)
  })

  const store = loadProfiles()
  store.profiles = store.profiles.map((p) =>
    p.id === profile.id ? { ...p, streams: nextStreams } : p
  )
  saveProfiles(store)
  return nextStreams
}

export function updateStreamLayout(id: string, layout: StreamLayout): StreamConfig[] {
  let result: StreamConfig[] = []
  updateActiveProfile((profile) => {
    const nextStreams = profile.streams.map((stream) =>
      stream.id === id ? { ...stream, layout } : stream
    )
    result = nextStreams
    return { ...profile, streams: nextStreams }
  })
  return result
}

export function removeStream(id: string): StreamConfig[] {
  let result: StreamConfig[] = []
  updateActiveProfile((profile) => {
    const nextStreams = profile.streams.filter((stream) => stream.id !== id)
    result = nextStreams
    return { ...profile, streams: nextStreams }
  })
  return result
}

export function addChat(): ChatConfig[] {
  let result: ChatConfig[] = []
  updateActiveProfile((profile) => {
    const nextChats = [...profile.chats]
    if (nextChats.length === 0) {
      nextChats.push({ id: randomUUID(), layout: defaultChatLayout() })
    }
    result = nextChats
    return { ...profile, chats: nextChats }
  })
  return result
}

export function removeChat(id: string): ChatConfig[] {
  let result: ChatConfig[] = []
  updateActiveProfile((profile) => {
    const nextChats = profile.chats.filter((chat) => chat.id !== id)
    result = nextChats
    return { ...profile, chats: nextChats }
  })
  return result
}

export function updateChatLayout(id: string, layout: StreamLayout): ChatConfig[] {
  let result: ChatConfig[] = []
  updateActiveProfile((profile) => {
    const nextChats = profile.chats.map((chat) => (chat.id === id ? { ...chat, layout } : chat))
    result = nextChats
    return { ...profile, chats: nextChats }
  })
  return result
}

export function registerProfileHandlers(): void {
  ipcMain.handle('profiles:list', () => listProfiles())
  ipcMain.handle('profiles:create', (_event, name: string) => createProfile(name))
  ipcMain.handle('profiles:rename', (_event, id: string, name: string) => renameProfile(id, name))
  ipcMain.handle('profiles:remove', (_event, id: string) => removeProfile(id))
  ipcMain.handle('profiles:setActive', (_event, id: string) => setActiveProfile(id))
  ipcMain.handle('streams:add', (_event, input: { providerId: ProviderId; channel: string }) =>
    addStream(input)
  )
  ipcMain.handle('streams:remove', (_event, id: string) => removeStream(id))
  ipcMain.handle('streams:updateLayout', (_event, id: string, layout: StreamLayout) =>
    updateStreamLayout(id, layout)
  )
  ipcMain.handle('chats:add', () => addChat())
  ipcMain.handle('chats:remove', (_event, id: string) => removeChat(id))
  ipcMain.handle('chats:updateLayout', (_event, id: string, layout: StreamLayout) =>
    updateChatLayout(id, layout)
  )
}

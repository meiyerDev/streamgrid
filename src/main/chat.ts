import { BrowserWindow, ipcMain } from 'electron'
import { Client as IRCClient } from 'irc-framework'
import type { ChatChannel, ChatMessage, ChatStatus, ChatStatusPayload } from '../shared/chat'
import { PROVIDERS, type ProviderDef, type ProviderId } from '../shared/providers'

interface ProviderChat {
  desired: Map<string, ChatChannel>
  client: IRCClient | null
  status: ChatStatus
}

let mainWindow: BrowserWindow | null = null
const chats = new Map<ProviderId, ProviderChat>()

function normalize(channel: string): string {
  return channel.replace(/^#/, '').toLowerCase()
}

function providerChat(def: ProviderDef): ProviderChat {
  let chat = chats.get(def.id)
  if (!chat) {
    chat = { desired: new Map(), client: null, status: 'idle' }
    chats.set(def.id, chat)
  }
  return chat
}

function send(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload)
  }
}

function emitStatus(def: ProviderDef, chat: ProviderChat, status: ChatStatus): void {
  if (chat.status === status) return
  chat.status = status
  send('chat:status', { providerId: def.id, status } satisfies ChatStatusPayload)
}

function buildClient(def: ProviderDef): IRCClient {
  const anonymous = def.id === 'twitch'
  return new IRCClient({
    host: def.irc?.host ?? 'irc.twitch.tv',
    port: def.irc?.port ?? 6697,
    tls: def.irc?.tls ?? true,
    nick: anonymous ? `justinfan${Math.floor(Math.random() * 90000) + 10000}` : 'streamgrid-viewer',
    username: anonymous ? 'justinfan' : 'streamgrid-viewer',
    password: anonymous ? 'SCHMOOPIIE' : undefined,
    auto_reconnect: true,
    auto_rejoin: false
  })
}

function connectProvider(def: ProviderDef, chat: ProviderChat): void {
  if (chat.client) return

  const client = buildClient(def)
  chat.client = client
  emitStatus(def, chat, 'connecting')

  client.on('registered', () => {
    for (const key of chat.desired.keys()) {
      client.join(`#${key}`)
    }
    emitStatus(def, chat, 'connected')
  })

  client.on('privmsg', (event) => {
    const desired = chat.desired.get(normalize(event.target))
    if (!desired) return
    const message: ChatMessage = {
      channel: desired.channel,
      username: event.nick,
      message: event.message,
      timestamp: Date.now()
    }
    send('chat:message', message)
  })

  client.on('close', () => {
    chat.client = null
    emitStatus(def, chat, 'disconnected')
  })

  client.connect()
}

function stopProvider(def: ProviderDef, chat: ProviderChat): void {
  const client = chat.client
  chat.client = null
  if (client) {
    try {
      client.quit()
    } catch {
      // already disconnected
    }
  }
  chat.desired.clear()
  emitStatus(def, chat, 'idle')
}

function syncChat(channels: ChatChannel[]): void {
  const byProvider = new Map<ProviderId, ChatChannel[]>()
  for (const channel of channels) {
    const list = byProvider.get(channel.providerId) ?? []
    list.push(channel)
    byProvider.set(channel.providerId, list)
  }

  for (const def of PROVIDERS) {
    if (!def.irc) continue
    const list = byProvider.get(def.id) ?? []
    const next = new Map(list.map((c) => [normalize(c.channel), c]))
    const chat = providerChat(def)

    if (next.size === 0) {
      if (chat.client || chat.desired.size > 0) stopProvider(def, chat)
      continue
    }

    if (!chat.client) connectProvider(def, chat)

    for (const key of chat.desired.keys()) {
      if (!next.has(key)) {
        chat.desired.delete(key)
        chat.client?.part(`#${key}`)
      }
    }
    for (const [key, config] of next) {
      if (!chat.desired.has(key)) {
        chat.desired.set(key, config)
        chat.client?.join(`#${key}`)
      }
    }
  }
}

export function attachChatManager(win: BrowserWindow): void {
  mainWindow = win
  win.on('close', () => {
    for (const def of PROVIDERS) {
      const chat = chats.get(def.id)
      if (chat) stopProvider(def, chat)
    }
    mainWindow = null
  })
}

export function registerChatHandlers(): void {
  ipcMain.handle('chat:setChannels', (_event, channels: ChatChannel[]) => syncChat(channels))
}

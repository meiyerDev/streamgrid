import { BrowserWindow, ipcMain } from 'electron'
import { Client as IRCClient } from 'irc-framework'
import type {
  ChatChannel,
  ChatMessage,
  ChatSendInput,
  ChatSendResult,
  ChatStatus,
  ChatStatusPayload
} from '../shared/chat'
import { CHAT_MSG_MAX_LENGTH } from '../shared/chat'
import { getProvider, PROVIDERS, type ProviderDef, type ProviderId } from '../shared/providers'
import { getChatCredentials, invalidateChatSession, onChatTokenChange } from './chat-auth'

interface ProviderChat {
  desired: Map<string, ChatChannel>
  client: IRCClient | null
  status: ChatStatus
  reconnectAttempts: number
  reconnectTimer: NodeJS.Timeout | null
  oauth?: string
  username?: string
  authFailed?: boolean
}

const MAX_RECONNECT_ATTEMPTS = 10

let mainWindow: BrowserWindow | null = null
const chats = new Map<ProviderId, ProviderChat>()
let activeChannels: ChatChannel[] = []

function log(message: string): void {
  console.log(`[chat] ${Date.now()} ${message}`)
}

function normalize(channel: string): string {
  return channel.replace(/^#/, '').toLowerCase()
}

function providerChat(def: ProviderDef): ProviderChat {
  let chat = chats.get(def.id)
  if (!chat) {
    chat = {
      desired: new Map(),
      client: null,
      status: 'idle',
      reconnectAttempts: 0,
      reconnectTimer: null
    }
    chats.set(def.id, chat)
  }
  return chat
}

function scheduleReconnect(def: ProviderDef, chat: ProviderChat): void {
  if (chat.reconnectTimer) return
  if (chat.desired.size === 0) return
  if (chat.authFailed) {
    chat.authFailed = false
    log(`RECONNECT-GIVE-UP provider=${def.id} reason=auth-invalida`)
    invalidateChatSession()
    if (activeChannels.some((c) => c.providerId === def.id)) syncChat(activeChannels)
    return
  }
  if (chat.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    log(`RECONNECT-GIVE-UP provider=${def.id} attempts=${chat.reconnectAttempts}`)
    return
  }
  chat.reconnectAttempts += 1
  const backoff =
    Math.min(30000, 5000 * 2 ** (chat.reconnectAttempts - 1)) + Math.floor(Math.random() * 1000)
  log(
    `RECONNECT-SCHEDULE provider=${def.id} attempt=${chat.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} wait=${backoff}ms`
  )
  chat.reconnectTimer = setTimeout(() => {
    chat.reconnectTimer = null
    if (activeChannels.some((c) => c.providerId === def.id)) {
      log(`RECONNECT-FIRE provider=${def.id} attempt=${chat.reconnectAttempts}`)
      syncChat(activeChannels)
    }
  }, backoff)
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

function buildClient(
  def: ProviderDef,
  creds: { username: string; oauth: string } | null
): IRCClient {
  return new IRCClient({
    host: def.irc?.host ?? 'irc.twitch.tv',
    port: def.irc?.port ?? 6697,
    tls: def.irc?.tls ?? true,
    nick: creds?.username ?? `justinfan${Math.floor(Math.random() * 90000) + 10000}`,
    username: creds?.username ?? 'justinfan',
    password: creds ? creds.oauth : 'SCHMOOPIIE',
    auto_reconnect: true,
    auto_rejoin: false
  })
}

function connectProvider(def: ProviderDef, chat: ProviderChat): void {
  if (chat.client) return

  const creds = def.id === 'twitch' ? getChatCredentials() : null
  chat.oauth = creds?.oauth
  chat.username = creds?.username
  chat.authFailed = false
  log(`CONNECT provider=${def.id} mode=${creds ? 'authed' : 'anon'}`)

  const client = buildClient(def, creds)
  chat.client = client
  if (chat.reconnectTimer) {
    clearTimeout(chat.reconnectTimer)
    chat.reconnectTimer = null
  }
  emitStatus(def, chat, 'connecting')

  client.on('connecting', () => {
    log(`CONNECTING provider=${def.id}`)
  })

  client.on('socket connected', () => {
    log(`SOCKET-CONNECTED provider=${def.id}`)
  })

  client.on('socket error', (error) => {
    log(`SOCKET-ERROR provider=${def.id} err=${String(error)}`)
  })

  client.on('socket close', (error) => {
    log(`SOCKET-CLOSE provider=${def.id} err=${error ? String(error) : 'none'}`)
  })

  client.on('reconnecting', (event) => {
    log(
      `RECONNECT provider=${def.id} attempt=${event.attempt}/${event.max_retries} wait=${event.wait}ms`
    )
  })

  client.on('ping timeout', () => {
    log(`PING-TIMEOUT provider=${def.id}`)
  })

  client.on('debug', (out) => {
    log(`[irc] ${out}`)
  })

  client.on('notice', (event) => {
    log(`NOTICE provider=${def.id} target=${event.target} msg=${event.message}`)
    if (event.message.includes('Login unsuccessful')) {
      log(`AUTH-FAILED provider=${def.id}`)
      chat.authFailed = true
    }
  })

  client.on('irc error', (event) => {
    log(`IRC-ERROR provider=${def.id} error=${event.error} reason=${event.reason}`)
  })

  client.on('registered', () => {
    chat.reconnectAttempts = 0
    chat.authFailed = false
    log(`REGISTERED provider=${def.id} channels=${chat.desired.size}`)
    for (const key of chat.desired.keys()) {
      client.join(`#${key}`)
    }
    emitStatus(def, chat, 'connected')
  })

  client.on('privmsg', (event) => {
    const desired = chat.desired.get(normalize(event.target))
    if (!desired) return
    if (event.nick === chat.username) {
      log(`SEND-ECHO channel=#${normalize(event.target)}`)
    }
    const message: ChatMessage = {
      channel: desired.channel,
      username: event.nick,
      message: event.message,
      timestamp: Date.now()
    }
    send('chat:message', message)
  })

  client.on('close', (hadError) => {
    log(`CLOSE provider=${def.id} error=${hadError} channels=${chat.desired.size}`)
    chat.client = null
    emitStatus(def, chat, 'disconnected')
    scheduleReconnect(def, chat)
  })

  client.connect()
}

function stopProvider(def: ProviderDef, chat: ProviderChat): void {
  if (chat.reconnectTimer) {
    clearTimeout(chat.reconnectTimer)
    chat.reconnectTimer = null
  }
  chat.reconnectAttempts = 0
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
  activeChannels = channels
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

function refreshAuthConnections(): void {
  for (const def of PROVIDERS) {
    if (!def.irc) continue
    const chat = chats.get(def.id)
    if (!chat?.client) continue
    const creds = def.id === 'twitch' ? getChatCredentials() : null
    if (chat.oauth === creds?.oauth) continue
    stopProvider(def, chat)
    if (activeChannels.some((c) => c.providerId === def.id)) syncChat(activeChannels)
  }
}

function whenRegistered(chat: ProviderChat): Promise<IRCClient | null> {
  const client = chat.client
  if (!client) return Promise.resolve(null)
  if (chat.status === 'connected') return Promise.resolve(client)
  return new Promise((resolve) => {
    const onRegistered = (): void => {
      client.off('registered', onRegistered)
      resolve(client)
    }
    const onClose = (): void => {
      client.off('registered', onRegistered)
      resolve(null)
    }
    client.on('registered', onRegistered)
    client.on('close', onClose)
  })
}

async function sendMessage(input: ChatSendInput): Promise<ChatSendResult> {
  const channel = typeof input?.channel === 'string' ? input.channel.trim() : ''
  const raw = typeof input?.message === 'string' ? input.message : ''
  const message = raw.replace(/\s+/g, ' ').trim()
  if (!channel || !message) {
    log('SEND-REJECT reason=vacio')
    return { ok: false, error: 'Mensaje vacío' }
  }
  if (message.length > CHAT_MSG_MAX_LENGTH) {
    log('SEND-REJECT reason=muy-largo')
    return { ok: false, error: `El mensaje supera los ${CHAT_MSG_MAX_LENGTH} caracteres` }
  }

  const def = getProvider('twitch')
  if (!def || !def.irc) {
    log('SEND-REJECT reason=proveedor')
    return { ok: false, error: 'Proveedor no disponible' }
  }

  const key = normalize(channel)
  const chat = providerChat(def)
  if (!chat.desired.has(key)) {
    log(`SEND-REJECT reason=canal-inactivo channel=#${key}`)
    return { ok: false, error: 'El canal no está activo en el mosaico' }
  }

  log(`SEND-REQUEST channel=#${key} len=${message.length}`)

  const creds = getChatCredentials()
  if (!creds) {
    log('SEND-REJECT reason=no-token')
    return { ok: false, error: 'Conecta tu cuenta de Twitch Chat para enviar mensajes' }
  }

  if (!chat.client || chat.oauth !== creds.oauth) {
    log(`SEND-RECONNECT channel=#${key}`)
    stopProvider(def, chat)
    if (activeChannels.some((c) => c.providerId === def.id)) syncChat(activeChannels)
  }

  const client = await whenRegistered(chat)
  if (!client) {
    log('SEND-FAIL reason=no-conectado')
    return { ok: false, error: 'El chat aún no está conectado' }
  }
  client.say(`#${key}`, message)
  log(`SEND-OK channel=#${key} len=${message.length}`)
  send('chat:message', {
    channel,
    username: creds.username,
    message,
    timestamp: Date.now()
  } satisfies ChatMessage)
  return { ok: true }
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
  ipcMain.handle('chat:sendMessage', (_event, input: ChatSendInput) => sendMessage(input))
  onChatTokenChange(refreshAuthConnections)
}

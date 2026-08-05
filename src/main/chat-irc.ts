import { BrowserWindow, ipcMain } from 'electron'
import type { ChatSession } from '../shared/providers'
import type { ChatMessage, ChatStatus } from '../shared/views'
import { detectChat } from './sessions'

const IRC_URL = 'wss://irc-ws.chat.twitch.tv:443'
const SEND_LIMIT_WINDOW_MS = 30_000
const SEND_LIMIT_COUNT = 20

type Status = ChatStatus

let socket: WebSocket | null = null
let session: ChatSession = { loggedIn: false }
let channels = new Set<string>()
let connected = false
let manualClose = false
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const sendTimestamps: number[] = []

function emit<T>(channel: string, payload: T): void {
  const win = BrowserWindow.getAllWindows()[0]
  win?.webContents.send(channel, payload)
}

function emitMessage(message: ChatMessage): void {
  emit('chat:message', message)
}

function emitStatus(status: Status): void {
  emit('chat:status', status)
}

function nick(): string {
  return session.username
    ? session.username.toLowerCase()
    : `justinfan${Math.floor(Math.random() * 100000)}`
}

function isAuthorized(): boolean {
  return Boolean(session.token)
}

function parseTags(raw: string): Record<string, string> {
  const tags: Record<string, string> = {}
  if (!raw) return tags
  for (const entry of raw.split(';')) {
    const idx = entry.indexOf('=')
    if (idx === -1) continue
    tags[entry.slice(0, idx)] = entry.slice(idx + 1)
  }
  return tags
}

function handleLine(line: string): void {
  if (line.startsWith('PING')) {
    socket?.send('PONG :tmi.twitch.tv')
    return
  }

  const match = line.match(/^(?:@([^\s]+)\s)?:([^!\s]+)(?:![^\s]+)?\s+PRIVMSG\s+#([^\s]+)\s+:(.*)$/)
  if (!match) return

  const [, rawTags, user, channel, message] = match

  const tags = parseTags(rawTags || '')

  emitMessage({
    channel,
    user,
    color: tags['color'] || undefined,
    message
  })
}

function sendRaw(line: string): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  socket.send(line)
}

function joinChannels(): void {
  if (channels.size === 0) return
  const list = [...channels].map((channel) => `#${channel}`).join(' ')
  sendRaw(`JOIN ${list}`)
}

function openSocket(): void {
  manualClose = false
  const ws = new WebSocket(IRC_URL)
  socket = ws

  ws.addEventListener('open', () => {
    reconnectAttempts = 0
    sendRaw('CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands')
    sendRaw(isAuthorized() ? `PASS oauth:${session.token}` : 'PASS SCHMOOPIIE')
    sendRaw(`NICK ${nick()}`)
    joinChannels()
    connected = true
    emitStatus({ kind: 'connected', authorized: isAuthorized() })
  })

  ws.addEventListener('message', (event) => {
    const data = typeof event.data === 'string' ? event.data : ''
    for (const line of data.split('\r\n')) {
      if (line.trim()) handleLine(line)
    }
  })

  ws.addEventListener('close', () => {
    connected = false
    socket = null
    if (manualClose) {
      emitStatus({ kind: 'disconnected' })
      return
    }
    const delay = Math.min(30_000, 1000 * 2 ** reconnectAttempts)
    reconnectAttempts += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      openSocket()
    }, delay)
  })

  ws.addEventListener('error', () => {
    emitStatus({ kind: 'error', message: 'No se pudo conectar al chat' })
  })
}

export async function chatConnect(): Promise<void> {
  session = await detectChat()
  channels = new Set<string>()
  if (socket) {
    socket.close()
    socket = null
  }
  openSocket()
}

export function chatDisconnect(): void {
  manualClose = true
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (socket) socket.close()
  socket = null
  channels = new Set<string>()
  connected = false
}

export function chatSetChannels(list: string[]): void {
  const next = new Set(list.map((channel) => channel.replace(/^#/, '')).filter(Boolean))
  const removed = [...channels].filter((channel) => !next.has(channel))
  const added = [...next].filter((channel) => !channels.has(channel))
  channels = next

  if (!connected || !socket) return
  if (removed.length > 0) sendRaw(`PART ${removed.map((c) => `#${c}`).join(' ')}`)
  if (added.length > 0) sendRaw(`JOIN ${added.map((c) => `#${c}`).join(' ')}`)
}

export function chatSend(channel: string, message: string): void {
  const trimmed = message.trim()
  if (!trimmed) return
  if (!connected || !isAuthorized()) return
  const now = Date.now()
  const windowStart = now - SEND_LIMIT_WINDOW_MS
  while (sendTimestamps.length > 0 && sendTimestamps[0] < windowStart) sendTimestamps.shift()
  if (sendTimestamps.length >= SEND_LIMIT_COUNT) return
  sendTimestamps.push(now)
  sendRaw(`PRIVMSG #${channel.replace(/^#/, '')} :${trimmed}`)
}

export function registerChatHandlers(): void {
  ipcMain.handle('chat:connect', () => chatConnect())
  ipcMain.handle('chat:disconnect', () => {
    chatDisconnect()
  })
  ipcMain.handle('chat:setChannels', (_event, channels: string[]) => chatSetChannels(channels))
  ipcMain.handle('chat:send', (_event, channel: string, message: string) =>
    chatSend(channel, message)
  )
}

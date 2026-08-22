import { app, BrowserWindow, ipcMain, safeStorage } from 'electron'
import { createServer, type Server } from 'https'
import type { IncomingMessage, ServerResponse } from 'http'
import { randomBytes } from 'crypto'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { TwitchChatStatus, AuthorizeTwitchResult } from '../shared/chat-auth'
import { ensureCert, registerCertificateTrust } from './chat-cert'

// App registrada en dev.twitch.tv con redirect URI https://localhost:6060
const TWITCH_CHAT_CLIENT_ID = 'wlxvt7l02mx8w6hnmubw8wc7uagzvj'
const REDIRECT_URI = 'https://localhost:6060'
const CHAT_SCOPE = 'chat:read chat:edit user:read:follows'
const IRC_SCOPES = ['chat:read', 'chat:edit']
const FOLLOWS_SCOPES = ['user:read:follows']
const PORT = 6060
const AUTH_TIMEOUT_MS = 5 * 60 * 1000

interface StoredSession {
  username: string
  userId: string
  accessTokenEnc: string
  scopes: string[]
  obtainedAt: number
  expiresIn: number
}

interface PendingAuth {
  state: string
  timer: NodeJS.Timeout
  resolve: (session: StoredSession) => void
  reject: (error: Error) => void
}

type TokenChangeListener = () => void
const tokenChangeListeners = new Set<TokenChangeListener>()

export function onChatTokenChange(listener: TokenChangeListener): () => void {
  tokenChangeListeners.add(listener)
  return () => tokenChangeListeners.delete(listener)
}

function notifyTokenChanged(): void {
  for (const listener of tokenChangeListeners) listener()
}

let server: Server | null = null
let authWindow: BrowserWindow | null = null
let pending: PendingAuth | null = null

function tokenFilePath(): string {
  return join(app.getPath('userData'), 'twitch-chat-token.json')
}

function readToken(): StoredSession | null {
  try {
    const raw = readFileSync(tokenFilePath(), 'utf-8')
    const parsed = JSON.parse(raw) as StoredSession
    if (!parsed || typeof parsed.accessTokenEnc !== 'string') return null
    safeStorage.decryptString(Buffer.from(parsed.accessTokenEnc, 'base64'))
    return parsed
  } catch {
    return null
  }
}

function writeToken(session: StoredSession): void {
  writeFileSync(tokenFilePath(), JSON.stringify(session, null, 2), 'utf-8')
}

function deleteToken(): void {
  if (existsSync(tokenFilePath())) unlinkSync(tokenFilePath())
}

function hasIrcScopes(session: StoredSession): boolean {
  return IRC_SCOPES.every((scope) => session.scopes?.includes(scope))
}

function statusFromSession(session: StoredSession): TwitchChatStatus {
  if (!hasIrcScopes(session)) {
    return { authenticated: false, error: 'Tu cuenta de Twitch Chat necesita volver a conectarse' }
  }
  const expired = Date.now() > session.obtainedAt + session.expiresIn * 1000
  if (expired)
    return { authenticated: false, error: 'El token de chat expiró, vuelve a conectarte' }
  return { authenticated: true, username: session.username }
}

export function getChatCredentials(): { username: string; oauth: string } | null {
  try {
    const session = readToken()
    if (!session) return null
    if (!hasIrcScopes(session)) return null
    if (Date.now() > session.obtainedAt + session.expiresIn * 1000) return null
    const token = safeStorage.decryptString(Buffer.from(session.accessTokenEnc, 'base64'))
    return { username: session.username, oauth: `oauth:${token}` }
  } catch {
    return null
  }
}

export function getStoredSession(): { username: string; userId: string; token: string } | null {
  try {
    const session = readToken()
    if (!session) return null
    if (!hasFollowsScopes(session)) return null
    if (Date.now() > session.obtainedAt + session.expiresIn * 1000) return null
    const token = safeStorage.decryptString(Buffer.from(session.accessTokenEnc, 'base64'))
    return { username: session.username, userId: session.userId, token }
  } catch {
    return null
  }
}

function hasFollowsScopes(session: StoredSession): boolean {
  return FOLLOWS_SCOPES.every((scope) => session.scopes?.includes(scope))
}

function getStatus(): TwitchChatStatus {
  const session = readToken()
  if (session) return statusFromSession(session)
  const storedError = pending
    ? { authenticated: false, error: 'Autenticación en curso…' }
    : undefined
  return storedError ?? { authenticated: false }
}

function respondHtml(res: ServerResponse, html: string): void {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
}

function respondJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

function readBody(req: IncomingMessage, cb: (body: string) => void): void {
  let data = ''
  let tooBig = false
  req.on('data', (chunk: Buffer) => {
    data += chunk.toString('utf-8')
    if (data.length > 16384) {
      tooBig = true
      data = ''
    }
  })
  req.on('end', () => cb(tooBig ? '' : data))
}

function settlePending(session: StoredSession): void {
  if (!pending) return
  clearTimeout(pending.timer)
  pending.resolve(session)
  pending = null
  closeAuthWindow()
  stopServer()
  notifyTokenChanged()
}

function failPending(error: Error): void {
  if (!pending) return
  clearTimeout(pending.timer)
  pending.reject(error)
  pending = null
  closeAuthWindow()
  stopServer()
}

function closeAuthWindow(): void {
  if (authWindow && !authWindow.isDestroyed()) authWindow.close()
  authWindow = null
}

function stopServer(): void {
  if (server) {
    server.close()
    server = null
  }
}

function ensureServer(): Promise<void> {
  if (server) return Promise.resolve()
  return ensureCert().then(
    ({ key, cert }) =>
      new Promise<void>((resolve, reject) => {
        const srv = createServer({ key, cert }, handleRequest)
        srv.once('error', (error) => {
          server = null
          reject(error)
        })
        srv.listen(PORT, '127.0.0.1', () => {
          server = srv
          console.log(`[chat-auth] ${Date.now()} SERVER-READY https://127.0.0.1:${PORT}`)
          resolve()
        })
      })
  )
}

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', `https://localhost:${PORT}`)

  const isCallbackPath = url.pathname === '/' || url.pathname === '/callback'

  if (req.method === 'GET' && isCallbackPath) {
    const error = url.searchParams.get('error')
    if (error) {
      respondHtml(res, errorPage(url.searchParams.get('error_description') ?? error))
      failPending(new Error(`Twitch rechazó la autorización: ${error}`))
      return
    }
    respondHtml(res, CALLBACK_PAGE)
    return
  }

  if (req.method === 'POST' && url.pathname === '/token') {
    readBody(req, (body) => handleTokenPost(body, res))
    return
  }

  res.writeHead(404).end()
}

function handleTokenPost(body: string, res: ServerResponse): void {
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(body) as Record<string, unknown>
  } catch {
    respondJson(res, 400, { ok: false })
    return
  }

  if (typeof payload.error === 'string') {
    respondJson(res, 200, { ok: false })
    const description =
      typeof payload.errorDescription === 'string' ? payload.errorDescription : payload.error
    failPending(new Error(description))
    return
  }

  const token = typeof payload.accessToken === 'string' ? payload.accessToken : ''
  const state = typeof payload.state === 'string' ? payload.state : ''

  if (!token || !pending || state !== pending.state) {
    respondJson(res, 400, { ok: false, error: 'state_mismatch' })
    return
  }

  fetchProfile(token)
    .then((profile) => {
      let accessTokenEnc: string
      try {
        accessTokenEnc = safeStorage.encryptString(token).toString('base64')
      } catch {
        respondJson(res, 200, { ok: false, error: 'crypto_unavailable' })
        failPending(new Error('El cifrado seguro de Electron no está disponible'))
        return
      }
      const session: StoredSession = {
        username: profile.login,
        userId: profile.userId,
        accessTokenEnc,
        scopes: profile.scopes,
        obtainedAt: Date.now(),
        expiresIn: profile.expiresIn
      }
      writeToken(session)
      respondJson(res, 200, { ok: true })
      settlePending(session)
    })
    .catch((error: unknown) => {
      respondJson(res, 200, { ok: false, error: 'token_invalido' })
      failPending(new Error(`No se pudo validar el token con Twitch: ${String(error)}`))
    })
}

interface TwitchProfile {
  login: string
  userId: string
  scopes: string[]
  expiresIn: number
}

async function fetchProfile(token: string): Promise<TwitchProfile> {
  const response = await fetch('https://id.twitch.tv/oauth2/validate', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const data = (await response.json()) as {
    login: string
    user_id: string
    scopes: string[]
    expires_in: number
  }
  return {
    login: data.login,
    userId: data.user_id,
    scopes: data.scopes,
    expiresIn: data.expires_in
  }
}

function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl)
    const redact = (params: URLSearchParams): URLSearchParams => {
      const next = new URLSearchParams(params)
      for (const key of ['access_token', 'id_token', 'code']) {
        if (next.has(key)) next.set(key, '[REDACTED]')
      }
      return next
    }
    url.search = redact(url.searchParams).toString()
    if (url.hash) url.hash = redact(new URLSearchParams(url.hash.slice(1))).toString()
    return url.toString()
  } catch {
    return rawUrl
  }
}

function shortLabel(rawUrl: string): string {
  try {
    const url = new URL(rawUrl)
    const path = url.pathname === '/' ? '' : url.pathname.slice(0, 40)
    return `${url.hostname}${path}`
  } catch {
    return rawUrl
  }
}

function logNav(tag: string, url?: string): void {
  console.log(`[chat-auth] ${Date.now()} ${tag}${url ? ' ' + sanitizeUrl(url) : ''}`)
}

function openAuthWindow(authorizeUrl: string): void {
  const win = new BrowserWindow({
    width: 480,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    title: 'Twitch Chat — abriendo…',
    webPreferences: { sandbox: true, partition: 'persist:twitch' }
  })
  authWindow = win

  const setTitle = (url?: string): void => {
    if (win.isDestroyed()) return
    win.setTitle(url ? `Twitch Chat — ${shortLabel(url)}` : 'Twitch Chat — abriendo…')
  }
  const wc = win.webContents

  wc.on('did-start-navigation', (_event, url, _isInPlace, isMainFrame) => {
    if (!isMainFrame) return
    logNav('START', url)
    setTitle(url)
  })
  wc.on('will-redirect', (_event, url) => {
    logNav('REDIRECT', url)
    setTitle(url)
  })
  wc.on('did-navigate', (_event, url) => {
    logNav('NAVIGATE', url)
    setTitle(url)
  })
  wc.on('did-navigate-in-page', (_event, url) => {
    logNav('IN-PAGE', url)
    setTitle(url)
  })
  wc.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.log(
      `[chat-auth] ${Date.now()} FAIL "${sanitizeUrl(validatedURL)}" code=${errorCode} ${errorDescription}`
    )
  })
  wc.on('did-stop-loading', () => {
    logNav('STOP', wc.getURL())
  })
  wc.on('console-message', (_event, _level, message) => {
    console.log(`[chat-auth][page] ${message}`)
  })

  win.once('ready-to-show', () => win.show())

  win.on('closed', () => {
    authWindow = null
    if (pending) {
      pending.reject(new Error('Autenticación cancelada'))
      pending = null
      stopServer()
    }
  })

  logNav('OPEN', authorizeUrl)
  void win.loadURL(authorizeUrl)
}

async function login(): Promise<TwitchChatStatus> {
  if (pending) return { authenticated: false, error: 'Ya hay una autenticación en curso' }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('El cifrado seguro de Electron no está disponible')
  }

  const state = randomBytes(16).toString('hex')
  const query = new URLSearchParams({
    response_type: 'token',
    client_id: TWITCH_CHAT_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: CHAT_SCOPE,
    state,
    force_verify: 'false'
  })
  const authorizeUrl = `https://id.twitch.tv/oauth2/authorize?${query.toString()}`

  const session = await new Promise<StoredSession>((resolve, reject) => {
    const timer = setTimeout(() => {
      failPending(new Error('La autenticación expiró'))
    }, AUTH_TIMEOUT_MS)
    pending = { state, timer, resolve, reject }
    ensureServer().then(
      () => openAuthWindow(authorizeUrl),
      (error: unknown) => {
        pending = null
        clearTimeout(timer)
        reject(
          new Error(
            `No se pudo iniciar el servidor local HTTPS en el puerto ${PORT}: ${String(error)}`
          )
        )
      }
    )
  })

  return statusFromSession(session)
}

async function authorizeTwitch(): Promise<AuthorizeTwitchResult> {
  try {
    const status = await login()
    if (status.authenticated && status.username) {
      return {
        success: true,
        cookiesSaved: true,
        username: status.username
      }
    }
    return {
      success: false,
      cookiesSaved: false,
      error: status.error ?? 'Error desconocido'
    }
  } catch (err) {
    return {
      success: false,
      cookiesSaved: false,
      error: err instanceof Error ? err.message : 'Error desconocido'
    }
  }
}

export function invalidateChatSession(): void {
  deleteToken()
  notifyTokenChanged()
}

async function logout(): Promise<void> {
  deleteToken()
  notifyTokenChanged()
  if (pending) failPending(new Error('Sesión cerrada'))
  stopServer()
}

const CALLBACK_PAGE = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Twitch Chat — Conexión</title>
<style>
  body { margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0a0d3a; color: #fff; font-family: system-ui, sans-serif; }
  #status { padding: 24px; border-radius: 16px; background: #1e2353; text-align: center; }
</style>
</head>
<body>
<div id="status">Conectando a Twitch…</div>
<script>
;(async () => {
  const status = document.getElementById('status')
  const params = new URLSearchParams(location.hash.slice(1))
  const token = params.get('access_token')
  if (!token) {
    status.textContent = 'No se recibió el token de Twitch. Puedes cerrar esta pestaña.'
    return
  }
  const res = await fetch('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: token, scopes: params.get('scope'), state: params.get('state') })
  })
  const ok = res.ok
  const body = res.ok ? null : await res.json().catch(() => null)
  status.textContent = ok
    ? '¡Conectado! Puedes cerrar esta pestaña.'
    : (body && body.error === 'crypto_unavailable'
        ? 'El cifrado seguro no está disponible en este sistema.'
        : 'Error al guardar el token. Cierra esta pestaña e inténtalo de nuevo.')
})()
</script>
</body>
</html>`

function errorPage(description: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Twitch Chat — Error</title>
<style>
  body { margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0a0d3a; color: #fff; font-family: system-ui, sans-serif; }
  div { padding: 24px; border-radius: 16px; background: #1e2353; text-align: center; }
</style>
</head>
<body>
<div>Autorización rechazada. ${description}</div>
</body>
</html>`
}

export function registerChatAuthHandlers(): void {
  registerCertificateTrust('localhost', 'persist:twitch')
  void ensureCert().catch((error: unknown) => {
    console.log(`[chat-auth] ${Date.now()} CERT-PREWARM-FAIL ${String(error)}`)
  })
  ipcMain.handle('chatAuth:getStatus', () => getStatus())
  ipcMain.handle('chatAuth:login', () => login())
  ipcMain.handle('chatAuth:logout', () => logout())
  ipcMain.handle('chatAuth:authorize', () => authorizeTwitch())
  app.on('will-quit', () => stopServer())
}

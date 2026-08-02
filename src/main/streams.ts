import { app, ipcMain } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { getProvider, type ProviderId } from '../shared/providers'
import { defaultStreamLayout, type StreamConfig, type StreamLayout } from '../shared/streams'

function streamsFilePath(): string {
  return join(app.getPath('userData'), 'streams.json')
}

function loadStreams(): StreamConfig[] {
  try {
    const raw = readFileSync(streamsFilePath(), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StreamConfig[]) : []
  } catch {
    return []
  }
}

function saveStreams(streams: StreamConfig[]): void {
  writeFileSync(streamsFilePath(), JSON.stringify(streams, null, 2), 'utf-8')
}

export function addStream(input: { providerId: ProviderId; channel: string }): StreamConfig[] {
  if (!getProvider(input.providerId)) throw new Error(`Unknown provider: ${input.providerId}`)

  const channel = input.channel.trim()
  if (!channel) throw new Error('Channel name cannot be empty')

  const streams = loadStreams()
  streams.push({
    id: randomUUID(),
    providerId: input.providerId,
    channel,
    layout: defaultStreamLayout(streams)
  })
  saveStreams(streams)
  return streams
}

export function updateStreamLayout(id: string, layout: StreamLayout): StreamConfig[] {
  const streams = loadStreams().map((stream) => (stream.id === id ? { ...stream, layout } : stream))
  saveStreams(streams)
  return streams
}

export function removeStream(id: string): StreamConfig[] {
  const streams = loadStreams().filter((stream) => stream.id !== id)
  saveStreams(streams)
  return streams
}

export function registerStreamHandlers(): void {
  ipcMain.handle('streams:list', () => loadStreams())
  ipcMain.handle('streams:add', (_event, input: { providerId: ProviderId; channel: string }) =>
    addStream(input)
  )
  ipcMain.handle('streams:remove', (_event, id: string) => removeStream(id))
  ipcMain.handle('streams:updateLayout', (_event, id: string, layout: StreamLayout) =>
    updateStreamLayout(id, layout)
  )
}

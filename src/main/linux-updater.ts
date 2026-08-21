import { spawn } from 'child_process'
import { access, constants } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { app } from 'electron'

export interface LinuxCheckResult {
  current: string
  latest: string | null
  updateAvailable: boolean
  asset?: string
  error?: string
}

function installRoot(): string {
  const xdg = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share')
  return process.env.STREAMGRID_INSTALL_ROOT || join(xdg, 'StreamGrid')
}

export function getLinuxUpdaterPath(): string {
  return join(installRoot(), 'updater')
}

export function isLinuxManagedInstall(): boolean {
  // Packaged app living under our install layout (…/StreamGrid/versions/x.y.z or …/current)
  const exe = app.getPath('exe')
  const root = installRoot()
  return exe.startsWith(root + '/') || exe.startsWith(root + '\\')
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, constants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function resolveLinuxUpdater(): Promise<string | null> {
  const candidates = [
    // Preferred: copy installed by streamgrid-updater itself
    getLinuxUpdaterPath(),
    // Packaged app: extraResources → resources/linux/streamgrid-updater
    join(process.resourcesPath, 'linux', 'streamgrid-updater'),
    // Dev: repo script
    join(app.getAppPath(), 'scripts', 'linux', 'streamgrid-updater'),
    join(process.cwd(), 'scripts', 'linux', 'streamgrid-updater')
  ]
  for (const c of candidates) {
    if (await pathExists(c)) return c
  }
  return null
}

function runUpdater(
  updaterPath: string,
  args: string[],
  opts?: { timeoutMs?: number }
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(updaterPath, args, {
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    const timer =
      opts?.timeoutMs != null
        ? setTimeout(() => {
            child.kill('SIGTERM')
            reject(new Error('linux updater timed out'))
          }, opts.timeoutMs)
        : null
    child.on('error', (err) => {
      if (timer) clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      if (timer) clearTimeout(timer)
      resolve({ code, stdout, stderr })
    })
  })
}

export async function linuxCheckForUpdate(): Promise<LinuxCheckResult> {
  const updater = await resolveLinuxUpdater()
  if (!updater) {
    return {
      current: app.getVersion(),
      latest: null,
      updateAvailable: false,
      error: 'linux updater not found'
    }
  }
  const { code, stdout, stderr } = await runUpdater(updater, ['check'], { timeoutMs: 60_000 })
  const line = stdout.trim().split('\n').filter(Boolean).pop()
  if (!line) {
    return {
      current: app.getVersion(),
      latest: null,
      updateAvailable: false,
      error: stderr.trim() || `updater check failed (exit ${code})`
    }
  }
  try {
    const parsed = JSON.parse(line) as LinuxCheckResult
    return parsed
  } catch {
    return {
      current: app.getVersion(),
      latest: null,
      updateAvailable: false,
      error: `invalid updater output: ${line}`
    }
  }
}

/** Detach updater update --relaunch and let the caller quit the app. */
export async function linuxQuitAndUpdate(): Promise<void> {
  const updater = await resolveLinuxUpdater()
  if (!updater) {
    throw new Error('linux updater not found')
  }
  const child = spawn(updater, ['update', '--relaunch'], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env }
  })
  child.unref()
}

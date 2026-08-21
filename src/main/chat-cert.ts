import { app, session } from 'electron'
import { X509Certificate } from 'crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { generate } from 'selfsigned'

const CERT_DIR = 'chat-auth'
const KEY_FILE = 'localhost-key.pem'
const CERT_FILE = 'localhost-cert.pem'

function certDir(): string {
  return join(app.getPath('userData'), CERT_DIR)
}

function fingerprintOf(certPem: string): string {
  return new X509Certificate(certPem).fingerprint256.replaceAll(':', '').toLowerCase()
}

function loadCert(): { key: string; cert: string } | null {
  try {
    const dir = certDir()
    const key = readFileSync(join(dir, KEY_FILE), 'utf-8')
    const cert = readFileSync(join(dir, CERT_FILE), 'utf-8')
    fingerprintOf(cert)
    return { key, cert }
  } catch {
    return null
  }
}

function persistCert(key: string, cert: string): void {
  const dir = certDir()
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, KEY_FILE), key)
  writeFileSync(join(dir, CERT_FILE), cert)
}

export async function ensureCert(): Promise<{ key: string; cert: string }> {
  const existing = loadCert()
  if (existing) return existing

  const result = await generate([{ name: 'commonName', value: 'localhost' }], {
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      { name: 'extKeyUsage', serverAuth: true },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '::1' }
        ]
      }
    ]
  })
  persistCert(result.private, result.cert)
  return { key: result.private, cert: result.cert }
}

function makeVerifyProc(host: string) {
  return (
    request: { hostname: string; certificate?: { data: string | Buffer } },
    callback: (n: number) => void
  ) => {
    if (request.hostname !== host) {
      callback(-3)
      return
    }
    const pinned = loadCert()
    let fingerprint: string | undefined
    try {
      fingerprint = request.certificate
        ? new X509Certificate(request.certificate.data).fingerprint256
            .replaceAll(':', '')
            .toLowerCase()
        : undefined
    } catch {
      fingerprint = undefined
    }
    if (pinned && fingerprint && fingerprint === fingerprintOf(pinned.cert)) {
      callback(0)
      return
    }
    callback(-3)
  }
}

export function registerCertificateTrust(host = 'localhost', partition?: string): void {
  const targetSession = partition ? session.fromPartition(partition) : session.defaultSession
  targetSession.setCertificateVerifyProc(makeVerifyProc(host))

  if (partition) {
    session.defaultSession.setCertificateVerifyProc(makeVerifyProc(host))
  }

  app.on('will-quit', () => {
    targetSession.setCertificateVerifyProc(null)
    if (partition) {
      session.defaultSession.setCertificateVerifyProc(null)
    }
  })
}

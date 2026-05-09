import type { AliyunOSSConfig } from '../storage/settings'
import type { ImageUploader, UploadParams } from './types'

export class AliyunOSSUploader implements ImageUploader {
  constructor(private config: AliyunOSSConfig) {}

  async upload({ base64, mimeType, notename, source }: UploadParams): Promise<string> {
    const ext = mimeToExt(mimeType)
    const now = new Date()
    const objectKey = buildObjectKey({ prefix: this.config.prefix, source, notename, date: now, ext })

    const bytes = base64ToBytes(base64)
    const ossDate = formatOssDate(now)
    const signature = await signOSS({
      method: 'PUT',
      contentType: mimeType,
      ossDate,
      bucket: this.config.bucket,
      objectKey,
      secretKey: this.config.accessKeySecret,
    })

    const encodedKey = objectKey.split('/').map(encodeURIComponent).join('/')
    const publicUrl = `https://${this.config.bucket}.${this.config.region}.aliyuncs.com/${encodedKey}`

    const resp = await fetch(publicUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'x-oss-date': ossDate,
        'Authorization': `OSS ${this.config.accessKeyId}:${signature}`,
      },
      body: bytes,
    })

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`OSS upload failed ${resp.status}: ${text}`)
    }

    return publicUrl
  }
}

export function buildObjectKey(params: {
  prefix: string
  source: string
  notename: string
  date: Date
  ext: string
}): string {
  const { prefix, source, notename, date, ext } = params
  const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
  const ts = formatTimestamp(date)
  const prefixSegments = normalizePrefix(prefix)
  const sourceSegment = safeObjectSegment(source) || 'unknown'
  const noteSegment = safeObjectSegment(notename) || 'untitled'
  return [...prefixSegments, sourceSegment, yyyymm, `${noteSegment}-${ts}.${ext}`].join('/')
}

export function formatTimestamp(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${p(d.getMilliseconds(), 3)}`
}

export function mimeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg',
    'image/png': 'png', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/svg+xml': 'svg',
  }
  return map[mimeType] ?? 'png'
}

async function signOSS(params: {
  method: string
  contentType: string
  ossDate: string
  bucket: string
  objectKey: string
  secretKey: string
}): Promise<string> {
  const canonicalizedOssHeaders = `x-oss-date:${params.ossDate}\n`
  const stringToSign = [
    params.method,
    '',
    params.contentType,
    '',
    `${canonicalizedOssHeaders}/${params.bucket}/${params.objectKey}`,
  ].join('\n')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(params.secretKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(stringToSign))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

function base64ToBytes(input: string): Uint8Array<ArrayBuffer> {
  const base64 = normalizeBase64(input)
  const binary = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function normalizeBase64(input: string): string {
  const dataUrlMatch = input.match(/^data:[^,]*;base64,(.*)$/is)
  const rawBase64 = dataUrlMatch ? dataUrlMatch[1] : input
  const standard = rawBase64.trim().replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const padding = standard.length % 4
  return padding === 0 ? standard : standard.padEnd(standard.length + 4 - padding, '=')
}

function formatOssDate(date: Date): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, '0')
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    'Z',
  ].join('')
}

function normalizePrefix(prefix: string): string[] {
  return prefix
    .split(/[\\/]+/)
    .map(safeObjectSegment)
    .filter(Boolean)
}

function safeObjectSegment(segment: string): string {
  const safeSegment = segment.trim().replace(/[\\/]+/g, '-')
  return safeSegment === '.' || safeSegment === '..' ? '_' : safeSegment
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AliyunOSSUploader, buildObjectKey, formatTimestamp, mimeToExt } from '../../src/uploader/aliyun'

const fixedDate = new Date('2026-05-09T14:30:22.583Z')

const config = {
  accessKeyId: 'access-key-id',
  accessKeySecret: 'access-key-secret',
  bucket: 'test-bucket',
  region: 'oss-cn-hangzhou',
  prefix: '/obsidian//clips/',
}

function mockCrypto() {
  vi.stubGlobal('crypto', {
    subtle: {
      importKey: vi.fn().mockResolvedValue('key'),
      sign: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
    },
  })
}

function mockFetch(ok = true, text = '') {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 403,
    text: vi.fn().mockResolvedValue(text),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(fixedDate)
  mockCrypto()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('formatTimestamp', () => {
  it('produces 17-char string YYYYMMDDHHmmssSSS', () => {
    const ts = formatTimestamp(fixedDate)
    expect(ts).toHaveLength(17)
    expect(ts).toMatch(/^\d{17}$/)
  })
})

describe('buildObjectKey', () => {
  it('constructs correct path with prefix', () => {
    const key = buildObjectKey({ prefix: 'obsidian', source: 'feishu', notename: '我的笔记', date: fixedDate, ext: 'png' })
    expect(key).toMatch(/^obsidian\/feishu\/\d{6}\/我的笔记-\d{17}\.png$/)
  })

  it('constructs correct path without prefix', () => {
    const key = buildObjectKey({ prefix: '', source: 'feishu', notename: '笔记', date: fixedDate, ext: 'jpg' })
    expect(key).toMatch(/^feishu\/\d{6}\/笔记-\d{17}\.jpg$/)
  })

  it('normalizes prefix, source, and notename path segments', () => {
    const key = buildObjectKey({
      prefix: '/obsidian//clips/',
      source: 'fei/shu',
      notename: '我的/笔记',
      date: fixedDate,
      ext: 'png',
    })

    expect(key).toMatch(/^obsidian\/clips\/fei-shu\/\d{6}\/我的-笔记-\d{17}\.png$/)
  })

  it('replaces dot path segments in prefix, source, and notename', () => {
    const key = buildObjectKey({
      prefix: './obsidian/../clips',
      source: '..',
      notename: '.',
      date: fixedDate,
      ext: 'png',
    })

    expect(key).toMatch(/^_\/obsidian\/_\/clips\/_\/\d{6}\/_-\d{17}\.png$/)
  })
})

describe('mimeToExt', () => {
  it('maps known mime types', () => {
    expect(mimeToExt('image/png')).toBe('png')
    expect(mimeToExt('image/jpeg')).toBe('jpg')
    expect(mimeToExt('image/webp')).toBe('webp')
    expect(mimeToExt('image/unknown')).toBe('png')
  })
})

describe('AliyunOSSUploader', () => {
  it('uploads data URLs with encoded request URL, PUT headers, and byte body', async () => {
    const fetchMock = mockFetch()
    const uploader = new AliyunOSSUploader(config)

    const url = await uploader.upload({
      base64: 'data:image/png;base64,aGVsbG8=',
      mimeType: 'image/png',
      notename: '我的/笔记',
      source: 'fei/shu',
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [requestUrl, init] = fetchMock.mock.calls[0]
    expect(requestUrl).toBe(url)
    expect(requestUrl).toMatch(
      /^https:\/\/test-bucket\.oss-cn-hangzhou\.aliyuncs\.com\/obsidian\/clips\/fei-shu\/\d{6}\/%E6%88%91%E7%9A%84-%E7%AC%94%E8%AE%B0-\d{17}\.png$/,
    )
    expect(init.method).toBe('PUT')
    expect(init.headers).toMatchObject({
      'Content-Type': 'image/png',
      'Date': fixedDate.toUTCString(),
      'Authorization': 'OSS access-key-id:AQID',
    })
    expect(Array.from(init.body)).toEqual([104, 101, 108, 108, 111])
  })

  it('uploads with dot segments encoded as safe literal names', async () => {
    const fetchMock = mockFetch()
    const uploader = new AliyunOSSUploader({ ...config, prefix: './obsidian/..' })

    const url = await uploader.upload({
      base64: 'aGVsbG8=',
      mimeType: 'image/png',
      notename: '..',
      source: '.',
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [requestUrl] = fetchMock.mock.calls[0]
    expect(requestUrl).toBe(url)
    expect(requestUrl).toMatch(/^https:\/\/test-bucket\.oss-cn-hangzhou\.aliyuncs\.com\/_\/obsidian\/_\/_\/\d{6}\/_-\d{17}\.png$/)
  })

  it('uploads URL-safe raw base64', async () => {
    const fetchMock = mockFetch()
    const uploader = new AliyunOSSUploader({ ...config, prefix: '' })

    await uploader.upload({
      base64: '-_8',
      mimeType: 'image/png',
      notename: 'bytes',
      source: 'feishu',
    })

    const [, init] = fetchMock.mock.calls[0]
    expect(Array.from(init.body)).toEqual([251, 255])
  })

  it('throws status and response text when upload fails', async () => {
    mockFetch(false, 'forbidden')
    const uploader = new AliyunOSSUploader(config)

    await expect(uploader.upload({
      base64: 'aGVsbG8=',
      mimeType: 'image/png',
      notename: '笔记',
      source: 'feishu',
    })).rejects.toThrow('OSS upload failed 403: forbidden')
  })
})

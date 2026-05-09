import { describe, it, expect } from 'vitest'
import { formatTimestamp, buildObjectKey, mimeToExt } from '../../src/uploader/aliyun'

describe('formatTimestamp', () => {
  it('produces 17-char string YYYYMMDDHHmmssSSS', () => {
    const d = new Date('2026-05-09T14:30:22.583Z')
    const ts = formatTimestamp(d)
    expect(ts).toHaveLength(17)
    expect(ts).toMatch(/^\d{17}$/)
  })
})

describe('buildObjectKey', () => {
  it('constructs correct path with prefix', () => {
    const d = new Date('2026-05-09T14:30:22.583Z')
    const key = buildObjectKey({ prefix: 'obsidian', source: 'feishu', notename: '我的笔记', date: d, ext: 'png' })
    expect(key).toMatch(/^obsidian\/feishu\/\d{6}\/我的笔记-\d{17}\.png$/)
  })

  it('constructs correct path without prefix', () => {
    const d = new Date('2026-05-09T14:30:22.583Z')
    const key = buildObjectKey({ prefix: '', source: 'feishu', notename: '笔记', date: d, ext: 'jpg' })
    expect(key).toMatch(/^feishu\/\d{6}\/笔记-\d{17}\.jpg$/)
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

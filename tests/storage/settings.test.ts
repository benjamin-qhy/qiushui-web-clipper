import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '../../src/storage/settings'

const mockStorage: Record<string, unknown> = {}

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k])
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
        set: vi.fn(async (obj: Record<string, unknown>) => {
          Object.assign(mockStorage, obj)
        }),
      },
    },
  })
})

describe('getSettings', () => {
  it('returns defaults when nothing stored', async () => {
    const s = await getSettings()
    expect(s.subDir).toBe('Clippings')
    expect(s.imageMode).toBe('local')
    expect(s.ossProvider).toBe('aliyun')
  })

  it('merges stored values over defaults', async () => {
    mockStorage['feishu-clipper-settings'] = { subDir: 'Notes', imageMode: 'oss' }
    const s = await getSettings()
    expect(s.subDir).toBe('Notes')
    expect(s.imageMode).toBe('oss')
    expect(s.aliyunOSS.region).toBe('oss-cn-hangzhou')
  })
})

describe('saveSettings', () => {
  it('persists settings to chrome.storage.local', async () => {
    const settings = { ...DEFAULT_SETTINGS, subDir: 'Archive' }
    await saveSettings(settings)
    const stored = mockStorage['feishu-clipper-settings'] as typeof settings
    expect(stored.subDir).toBe('Archive')
  })
})

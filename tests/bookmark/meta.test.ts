import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { tabsCreate, tabsGet, tabsRemove, addListener, removeListener, executeScript } = vi.hoisted(() => ({
  tabsCreate: vi.fn(),
  tabsGet: vi.fn(),
  tabsRemove: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  executeScript: vi.fn(),
}))

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      create: tabsCreate,
      get: tabsGet,
      remove: tabsRemove,
      onUpdated: {
        addListener,
        removeListener,
      },
    },
    scripting: {
      executeScript,
    },
  },
}))

import { buildMetaFromDom, fetchPageMeta } from '../../src/bookmark/meta'

beforeEach(() => {
  tabsCreate.mockResolvedValue({ id: 123 })
  tabsGet.mockResolvedValue({ status: 'complete' })
  tabsRemove.mockResolvedValue(undefined)
  executeScript.mockResolvedValue([{ result: { title: 'Loaded', keywords: '', description: '' } }])
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('buildMetaFromDom', () => {
  it('returns title, keywords, description', () => {
    const result = buildMetaFromDom('React 文档', 'react,hooks', '一个 JS 框架')
    expect(result).toEqual({
      title: 'React 文档',
      keywords: 'react,hooks',
      description: '一个 JS 框架',
    })
  })

  it('allows empty strings for missing meta', () => {
    const result = buildMetaFromDom('标题', '', '')
    expect(result.keywords).toBe('')
    expect(result.description).toBe('')
  })
})

describe('fetchPageMeta', () => {
  it('waits 30 seconds by default for a hidden tab to complete', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    await fetchPageMeta('https://example.com')

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 30000)
  })
})

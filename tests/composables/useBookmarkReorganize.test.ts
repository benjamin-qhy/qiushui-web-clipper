import { describe, it, expect } from 'vitest'
import { buildAnalyzePrompt, buildModifyPrompt, parseCategoryTree } from '../../src/composables/useBookmarkReorganize'
import type { CategoryNode } from '../../src/ai/chat-types'

describe('buildAnalyzePrompt', () => {
  it('includes bookmark titles and urls', () => {
    const bookmarks = [
      { title: 'GitHub', url: 'https://github.com' },
      { title: 'Vue', url: 'https://vuejs.org' },
    ]
    const prompt = buildAnalyzePrompt(bookmarks)
    expect(prompt).toContain('GitHub')
    expect(prompt).toContain('https://github.com')
    expect(prompt).toContain('Vue')
  })
})

describe('buildModifyPrompt', () => {
  it('includes current tree and user request', () => {
    const tree: CategoryNode[] = [{ name: '前端', children: [{ name: '框架' }] }]
    const prompt = buildModifyPrompt(tree, '把框架单独提出来')
    expect(prompt).toContain('前端')
    expect(prompt).toContain('框架')
    expect(prompt).toContain('把框架单独提出来')
  })
})

describe('parseCategoryTree', () => {
  it('parses valid JSON categories array', () => {
    const raw = JSON.stringify({ categories: [{ name: '前端', children: [{ name: '框架' }] }] })
    const tree = parseCategoryTree(raw)
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('前端')
    expect(tree[0].children).toHaveLength(1)
  })

  it('returns empty array on invalid JSON', () => {
    const tree = parseCategoryTree('not json')
    expect(tree).toEqual([])
  })

  it('returns empty array when categories key missing', () => {
    const tree = parseCategoryTree(JSON.stringify({ foo: 'bar' }))
    expect(tree).toEqual([])
  })
})

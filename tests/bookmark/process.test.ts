import { describe, it, expect } from 'vitest'
import { buildPrompt, parseAIResult, processBookmark } from '../../src/bookmark/process'
import type { AIProvider } from '../../src/ai/types'

describe('buildPrompt', () => {
  it('includes title, url, and content', () => {
    const prompt = buildPrompt('Vite', 'https://vitejs.dev', '构建工具')
    expect(prompt).toContain('Vite')
    expect(prompt).toContain('https://vitejs.dev')
    expect(prompt).toContain('构建工具')
  })

  it('truncates content to 2000 chars', () => {
    const long = 'a'.repeat(3000)
    const prompt = buildPrompt('T', 'https://t.com', long)
    expect(prompt).toContain('a'.repeat(2000))
    expect(prompt.split('a'.repeat(2001)).length).toBe(1)
  })
})

describe('parseAIResult', () => {
  it('parses valid JSON', () => {
    const raw = JSON.stringify({ summary: '摘要', tags: ['前端', '工具'], category: '技术工具' })
    const result = parseAIResult(raw)
    expect(result.summary).toBe('摘要')
    expect(result.tags).toEqual(['前端', '工具'])
    expect(result.category).toBe('技术工具')
  })

  it('falls back to defaults on invalid JSON', () => {
    const result = parseAIResult('not json at all')
    expect(result.summary).toBe('')
    expect(result.tags).toEqual([])
    expect(result.category).toBe('未分类')
  })

  it('falls back to 未分类 when category missing', () => {
    const result = parseAIResult(JSON.stringify({ summary: 's', tags: [] }))
    expect(result.category).toBe('未分类')
  })
})

describe('processBookmark', () => {
  it('calls AI provider and returns parsed result', async () => {
    const mockProvider: AIProvider = {
      async complete() {
        return JSON.stringify({ summary: 'AI摘要', tags: ['工具'], category: '技术工具' })
      },
      async testConnection() {},
    }
    const result = await processBookmark('Test', 'https://test.com', 'content', mockProvider)
    expect(result.summary).toBe('AI摘要')
    expect(result.category).toBe('技术工具')
    expect(result.tags).toEqual(['工具'])
  })
})

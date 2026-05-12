import { describe, it, expect } from 'vitest'
import { buildBookmarkEntry, buildCategoryFrontmatter, extractExistingUrls } from '../../src/bookmark/export'
import type { BookmarkRecord } from '../../src/storage/bookmarks'

const record: BookmarkRecord = {
  id: '1',
  url: 'https://vitejs.dev',
  title: 'Vite',
  summary: '快速前端构建工具',
  tags: ['前端', '构建'],
  category: '技术工具',
  processedAt: 1715000000000,
}

describe('buildBookmarkEntry', () => {
  it('formats title as markdown link', () => {
    expect(buildBookmarkEntry(record)).toContain('## [Vite](https://vitejs.dev)')
  })

  it('includes summary as blockquote', () => {
    expect(buildBookmarkEntry(record)).toContain('> 快速前端构建工具')
  })

  it('includes tags with hash prefix', () => {
    const entry = buildBookmarkEntry(record)
    expect(entry).toContain('#前端')
    expect(entry).toContain('#构建')
  })
})

describe('buildCategoryFrontmatter', () => {
  it('includes category in tags and as heading', () => {
    const fm = buildCategoryFrontmatter('技术工具', '2026-05-11')
    expect(fm).toContain('tags: [bookmarks, 技术工具]')
    expect(fm).toContain('updated: 2026-05-11')
    expect(fm).toContain('# 技术工具')
  })
})

describe('extractExistingUrls', () => {
  it('extracts URLs from markdown bookmark entries', () => {
    const content = '# 技术工具\n\n## [Vite](https://vitejs.dev)\n> summary\n'
    const urls = extractExistingUrls(content)
    expect(urls.has('https://vitejs.dev')).toBe(true)
  })

  it('extracts multiple URLs', () => {
    const content = '## [A](https://a.com)\n## [B](https://b.com)\n'
    const urls = extractExistingUrls(content)
    expect(urls.has('https://a.com')).toBe(true)
    expect(urls.has('https://b.com')).toBe(true)
  })

  it('returns empty set for empty content', () => {
    expect(extractExistingUrls('').size).toBe(0)
  })
})

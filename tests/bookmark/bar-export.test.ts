import { describe, expect, it } from 'vitest'
import {
  buildBookmarksBarMarkdown,
  findBookmarksBarNode,
  sanitizeMarkdownFilename,
  splitBookmarksBarForObsidian,
} from '../../src/bookmark/bar-export'
import type { BookmarkNode } from '../../src/composables/useBookmarkTree'

const bookmarksBar: BookmarkNode = {
  id: '1',
  title: '书签栏',
  children: [
    { id: '10', parentId: '1', title: 'Root Link', url: 'https://root.example' },
    {
      id: '20',
      parentId: '1',
      title: '技术/工具',
      children: [
        { id: '21', parentId: '20', title: 'Vue [Docs]', url: 'https://vuejs.org' },
        {
          id: '22',
          parentId: '20',
          title: '子目录',
          children: [
            { id: '23', parentId: '22', title: '', url: 'https://empty-title.example' },
          ],
        },
      ],
    },
    {
      id: '30',
      parentId: '1',
      title: '资料',
      children: [
        { id: '31', parentId: '30', title: 'MDN', url: 'https://developer.mozilla.org' },
      ],
    },
  ],
}

describe('findBookmarksBarNode', () => {
  it('finds the chrome bookmark bar by id', () => {
    const root: BookmarkNode = { id: '0', title: '', children: [bookmarksBar] }
    expect(findBookmarksBarNode([root])?.id).toBe('1')
  })

  it('falls back to localized bookmark bar titles', () => {
    const localized: BookmarkNode = { ...bookmarksBar, id: 'toolbar_____', title: 'Bookmarks Bar' }
    const root: BookmarkNode = { id: '0', title: '', children: [localized] }
    expect(findBookmarksBarNode([root])?.id).toBe('toolbar_____')
  })
})

describe('buildBookmarksBarMarkdown', () => {
  it('renders one complete markdown document with nested folder headings', () => {
    const markdown = buildBookmarksBarMarkdown(bookmarksBar, '2026-05-13')
    expect(markdown).toContain('# 书签栏')
    expect(markdown).toContain('_导出时间：2026-05-13_')
    expect(markdown).toContain('- [Root Link](https://root.example)')
    expect(markdown).toContain('## 技术/工具')
    expect(markdown).toContain('- [Vue \\[Docs\\]](https://vuejs.org)')
    expect(markdown).toContain('### 子目录')
    expect(markdown).toContain('- [https://empty-title.example](https://empty-title.example)')
  })
})

describe('splitBookmarksBarForObsidian', () => {
  it('splits output by first-level bookmarks bar folders', () => {
    const files = splitBookmarksBarForObsidian(bookmarksBar, '2026-05-13')
    expect(files.map(f => f.filename)).toEqual(['书签栏.md', '技术_工具.md', '资料.md'])
    expect(files[0].content).toContain('- [Root Link](https://root.example)')
    expect(files[1].content).toContain('# 技术/工具')
    expect(files[1].content).toContain('## 子目录')
    expect(files[2].content).toContain('- [MDN](https://developer.mozilla.org)')
  })
})

describe('sanitizeMarkdownFilename', () => {
  it('removes characters unsafe for filenames', () => {
    expect(sanitizeMarkdownFilename('技术/工具:前端*资料')).toBe('技术_工具_前端_资料.md')
  })
})

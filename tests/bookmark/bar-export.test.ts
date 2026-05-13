import { describe, expect, it } from 'vitest'
import {
  buildBookmarksBarMarkdown,
  exportBookmarksBarToObsidian,
  findBookmarksBarNode,
  formatLocalDate,
  sanitizeMarkdownFilename,
  splitBookmarksBarForObsidian,
} from '../../src/bookmark/bar-export'
import type { BookmarkNode } from '../../src/composables/useBookmarkTree'

function bookmark(id: string, parentId: string, title: string, url: string): BookmarkNode {
  return { id, parentId, title, url, syncing: false }
}

function folder(id: string, title: string, children: BookmarkNode[], parentId?: string): BookmarkNode {
  return { id, parentId, title, children, syncing: false }
}

const bookmarksBar: BookmarkNode = folder('1', '书签栏', [
  bookmark('10', '1', 'Root Link', 'https://root.example'),
  folder('20', '技术/工具', [
    bookmark('21', '20', 'Vue [Docs]', 'https://vuejs.org'),
    folder('22', '子目录', [
      bookmark('23', '22', '', 'https://empty-title.example'),
    ], '20'),
  ], '1'),
  folder('30', '资料', [
    bookmark('31', '30', 'MDN', 'https://developer.mozilla.org'),
  ], '1'),
], undefined)

const bookmarksBarWithCollisions: BookmarkNode = folder('1', '书签栏', [
  bookmark('10', '1', 'Root Link', 'https://root.example'),
  folder('20', 'A/B', [
    bookmark('21', '20', 'A slash B', 'https://slash.example'),
  ], '1'),
  folder('30', 'A:B', [
    bookmark('31', '30', 'A colon B', 'https://colon.example'),
  ], '1'),
  folder('40', '书签栏', [
    bookmark('41', '40', 'Folder named bookmarks bar', 'https://bar-folder.example'),
  ], '1'),
], undefined)

const bookmarksBarWithSpecialUrl: BookmarkNode = folder('1', '书签栏', [
  bookmark('10', '1', 'Paren URL', 'https://example.com/a_(b)'),
  bookmark('11', '1', 'Spaced URL', 'https://example.com/a b'),
], undefined)

const bookmarksBarWithMessyFolderTitle: BookmarkNode = folder('1', '书签栏', [
  folder('20', '技术\n工具 [前端]', [
    bookmark('21', '20', 'Vue', 'https://vuejs.org'),
  ], '1'),
], undefined)

class FakeFile {
  constructor(private readonly read: () => string) {}

  async text() {
    return this.read()
  }
}

class FakeWritable {
  constructor(private readonly writeFile: (content: string) => void) {}

  async write(content: string) {
    this.writeFile(content)
  }

  async close() {}

  async abort() {}
}

class FakeFileHandle {
  constructor(private readonly read: () => string, private readonly writeFile: (content: string) => void) {}

  async getFile() {
    return new FakeFile(this.read)
  }

  async createWritable() {
    return new FakeWritable(this.writeFile)
  }
}

class FakeDirectoryHandle {
  files = new Map<string, string>()
  deleted: string[] = []

  async getDirectoryHandle() {
    return this
  }

  async getFileHandle(name: string, options?: { create?: boolean }) {
    if (!this.files.has(name) && !options?.create) {
      throw new Error(`Missing file ${name}`)
    }
    if (!this.files.has(name)) this.files.set(name, '')
    return new FakeFileHandle(
      () => this.files.get(name) ?? '',
      content => { this.files.set(name, content) },
    )
  }

  async removeEntry(name: string) {
    this.deleted.push(name)
    this.files.delete(name)
  }
}

describe('findBookmarksBarNode', () => {
  it('finds the chrome bookmark bar by id', () => {
    const root = folder('0', '', [bookmarksBar])
    expect(findBookmarksBarNode([root])?.id).toBe('1')
  })

  it('falls back to localized bookmark bar titles', () => {
    const localized: BookmarkNode = { ...bookmarksBar, id: 'toolbar_____', title: 'Bookmarks Bar' }
    const root = folder('0', '', [localized])
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

  it('wraps link destinations so URLs with spaces or closing parentheses render correctly', () => {
    const markdown = buildBookmarksBarMarkdown(bookmarksBarWithSpecialUrl, '2026-05-13')
    expect(markdown).toContain('- [Paren URL](<https://example.com/a_(b)>)')
    expect(markdown).toContain('- [Spaced URL](<https://example.com/a b>)')
  })

  it('cleans folder titles before rendering markdown headings', () => {
    const markdown = buildBookmarksBarMarkdown(bookmarksBarWithMessyFolderTitle, '2026-05-13')
    expect(markdown).toContain('## 技术 工具 \\[前端\\]')
    expect(markdown).not.toContain('## 技术\n工具')
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

  it('keeps generated obsidian filenames unique after sanitizing', () => {
    const files = splitBookmarksBarForObsidian(bookmarksBarWithCollisions, '2026-05-13')
    expect(files.map(f => f.filename)).toEqual(['书签栏.md', 'A_B.md', 'A_B 2.md', '书签栏 2.md'])
    expect(files.find(f => f.filename === 'A_B.md')?.content).toContain('https://slash.example')
    expect(files.find(f => f.filename === 'A_B 2.md')?.content).toContain('https://colon.example')
    expect(files.find(f => f.filename === '书签栏 2.md')?.content).toContain('https://bar-folder.example')
  })

  it('cleans top-level folder titles inside split obsidian files', () => {
    const files = splitBookmarksBarForObsidian(bookmarksBarWithMessyFolderTitle, '2026-05-13')
    expect(files[0].content).toContain('# 技术 工具 \\[前端\\]')
    expect(files[0].content).not.toContain('# 技术\n工具')
  })
})

describe('sanitizeMarkdownFilename', () => {
  it('removes characters unsafe for filenames', () => {
    expect(sanitizeMarkdownFilename('技术/工具:前端*资料')).toBe('技术_工具_前端_资料.md')
  })
})

describe('formatLocalDate', () => {
  it('formats the local calendar date rather than the UTC date', () => {
    expect(formatLocalDate(new Date(2026, 4, 13, 0, 30))).toBe('2026-05-13')
  })
})

describe('exportBookmarksBarToObsidian', () => {
  it('removes files from the previous export manifest that are absent from the current export', async () => {
    const dir = new FakeDirectoryHandle()
    dir.files.set('.bookmarks-bar-export.json', JSON.stringify({ files: ['资料.md', '技术.md'] }))
    dir.files.set('资料.md', 'stale')
    dir.files.set('技术.md', 'old')
    dir.files.set('用户笔记.md', 'manual note')

    await exportBookmarksBarToObsidian(
      dir as unknown as FileSystemDirectoryHandle,
      'Bookmarks',
      [{ filename: '技术.md', content: '# 技术\n' }],
    )

    expect(dir.deleted).toEqual(['资料.md'])
    expect(dir.files.get('技术.md')).toBe('# 技术\n')
    expect(dir.files.get('用户笔记.md')).toBe('manual note')
    expect(JSON.parse(dir.files.get('.bookmarks-bar-export.json') ?? '{}')).toEqual({ files: ['技术.md'] })
  })
})

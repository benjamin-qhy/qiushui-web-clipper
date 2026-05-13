import { getDir } from '../filesystem/save'
import type { BookmarkNode } from '../composables/useBookmarkTree'

export interface ObsidianBookmarkExportFile {
  filename: string
  content: string
}

const BOOKMARKS_BAR_TITLES = new Set(['书签栏', 'Bookmarks Bar'])

function isFolder(node: BookmarkNode): boolean {
  return !node.url
}

function childrenOf(node: BookmarkNode): BookmarkNode[] {
  return node.children ?? []
}

function escapeMarkdownLinkText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\s+/g, ' ')
    .trim()
}

function renderBookmark(node: BookmarkNode): string {
  const url = node.url ?? ''
  const title = escapeMarkdownLinkText(node.title || url)
  return `- [${title}](${url})`
}

function renderNodes(nodes: BookmarkNode[], headingLevel: number): string[] {
  const lines: string[] = []
  for (const node of nodes) {
    if (node.url) {
      lines.push(renderBookmark(node))
      continue
    }

    const title = node.title.trim() || '未命名文件夹'
    lines.push('', `${'#'.repeat(Math.min(headingLevel, 6))} ${title}`, '')
    lines.push(...renderNodes(childrenOf(node), headingLevel + 1))
  }
  return lines
}

export function findBookmarksBarNode(roots: BookmarkNode[]): BookmarkNode | null {
  const root = roots[0]
  const candidates = root?.children ?? roots
  return candidates.find(node => node.id === '1' && isFolder(node))
    ?? candidates.find(node => isFolder(node) && BOOKMARKS_BAR_TITLES.has(node.title))
    ?? null
}

export function buildBookmarksBarMarkdown(bookmarksBar: BookmarkNode, date: string): string {
  const lines = [
    '# 书签栏',
    '',
    `_导出时间：${date}_`,
    '',
    ...renderNodes(childrenOf(bookmarksBar), 2),
  ]
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

export function sanitizeMarkdownFilename(title: string): string {
  const basename = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^\.+$/, '')
    || '未命名'
  return `${basename}.md`
}

export function splitBookmarksBarForObsidian(
  bookmarksBar: BookmarkNode,
  date: string,
): ObsidianBookmarkExportFile[] {
  const files: ObsidianBookmarkExportFile[] = []
  const rootBookmarks = childrenOf(bookmarksBar).filter(node => !!node.url)
  if (rootBookmarks.length > 0) {
    files.push({
      filename: '书签栏.md',
      content: [
        '# 书签栏',
        '',
        `_导出时间：${date}_`,
        '',
        ...renderNodes(rootBookmarks, 2),
      ].join('\n').trimEnd() + '\n',
    })
  }

  for (const node of childrenOf(bookmarksBar)) {
    if (!isFolder(node)) continue
    files.push({
      filename: sanitizeMarkdownFilename(node.title),
      content: [
        `# ${node.title.trim() || '未命名文件夹'}`,
        '',
        `_导出时间：${date}_`,
        '',
        ...renderNodes(childrenOf(node), 2),
      ].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n',
    })
  }
  return files
}

export async function exportBookmarksBarToObsidian(
  vaultHandle: FileSystemDirectoryHandle,
  subDir: string,
  files: ObsidianBookmarkExportFile[],
): Promise<void> {
  const dirHandle = await getDir(vaultHandle, subDir.trim() || 'Bookmarks')
  for (const file of files) {
    const fileHandle = await dirHandle.getFileHandle(file.filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(file.content)
    await writable.close()
  }
}

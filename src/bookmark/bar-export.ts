import { getDir } from '../filesystem/save'
import type { BookmarkNode } from '../composables/useBookmarkTree'

export interface ObsidianBookmarkExportFile {
  filename: string
  content: string
}

const BOOKMARKS_BAR_TITLES = new Set(['书签栏', 'Bookmarks Bar'])
const OBSIDIAN_EXPORT_MANIFEST = '.bookmarks-bar-export.json'

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

function cleanMarkdownHeading(text: string): string {
  return escapeMarkdownLinkText(text || '未命名文件夹') || '未命名文件夹'
}

function formatMarkdownLinkDestination(url: string): string {
  if (!/[\s()<>]/.test(url)) return url
  const safeUrl = url.replace(/</g, '%3C').replace(/>/g, '%3E')
  return `<${safeUrl}>`
}

function renderBookmark(node: BookmarkNode): string {
  const url = node.url ?? ''
  const title = escapeMarkdownLinkText(node.title || url)
  return `- [${title}](${formatMarkdownLinkDestination(url)})`
}

function renderNodes(nodes: BookmarkNode[], headingLevel: number): string[] {
  const lines: string[] = []
  for (const node of nodes) {
    if (node.url) {
      lines.push(renderBookmark(node))
      continue
    }

    const title = cleanMarkdownHeading(node.title)
    lines.push('', `${'#'.repeat(Math.min(headingLevel, 6))} ${title}`, '')
    lines.push(...renderNodes(childrenOf(node), headingLevel + 1))
  }
  return lines
}

export function formatLocalDate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

function deduplicateFilename(filename: string, used: Set<string>): string {
  if (!used.has(filename)) {
    used.add(filename)
    return filename
  }

  const extension = filename.endsWith('.md') ? '.md' : ''
  const basename = extension ? filename.slice(0, -extension.length) : filename
  let index = 2
  while (used.has(`${basename} ${index}${extension}`)) {
    index += 1
  }
  const uniqueFilename = `${basename} ${index}${extension}`
  used.add(uniqueFilename)
  return uniqueFilename
}

export function splitBookmarksBarForObsidian(
  bookmarksBar: BookmarkNode,
  date: string,
): ObsidianBookmarkExportFile[] {
  const files: ObsidianBookmarkExportFile[] = []
  const usedFilenames = new Set<string>()
  const rootBookmarks = childrenOf(bookmarksBar).filter(node => !!node.url)
  if (rootBookmarks.length > 0) {
    files.push({
      filename: deduplicateFilename('书签栏.md', usedFilenames),
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
      filename: deduplicateFilename(sanitizeMarkdownFilename(node.title), usedFilenames),
      content: [
        `# ${cleanMarkdownHeading(node.title)}`,
        '',
        `_导出时间：${date}_`,
        '',
        ...renderNodes(childrenOf(node), 2),
      ].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n',
    })
  }
  return files
}

async function readPreviousExportFilenames(dirHandle: FileSystemDirectoryHandle): Promise<string[]> {
  try {
    const manifestHandle = await dirHandle.getFileHandle(OBSIDIAN_EXPORT_MANIFEST)
    const content = await (await manifestHandle.getFile()).text()
    const parsed = JSON.parse(content) as { files?: unknown }
    if (!Array.isArray(parsed.files)) return []
    return parsed.files.filter((name): name is string => typeof name === 'string')
  } catch {
    return []
  }
}

async function writeTextFile(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  content: string,
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  try {
    await writable.write(content)
    await writable.close()
  } catch (e) {
    await writable.abort().catch(() => {})
    throw e
  }
}

export async function exportBookmarksBarToObsidian(
  vaultHandle: FileSystemDirectoryHandle,
  subDir: string,
  files: ObsidianBookmarkExportFile[],
): Promise<void> {
  const dirHandle = await getDir(vaultHandle, subDir.trim() || 'Bookmarks')
  const currentFilenames = new Set(files.map(file => file.filename))
  const previousFilenames = await readPreviousExportFilenames(dirHandle)

  for (const filename of previousFilenames) {
    if (!currentFilenames.has(filename)) {
      await dirHandle.removeEntry(filename).catch(() => {})
    }
  }

  for (const file of files) {
    await writeTextFile(dirHandle, file.filename, file.content)
  }

  await writeTextFile(
    dirHandle,
    OBSIDIAN_EXPORT_MANIFEST,
    JSON.stringify({ files: [...currentFilenames] }, null, 2),
  )
}

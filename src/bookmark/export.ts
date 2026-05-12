import type { BookmarkRecord } from '../storage/bookmarks'
import { getDir } from '../filesystem/save'

export function buildBookmarkEntry(record: BookmarkRecord): string {
  const tagsLine = record.tags.length > 0 ? record.tags.map(t => `#${t}`).join(' ') : ''
  const tagsSection = tagsLine ? `\n**标签:** ${tagsLine}` : ''
  return `## [${record.title}](${record.url})\n> ${record.summary}${tagsSection}\n\n---\n\n`
}

export function buildCategoryFrontmatter(category: string, date: string): string {
  return `---\ntags: [bookmarks, ${category}]\nupdated: ${date}\n---\n\n# ${category}\n\n`
}

export function extractExistingUrls(content: string): Set<string> {
  const pattern = /## \[.*?\]\((https?:\/\/[^)]+)\)/g
  const urls = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = pattern.exec(content)) !== null) {
    urls.add(match[1])
  }
  return urls
}

export async function exportCategoriesToVault(
  vaultHandle: FileSystemDirectoryHandle,
  subDir: string,
  records: BookmarkRecord[],
): Promise<void> {
  const dir = subDir.trim() || 'Bookmarks'
  const dirHandle = await getDir(vaultHandle, dir)
  const date = new Date().toISOString().slice(0, 10)

  const byCategory = new Map<string, BookmarkRecord[]>()
  for (const r of records) {
    const list = byCategory.get(r.category) ?? []
    list.push(r)
    byCategory.set(r.category, list)
  }

  for (const [category, catRecords] of byCategory) {
    const filename = `${category}.md`
    let existingContent = ''
    let fileHandle: FileSystemFileHandle

    try {
      fileHandle = await dirHandle.getFileHandle(filename)
      existingContent = await (await fileHandle.getFile()).text()
    } catch {
      fileHandle = await dirHandle.getFileHandle(filename, { create: true })
    }

    const existingUrls = extractExistingUrls(existingContent)
    const newEntries = catRecords
      .filter(r => !existingUrls.has(r.url))
      .map(r => buildBookmarkEntry(r))
      .join('')

    if (!newEntries) continue

    const finalContent = existingContent
      ? existingContent.trimEnd() + '\n\n' + newEntries
      : buildCategoryFrontmatter(category, date) + newEntries

    const writable = await fileHandle.createWritable()
    await writable.write(finalContent)
    await writable.close()
  }
}

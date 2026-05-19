import { browser } from 'wxt/browser'
import type { Browser } from 'wxt/browser'
import type { AIProvider } from '../ai/types'
import type { PageMeta } from './meta'

type BookmarkNode = Browser.bookmarks.BookmarkTreeNode

export function buildFolderPaths(nodes: BookmarkNode[], prefix = ''): string[] {
  const paths: string[] = []
  for (const node of nodes) {
    if (node.url) continue
    const path = prefix ? `${prefix}/${node.title}` : node.title
    paths.push(path)
    if (node.children?.length) paths.push(...buildFolderPaths(node.children, path))
  }
  return paths
}

export function buildFolderPathMap(nodes: BookmarkNode[], prefix = ''): Map<string, string> {
  const map = new Map<string, string>()
  for (const node of nodes) {
    if (node.url) continue
    const path = prefix ? `${prefix}/${node.title}` : node.title
    map.set(path, node.id)
    if (node.children?.length) {
      for (const [p, id] of buildFolderPathMap(node.children, path)) map.set(p, id)
    }
  }
  return map
}

export interface ProcessResult {
  folder: string
  title: string
  summary: string
  tags: string[]
}

export function buildProcessPrompt(
  meta: PageMeta,
  url: string,
  folderPaths: string[],
  userSystemPrompt: string,
): { system: string; user: string } {
  const system = `${userSystemPrompt}

可用的书签文件夹：
${folderPaths.join('\n')}

输出格式（仅输出 JSON，不要其他内容）：
{"folder":"文件夹路径","title":"网站名 - 简短描述","summary":"2-3句描述这个网页的内容和用途","tags":["标签1","标签2"]}`

  const user = `标题：${meta.title}
URL：${url}
关键词：${meta.keywords}
描述：${meta.description}`

  return { system, user }
}

export function parseProcessResult(raw: string, fallbackTitle: string): ProcessResult {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const folder = typeof parsed.folder === 'string' ? parsed.folder.trim() : ''
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
    const tags = Array.isArray(parsed.tags)
      ? (parsed.tags as unknown[]).filter(t => typeof t === 'string').map(t => (t as string).trim())
      : []
    return {
      folder: folder || '其他',
      title: title || fallbackTitle,
      summary,
      tags,
    }
  } catch {
    return { folder: '其他', title: fallbackTitle, summary: '', tags: [] }
  }
}

async function findOrCreateFolder(parentId: string, name: string): Promise<string> {
  const children = await browser.bookmarks.getChildren(parentId)
  const existing = children.find(c => !c.url && c.title === name)
  if (existing) return existing.id
  const created = await browser.bookmarks.create({ parentId, title: name })
  return created.id
}

export async function processBookmark(
  bookmarkId: string,
  meta: PageMeta,
  url: string,
  originalTitle: string,
  inboxParentId: string,
  userSystemPrompt: string,
  aiProvider: AIProvider,
): Promise<{ folderPath: string; title: string; summary: string; tags: string[] }> {
  const tree = await browser.bookmarks.getTree()
  const rootChildren = tree[0]?.children ?? []
  const folderPaths = buildFolderPaths(rootChildren)
  const pathMap = buildFolderPathMap(rootChildren)

  const { system, user } = buildProcessPrompt(meta, url, folderPaths, userSystemPrompt)
  const raw = await aiProvider.complete(user, system)
  const result = parseProcessResult(raw, originalTitle)

  const resolvedPath = pathMap.has(result.folder) ? result.folder : '其他'
  const targetFolderId = pathMap.get(result.folder)
    ?? pathMap.get('其他')
    ?? await findOrCreateFolder(inboxParentId, '其他')

  await browser.bookmarks.move(bookmarkId, { parentId: targetFolderId })
  await browser.bookmarks.update(bookmarkId, { title: result.title })

  return {
    folderPath: resolvedPath,
    title: result.title,
    summary: result.summary,
    tags: result.tags,
  }
}

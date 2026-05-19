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

export function buildClassifyPrompt(
  meta: PageMeta,
  url: string,
  folderPaths: string[],
  userSystemPrompt: string,
): { system: string; user: string } {
  const system = `${userSystemPrompt}

可用的书签文件夹：
${folderPaths.join('\n')}

输出格式（仅输出 JSON，不要其他内容）：
{"folder":"文件夹路径"}`

  const user = `标题：${meta.title}
URL：${url}
关键词：${meta.keywords}
描述：${meta.description}`

  return { system, user }
}

export function buildTitlePrompt(meta: PageMeta, url: string): string {
  return `根据以下网页信息，生成一个简洁的书签标题，格式为「网站名 - 简短描述」，15字以内，中文。

标题：${meta.title}
URL：${url}
关键词：${meta.keywords}
描述：${meta.description}

输出格式（仅输出 JSON，不要其他内容）：
{"title":"网站名 - 简短描述"}`
}

export function parseFolder(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const folder = typeof parsed.folder === 'string' ? parsed.folder.trim() : ''
    return folder || '其他'
  } catch {
    return '其他'
  }
}

export function parseTitle(raw: string, fallback: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
    return title || fallback
  } catch {
    return fallback
  }
}

async function findOrCreateFolder(parentId: string, name: string): Promise<string> {
  const children = await browser.bookmarks.getChildren(parentId)
  const existing = children.find(c => !c.url && c.title === name)
  if (existing) return existing.id
  const created = await browser.bookmarks.create({ parentId, title: name })
  return created.id
}

export async function classifyAndMove(
  bookmarkId: string,
  meta: PageMeta,
  url: string,
  inboxParentId: string,
  userSystemPrompt: string,
  aiProvider: AIProvider,
): Promise<{ folderPath: string }> {
  const tree = await browser.bookmarks.getTree()
  const rootChildren = tree[0]?.children ?? []
  const folderPaths = buildFolderPaths(rootChildren)
  const pathMap = buildFolderPathMap(rootChildren)

  const { system, user } = buildClassifyPrompt(meta, url, folderPaths, userSystemPrompt)
  const raw = await aiProvider.complete(user, system)
  const folderPath = parseFolder(raw)

  const resolvedPath = pathMap.has(folderPath) ? folderPath : '其他'
  const targetFolderId = pathMap.get(folderPath)
    ?? await findOrCreateFolder(inboxParentId, '其他')

  await browser.bookmarks.move(bookmarkId, { parentId: targetFolderId })
  return { folderPath: resolvedPath }
}

export async function renameBookmark(
  bookmarkId: string,
  meta: PageMeta,
  url: string,
  originalTitle: string,
  aiProvider: AIProvider,
): Promise<string> {
  const prompt = buildTitlePrompt(meta, url)
  const raw = await aiProvider.complete(prompt)
  const newTitle = parseTitle(raw, originalTitle)
  await browser.bookmarks.update(bookmarkId, { title: newTitle })
  return newTitle
}

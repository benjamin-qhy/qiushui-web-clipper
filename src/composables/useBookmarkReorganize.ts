import { ref } from 'vue'
import { getSettings } from '../storage/settings'
import { createAIProvider } from '../ai/index'
import type { CategoryNode } from '../ai/chat-types'
import type { AIChatInstance } from './useAIChat'

type BookmarkNode = chrome.bookmarks.BookmarkTreeNode
type ReorganizeState = 'idle' | 'analyzing' | 'proposing' | 'awaiting_confirm' | 'executing' | 'done'

async function getAllBookmarks(): Promise<BookmarkNode[]> {
  const roots = await chrome.bookmarks.getTree()
  const result: BookmarkNode[] = []
  function walk(nodes: BookmarkNode[]) {
    for (const n of nodes) {
      if (n.url) result.push(n)
      if (n.children) walk(n.children)
    }
  }
  walk(roots[0]?.children ?? [])
  return result
}

export function buildAnalyzePrompt(bookmarks: { title: string; url: string }[]): string {
  const list = bookmarks.map(b => `- 标题: ${b.title}, URL: ${b.url}`).join('\n')
  return `你是一个书签整理助手。以下是用户的所有书签，请分析这些书签，为它们设计一个合理的目录分类结构（2-4级，每级3-8个分类）。

书签列表：
${list}

输出格式（仅输出 JSON，不要其他内容）：
{"categories":[{"name":"分类名","children":[{"name":"子分类名"}]}]}`
}

export function buildModifyPrompt(currentTree: CategoryNode[], userRequest: string): string {
  return `你是一个书签整理助手。当前目录结构如下：
${JSON.stringify(currentTree, null, 2)}

用户的修改意见：${userRequest}

请根据用户意见调整目录结构，输出新的 JSON（格式与输入相同）：
{"categories":[{"name":"分类名","children":[{"name":"子分类名"}]}]}`
}

export function parseCategoryTree(raw: string): CategoryNode[] {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!Array.isArray(parsed.categories)) return []
    return parsed.categories as CategoryNode[]
  } catch {
    return []
  }
}

async function classifyBookmarkPrompt(
  bookmark: { title: string; url: string },
  categories: string[],
): Promise<string> {
  return `你是一个书签整理助手。请将以下书签归入最合适的分类。

书签标题：${bookmark.title}
书签URL：${bookmark.url}

可选分类：${categories.join('、')}

输出格式（仅输出 JSON）：
{"category":"分类名称"}`
}

function flattenCategories(nodes: CategoryNode[]): string[] {
  const result: string[] = []
  for (const n of nodes) {
    result.push(n.name)
    if (n.children?.length) result.push(...flattenCategories(n.children))
  }
  return result
}

async function findOrCreateFolder(parentId: string, name: string): Promise<string> {
  const children = await chrome.bookmarks.getChildren(parentId)
  const existing = children.find(c => !c.url && c.title === name)
  if (existing) return existing.id
  const created = await chrome.bookmarks.create({ parentId, title: name })
  return created.id
}

async function buildFolderMap(
  tree: CategoryNode[],
  parentId: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  async function walk(nodes: CategoryNode[], pid: string) {
    for (const n of nodes) {
      const folderId = await findOrCreateFolder(pid, n.name)
      map.set(n.name, folderId)
      if (n.children?.length) await walk(n.children, folderId)
    }
  }
  await walk(tree, parentId)
  return map
}

export function useBookmarkReorganize() {
  const state = ref<ReorganizeState>('idle')
  let currentTree: CategoryNode[] = []
  let abortFlag = false

  async function start(chat: AIChatInstance): Promise<void> {
    abortFlag = false
    state.value = 'analyzing'
    chat.isLoading.value = true
    chat.appendAIMessage({ type: 'text', content: '正在读取您的书签...' })

    try {
      const bookmarks = await getAllBookmarks()
      const settings = await getSettings()
      const aiProvider = createAIProvider(settings.aiConfig)

      state.value = 'proposing'
      const prompt = buildAnalyzePrompt(bookmarks.map(b => ({ title: b.title ?? '', url: b.url ?? '' })))
      const raw = await aiProvider.complete(prompt)
      currentTree = parseCategoryTree(raw)

      if (currentTree.length === 0) {
        chat.appendAIMessage({ type: 'text', content: 'AI 返回的目录结构无效，请重试。' })
        state.value = 'idle'
        chat.isLoading.value = false
        return
      }

      state.value = 'awaiting_confirm'
      chat.appendAIMessage({ type: 'category-proposal', content: '', categoryTree: currentTree })
    } catch (e) {
      chat.appendAIMessage({ type: 'text', content: `分析出错：${e instanceof Error ? e.message : String(e)}` })
      state.value = 'idle'
    }
    chat.isLoading.value = false
  }

  async function submitModification(chat: AIChatInstance, userText: string): Promise<void> {
    if (state.value !== 'awaiting_confirm') return
    state.value = 'proposing'
    chat.isLoading.value = true
    chat.addUserMessage(userText)

    try {
      const settings = await getSettings()
      const aiProvider = createAIProvider(settings.aiConfig)
      const prompt = buildModifyPrompt(currentTree, userText)
      const raw = await aiProvider.complete(prompt)
      const newTree = parseCategoryTree(raw)

      if (newTree.length === 0) {
        chat.appendAIMessage({ type: 'text', content: 'AI 返回结构无效，请再次描述修改意见。' })
        state.value = 'awaiting_confirm'
        chat.isLoading.value = false
        return
      }

      currentTree = newTree
      state.value = 'awaiting_confirm'
      chat.appendAIMessage({ type: 'category-proposal', content: '', categoryTree: currentTree })
    } catch (e) {
      chat.appendAIMessage({ type: 'text', content: `修改出错：${e instanceof Error ? e.message : String(e)}` })
      state.value = 'awaiting_confirm'
    }
    chat.isLoading.value = false
  }

  async function confirm(chat: AIChatInstance, keepOldFolders: boolean): Promise<void> {
    if (state.value !== 'awaiting_confirm') return
    state.value = 'executing'
    chat.isLoading.value = true
    abortFlag = false

    const thinkId = chat.appendAIMessage({ type: 'thinking', content: '正在整理书签...', thinkingLines: [] })

    let moved = 0, failed = 0

    try {
      const settings = await getSettings()
      const aiProvider = createAIProvider(settings.aiConfig)
      const bookmarks = await getAllBookmarks()

      const roots = await chrome.bookmarks.getTree()
      const otherBookmarks = roots[0]?.children?.find(c => c.id === '2') ?? roots[0]?.children?.[0]
      if (!otherBookmarks) throw new Error('找不到书签根目录')

      const folderMap = await buildFolderMap(currentTree, otherBookmarks.id)
      const leafCategories = flattenCategories(currentTree)

      for (const bm of bookmarks) {
        if (abortFlag) break
        if (!bm.url) continue

        try {
          const classifyPrompt = await classifyBookmarkPrompt(
            { title: bm.title ?? '', url: bm.url },
            leafCategories,
          )
          const raw = await aiProvider.complete(classifyPrompt)
          const parsed = JSON.parse(raw) as { category?: string }
          const category = parsed.category ?? ''
          const folderId = folderMap.get(category)

          if (folderId) {
            await chrome.bookmarks.move(bm.id, { parentId: folderId })
            chat.updateMessage(thinkId, {
              thinkingLines: [
                ...(chat.messages.value.find(m => m.id === thinkId)?.thinkingLines ?? []),
                { text: `${bm.title || bm.url} → ${category}`, status: 'ok' },
              ],
            })
            moved++
          } else {
            chat.updateMessage(thinkId, {
              thinkingLines: [
                ...(chat.messages.value.find(m => m.id === thinkId)?.thinkingLines ?? []),
                { text: `${bm.title || bm.url} — 未匹配到分类，跳过`, status: 'skip' },
              ],
            })
          }
        } catch {
          chat.updateMessage(thinkId, {
            thinkingLines: [
              ...(chat.messages.value.find(m => m.id === thinkId)?.thinkingLines ?? []),
              { text: `${bm.title || bm.url} — 处理失败`, status: 'error' },
            ],
          })
          failed++
        }
      }

      state.value = 'done'
      chat.appendAIMessage({
        type: 'summary',
        content: `✓ 整理完成：移动 ${moved} 条书签，失败 ${failed} 条${keepOldFolders ? '' : '（已清理旧目录）'}`,
      })
    } catch (e) {
      chat.appendAIMessage({ type: 'text', content: `执行出错：${e instanceof Error ? e.message : String(e)}` })
      state.value = 'idle'
    }
    chat.isLoading.value = false
  }

  function abort() {
    abortFlag = true
  }

  return { state, start, submitModification, confirm, abort }
}

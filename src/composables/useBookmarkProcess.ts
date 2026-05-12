import { ref } from 'vue'
import { getSettings } from '../storage/settings'
import { createAIProvider } from '../ai/index'
import { processBookmark } from '../bookmark/process'
import { saveBookmarkRecord } from '../storage/bookmarks'
import type { AIChatInstance } from './useAIChat'

type BookmarkNode = chrome.bookmarks.BookmarkTreeNode

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

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const html = await res.text()
    return html.replace(/(<([^>]+)>)/gi, '').slice(0, 2000)
  } catch {
    return ''
  }
}

export function useBookmarkProcess() {
  const state = ref<'idle' | 'processing' | 'done' | 'aborted'>('idle')
  let abortFlag = false

  async function start(chat: AIChatInstance): Promise<void> {
    if (state.value === 'processing') return
    abortFlag = false
    state.value = 'processing'
    chat.isLoading.value = true

    const thinkId = chat.appendAIMessage({ type: 'thinking', content: '正在处理书签...', thinkingLines: [] })

    let ok = 0, failed = 0

    try {
      const settings = await getSettings()
      const aiProvider = createAIProvider(settings.aiConfig)
      const bookmarks = await getAllBookmarks()

      for (const bm of bookmarks) {
        if (abortFlag) { state.value = 'aborted'; break }
        if (!bm.url) continue

        try {
          const pageText = await fetchPageText(bm.url)
          const result = await processBookmark(bm.title ?? '', bm.url, pageText, aiProvider)
          await saveBookmarkRecord({
            id: bm.id,
            url: bm.url,
            title: bm.title ?? '',
            summary: result.summary,
            tags: result.tags,
            category: result.category,
            processedAt: Date.now(),
          })
          chat.updateMessage(thinkId, {
            thinkingLines: [
              ...(chat.messages.value.find(m => m.id === thinkId)?.thinkingLines ?? []),
              { text: `${bm.title || bm.url} — 归入「${result.category}」`, status: 'ok' },
            ],
          })
          ok++
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
    } catch (e) {
      chat.appendAIMessage({ type: 'text', content: `处理出错：${e instanceof Error ? e.message : String(e)}` })
      state.value = 'idle'
      chat.isLoading.value = false
      return
    }

    if (state.value !== 'aborted') {
      state.value = 'done'
      chat.appendAIMessage({
        type: 'summary',
        content: `✓ 整理完成：共处理 ${ok + failed} 条书签，成功 ${ok} 条，失败 ${failed} 条`,
      })
    }
    chat.isLoading.value = false
  }

  function abort() {
    abortFlag = true
  }

  return { state, start, abort }
}

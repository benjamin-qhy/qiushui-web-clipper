import { ref } from 'vue'
import { browser } from 'wxt/browser'
import type { Browser } from 'wxt/browser'
import { getSettings } from '../storage/settings'
import { createAIProvider } from '../ai/index'
import { processBookmark } from '../bookmark/process'
import { saveBookmarkRecord } from '../storage/bookmarks'

type BookmarkNode = Browser.bookmarks.BookmarkTreeNode

export interface LogEntry {
  time: string
  title: string
  url: string
  category: string
  status: 'ok' | 'error'
  error?: string
}

function nowTime(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
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
  const state = ref<'idle' | 'processing' | 'done' | 'error'>('idle')
  const log = ref<LogEntry[]>([])
  const progress = ref({ done: 0, total: 0 })

  async function start(): Promise<void> {
    if (state.value === 'processing') return

    state.value = 'processing'
    log.value = []
    progress.value = { done: 0, total: 0 }

    try {
      const settings = await getSettings()
      const inboxName = settings.bookmarkInboxFolder

      const results = await browser.bookmarks.search({ title: inboxName })
      const inboxFolder = results.find((r: BookmarkNode) => !r.url)
      if (!inboxFolder || !inboxFolder.parentId) {
        state.value = 'done'
        return
      }

      const folderId = inboxFolder.id
      const parentId = inboxFolder.parentId

      const children = await browser.bookmarks.getChildren(folderId)
      const bookmarks = children.filter((c: BookmarkNode) => !!c.url)

      progress.value.total = bookmarks.length

      const aiProvider = createAIProvider(settings.aiConfig)

      for (const bm of bookmarks) {
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

          // Find or create target category folder (sibling of inbox)
          const siblings = await browser.bookmarks.getChildren(parentId)
          let categoryFolder = siblings.find((s: BookmarkNode) => !s.url && s.title === result.category)
          if (!categoryFolder) {
            categoryFolder = await browser.bookmarks.create({ parentId, title: result.category })
          }

          await browser.bookmarks.move(bm.id, { parentId: categoryFolder.id })

          log.value.push({
            time: nowTime(),
            title: bm.title || bm.url,
            url: bm.url,
            category: result.category,
            status: 'ok',
          })
        } catch (e) {
          log.value.push({
            time: nowTime(),
            title: bm.title || bm.url,
            url: bm.url,
            category: '',
            status: 'error',
            error: e instanceof Error ? e.message : String(e),
          })
        }
        progress.value.done++
      }

      state.value = 'done'
    } catch (e) {
      state.value = 'error'
      log.value.push({
        time: nowTime(),
        title: '处理出错',
        url: '',
        category: '',
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return { state, log, progress, start }
}

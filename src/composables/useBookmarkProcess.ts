import { ref } from 'vue'
import { browser } from 'wxt/browser'
import type { Browser } from 'wxt/browser'
import { getSettings } from '../storage/settings'
import { createAIProvider } from '../ai/index'
import { fetchPageMeta } from '../bookmark/meta'
import type { PageMeta } from '../bookmark/meta'
import { processBookmark } from '../bookmark/classify'
import { saveBookmarkRecord } from '../storage/bookmarks'

type BookmarkNode = Browser.bookmarks.BookmarkTreeNode

export interface LogEntry {
  time: string
  title: string
  url: string
  folder: string
  status: 'ok' | 'warning' | 'error'
  warning?: string
  error?: string
}

export interface CurrentItem {
  index: number
  total: number
  url: string
  phase: string
}

function nowTime(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function useBookmarkProcess() {
  const state = ref<'idle' | 'processing' | 'done' | 'error'>('idle')
  const log = ref<LogEntry[]>([])
  const progress = ref({ done: 0, total: 0 })
  const currentItem = ref<CurrentItem | null>(null)

  async function start(): Promise<void> {
    if (state.value === 'processing') return

    state.value = 'processing'
    log.value = []
    progress.value = { done: 0, total: 0 }
    currentItem.value = null

    try {
      const settings = await getSettings()
      const inboxName = settings.bookmarkInboxFolder

      const results = await browser.bookmarks.search({ title: inboxName })
      const inboxFolder = results.find((r: BookmarkNode) => !r.url)
      if (!inboxFolder || !inboxFolder.parentId) {
        state.value = 'error'
        log.value.unshift({
          time: nowTime(),
          title: '未找到收件箱文件夹',
          url: '',
          folder: '',
          status: 'error',
          error: `未找到「${inboxName}」文件夹，请在书签中创建一个`,
        })
        return
      }

      const children = await browser.bookmarks.getChildren(inboxFolder.id)
      const bookmarks = children.filter((c: BookmarkNode) => !!c.url)
      progress.value.total = bookmarks.length

      if (bookmarks.length === 0) {
        state.value = 'done'
        return
      }

      const aiProvider = createAIProvider(settings.aiConfig)

      for (let i = 0; i < bookmarks.length; i++) {
        const bm = bookmarks[i]
        if (!bm.url) continue

        currentItem.value = { index: i + 1, total: bookmarks.length, url: bm.url, phase: '正在获取页面信息…' }

        let meta: PageMeta
        let metaWarning: string | undefined

        try {
          meta = await fetchPageMeta(bm.url)
          if (!meta.title) meta = { title: bm.title ?? '', keywords: '', description: '' }
        } catch {
          meta = { title: bm.title ?? '', keywords: '', description: '' }
          metaWarning = '页面获取失败，已用书签标题兜底'
        }

        try {
          currentItem.value = { ...currentItem.value, phase: 'AI 整理中…' }
          const { folderPath, title, summary, tags } = await processBookmark(
            bm.id,
            meta,
            bm.url,
            bm.title ?? '',
            inboxFolder.parentId!,
            settings.bookmarkSystemPrompt,
            aiProvider,
          )

          await saveBookmarkRecord({
            id: bm.id,
            url: bm.url,
            title,
            summary,
            tags,
            category: folderPath,
            processedAt: Date.now(),
          })

          log.value.unshift({
            time: nowTime(),
            title,
            url: bm.url,
            folder: folderPath,
            status: metaWarning ? 'warning' : 'ok',
            warning: metaWarning,
          })
        } catch (e) {
          log.value.unshift({
            time: nowTime(),
            title: bm.title || bm.url,
            url: bm.url,
            folder: '',
            status: 'error',
            error: e instanceof Error ? e.message : String(e),
          })
        }

        progress.value.done++
      }

      state.value = 'done'
      currentItem.value = null
    } catch (e) {
      state.value = 'error'
      log.value.unshift({
        time: nowTime(),
        title: '处理出错',
        url: '',
        folder: '',
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      })
      currentItem.value = null
    }
  }

  return { state, log, progress, currentItem, start }
}

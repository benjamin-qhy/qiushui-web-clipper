import { browser } from 'wxt/browser'
import { getSettings } from '../src/storage/settings'
import { saveBookmarkRecord, type ProcessingStatus } from '../src/storage/bookmarks'
import { deduplicateByUrl, isDeadLink } from '../src/bookmark/duplicates'
import { processBookmark } from '../src/bookmark/process'
import { createAIProvider } from '../src/ai/index'
import type { Browser } from 'wxt/browser'

type BookmarkTreeNode = Browser.bookmarks.BookmarkTreeNode

let processingStatus: ProcessingStatus = {
  state: 'idle',
  total: 0,
  processed: 0,
  duplicatesRemoved: 0,
  deadLinksRemoved: 0,
  lastRunAt: null,
}

export function getProcessingStatus(): ProcessingStatus {
  return processingStatus
}

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url)
    const html = await res.text()
    return html.replace(/(<([^>]+)>)/gi, '').slice(0, 5000)
  } catch {
    return ''
  }
}

async function triggerProcessing(): Promise<void> {
  if (processingStatus.state === 'running') return

  processingStatus = {
    state: 'running',
    total: 0,
    processed: 0,
    duplicatesRemoved: 0,
    deadLinksRemoved: 0,
    lastRunAt: null,
  }

  try {
    const settings = await getSettings()
    const inboxFolderName = settings.bookmarkInboxFolder

    const searchResults = await browser.bookmarks.search({ title: inboxFolderName })
    const inboxFolder = searchResults.find((r: BookmarkTreeNode) => !r.url)
    if (!inboxFolder) {
      processingStatus = { ...processingStatus, state: 'done', lastRunAt: Date.now() }
      return
    }

    if (!inboxFolder.parentId) {
      processingStatus = { ...processingStatus, state: 'done', lastRunAt: Date.now() }
      return
    }

    const folderId = inboxFolder.id
    const parentId = inboxFolder.parentId

    const children = await browser.bookmarks.getChildren(folderId)
    const bookmarks = children.filter((c: BookmarkTreeNode) => !!c.url)

    processingStatus.total = bookmarks.length

    const { keep, remove } = deduplicateByUrl(bookmarks)
    for (const bm of remove) {
      await browser.bookmarks.remove(bm.id)
      processingStatus.duplicatesRemoved++
    }

    const aiProvider = createAIProvider(settings.aiConfig)

    for (const bm of keep) {
      if (!bm.url) continue
      try {
        const dead = await isDeadLink(bm.url)
        if (dead) {
          await browser.bookmarks.remove(bm.id)
          processingStatus.deadLinksRemoved++
          continue
        }

        const pageText = await fetchPageText(bm.url)
        const result = await processBookmark(bm.title || '', bm.url, pageText, aiProvider)

        await saveBookmarkRecord({
          id: bm.id,
          url: bm.url,
          title: bm.title || '',
          summary: result.summary,
          tags: result.tags,
          category: result.category,
          processedAt: Date.now(),
        })

        const siblings = await browser.bookmarks.getChildren(parentId)
        let categoryFolder = siblings.find((s: BookmarkTreeNode) => !s.url && s.title === result.category)
        if (!categoryFolder) {
          categoryFolder = await browser.bookmarks.create({ parentId, title: result.category })
        }

        await browser.bookmarks.move(bm.id, { parentId: categoryFolder.id })
        processingStatus.processed++
      } catch {
        // Skip failed bookmark and continue with the rest
      }
    }

    processingStatus = { ...processingStatus, state: 'done', lastRunAt: Date.now() }
  } catch (err) {
    processingStatus = {
      ...processingStatus,
      state: 'error',
      lastRunAt: Date.now(),
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function handleMessage(msg: { type: string; url?: string }): Promise<unknown> {
  if (msg.type === 'FETCH_PAGE') {
    if (!msg.url) return { text: '' }
    return { text: await fetchPageText(msg.url) }
  }

  if (msg.type === 'PROCESS_BOOKMARKS') {
    triggerProcessing()
    return { ok: true }
  }

  if (msg.type === 'GET_PROCESSING_STATUS') {
    return getProcessingStatus()
  }

  return undefined
}

export default defineBackground({
  main() {
    browser.runtime.onInstalled.addListener(async () => {
      const settings = await getSettings()
      const periodInMinutes = settings.processInterval * 60
      await browser.alarms.create('process-bookmarks', { periodInMinutes })
    })

    browser.runtime.onStartup.addListener(async () => {
      const settings = await getSettings()
      const periodInMinutes = settings.processInterval * 60
      await browser.alarms.create('process-bookmarks', { periodInMinutes })
      triggerProcessing()
    })

    browser.alarms.onAlarm.addListener((alarm: Browser.alarms.Alarm) => {
      if (alarm.name === 'process-bookmarks') {
        triggerProcessing()
      }
    })

    browser.runtime.onMessage.addListener((msg: unknown, _sender: unknown, sendResponse: (response: unknown) => void) => {
      if (!msg || typeof (msg as { type?: unknown }).type !== 'string') {
        sendResponse(undefined)
        return true
      }
      handleMessage(msg as { type: string; url?: string }).then(sendResponse)
      return true
    })
  },
})

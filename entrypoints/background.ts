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
    const inboxFolderName = settings.bookmarkInboxFolder || '待整理'

    // Find inbox folder
    const searchResults = await browser.bookmarks.search({ title: inboxFolderName })
    const inboxFolder = searchResults.find((r: BookmarkTreeNode) => !r.url)
    if (!inboxFolder) {
      processingStatus = { ...processingStatus, state: 'done', lastRunAt: Date.now() }
      return
    }

    const folderId = inboxFolder.id
    const parentId = inboxFolder.parentId!

    // Get children of inbox folder
    const children = await browser.bookmarks.getChildren(folderId)

    // Filter to only bookmarks (with url)
    const bookmarks = children.filter((c: BookmarkTreeNode) => !!c.url)

    processingStatus.total = bookmarks.length

    // Deduplicate
    const { keep, remove } = deduplicateByUrl(bookmarks)
    for (const bm of remove) {
      await browser.bookmarks.remove(bm.id)
      processingStatus.duplicatesRemoved++
    }

    // Process live bookmarks
    const aiProvider = createAIProvider(settings.aiConfig)

    for (const bm of keep) {
      if (!bm.url) continue

      // Check if dead link
      const dead = await isDeadLink(bm.url)
      if (dead) {
        await browser.bookmarks.remove(bm.id)
        processingStatus.deadLinksRemoved++
        continue
      }

      // Fetch page text by messaging self
      let pageText = ''
      try {
        const resp = await browser.runtime.sendMessage({ type: 'FETCH_PAGE', url: bm.url }) as { text: string }
        pageText = resp?.text ?? ''
      } catch {
        pageText = ''
      }

      // Process with AI
      const fullBm = bm as BookmarkTreeNode
      const result = await processBookmark(fullBm.title || '', bm.url, pageText, aiProvider)

      // Save record
      await saveBookmarkRecord({
        id: bm.id,
        url: bm.url,
        title: fullBm.title || '',
        summary: result.summary,
        tags: result.tags,
        category: result.category,
        processedAt: Date.now(),
      })

      // Find or create category folder under parent of inbox folder
      const siblings = await browser.bookmarks.getChildren(parentId)
      let categoryFolder = siblings.find((s: BookmarkTreeNode) => !s.url && s.title === result.category)
      if (!categoryFolder) {
        categoryFolder = await browser.bookmarks.create({ parentId, title: result.category })
      }

      // Move bookmark to category folder
      await browser.bookmarks.move(bm.id, { parentId: categoryFolder.id })

      processingStatus.processed++
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
    try {
      const res = await fetch(msg.url!)
      const html = await res.text()
      const text = html.replace(/(<([^>]+)>)/gi, '').slice(0, 5000)
      return { text }
    } catch {
      return { text: '' }
    }
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
      handleMessage(msg as { type: string; url?: string }).then(sendResponse)
      return true
    })
  },
})

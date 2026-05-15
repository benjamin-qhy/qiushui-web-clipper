import { browser } from 'wxt/browser'
import { getSettings } from '../src/storage/settings'
import { saveBookmarkRecord, type ProcessingStatus } from '../src/storage/bookmarks'
import { processBookmark } from '../src/bookmark/process'
import { createAIProvider } from '../src/ai/index'
import type { Browser } from 'wxt/browser'

type BookmarkTreeNode = Browser.bookmarks.BookmarkTreeNode

let processingStatus: ProcessingStatus = {
  state: 'idle',
  total: 0,
  processed: 0,
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
    lastRunAt: null,
  }

  try {
    const settings = await getSettings()
    const inboxFolderName = settings.bookmarkInboxFolder

    const searchResults = await browser.bookmarks.search({ title: inboxFolderName })
    const inboxFolder = searchResults.find((r: BookmarkTreeNode) => !r.url)
    if (!inboxFolder || !inboxFolder.parentId) {
      processingStatus = { ...processingStatus, state: 'done', lastRunAt: Date.now() }
      return
    }

    const folderId = inboxFolder.id
    const parentId = inboxFolder.parentId

    const children = await browser.bookmarks.getChildren(folderId)
    const bookmarks = children.filter((c: BookmarkTreeNode) => !!c.url)

    processingStatus.total = bookmarks.length

    const aiProvider = createAIProvider(settings.aiConfig)

    for (const bm of bookmarks) {
      if (!bm.url) continue
      try {
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

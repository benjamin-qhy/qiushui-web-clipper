import { browser } from 'wxt/browser'
import { getSettings } from '../src/storage/settings'
import type { ProcessingStatus } from '../src/storage/bookmarks'
import { createAIProvider } from '../src/ai/index'
import { fetchPageMeta } from '../src/bookmark/meta'
import { classifyAndMove, renameBookmark } from '../src/bookmark/classify'
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

    const parentId = inboxFolder.parentId

    const children = await browser.bookmarks.getChildren(inboxFolder.id)
    const bookmarks = children.filter((c: BookmarkTreeNode) => !!c.url)

    processingStatus.total = bookmarks.length

    const aiProvider = createAIProvider(settings.aiConfig)

    for (const bm of bookmarks) {
      if (!bm.url) continue
      try {
        let meta = await fetchPageMeta(bm.url).catch(() => ({ title: bm.title ?? '', keywords: '', description: '' }))
        if (!meta.title) meta = { title: bm.title ?? '', keywords: '', description: '' }

        await classifyAndMove(bm.id, meta, bm.url, parentId, settings.bookmarkSystemPrompt, aiProvider)
        await renameBookmark(bm.id, meta, bm.url, bm.title ?? '', aiProvider)
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

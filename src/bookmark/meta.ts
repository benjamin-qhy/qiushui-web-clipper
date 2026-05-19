import { browser } from 'wxt/browser'

export interface PageMeta {
  title: string
  keywords: string
  description: string
}

export function buildMetaFromDom(title: string, keywords: string, description: string): PageMeta {
  return { title, keywords, description }
}

function waitForTabComplete(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolved = false

    const timer = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener)
      if (!resolved) reject(new Error('页面加载超时'))
    }, timeoutMs)

    function listener(id: number, changeInfo: { status?: string }) {
      if (id === tabId && changeInfo.status === 'complete') {
        clearTimeout(timer)
        browser.tabs.onUpdated.removeListener(listener)
        resolved = true
        resolve()
      }
    }
    browser.tabs.onUpdated.addListener(listener)

    // Resolve immediately if the tab is already complete (race condition guard)
    browser.tabs.get(tabId).then(t => {
      if (t.status === 'complete' && !resolved) {
        clearTimeout(timer)
        browser.tabs.onUpdated.removeListener(listener)
        resolved = true
        resolve()
      }
    }).catch(() => {
      // If we can't get the tab status, let the listener handle it
    })
  })
}

export async function fetchPageMeta(url: string, timeoutMs = 30000): Promise<PageMeta> {
  const tab = await browser.tabs.create({ url, active: false })
  if (tab.id === undefined) {
    throw new Error('无法获取标签页 ID')
  }
  const tabId = tab.id
  try {
    await waitForTabComplete(tabId, timeoutMs)
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: () => {
        const getMeta = (name: string) =>
          document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? ''
        return {
          title: document.title,
          keywords: getMeta('keywords'),
          description: getMeta('description'),
        }
      },
    })
    const raw = results[0]?.result as { title: string; keywords: string; description: string } | undefined
    return raw ?? { title: '', keywords: '', description: '' }
  } finally {
    await browser.tabs.remove(tabId)
  }
}

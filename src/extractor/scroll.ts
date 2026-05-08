const CONTAINER_SELECTOR = '#mainBox .bear-web-x-container'
const SCROLL_STEP = 800
const SCROLL_DELAY = 120   // ms，等待虚拟渲染
const MAX_WAIT = 15_000    // ms，最多等待 15 秒

export async function scrollToLoadAll(): Promise<Element | null> {
  const container = document.querySelector(CONTAINER_SELECTOR)
  if (!container) return null

  const scrollable = findScrollable(container)
  if (!scrollable) return container

  const start = Date.now()
  let lastHeight = 0

  while (Date.now() - start < MAX_WAIT) {
    scrollable.scrollTop += SCROLL_STEP
    await delay(SCROLL_DELAY)
    const newHeight = scrollable.scrollHeight
    if (newHeight === lastHeight && scrollable.scrollTop + scrollable.clientHeight >= newHeight) break
    lastHeight = newHeight
  }

  // 滚回顶部
  scrollable.scrollTop = 0
  await delay(SCROLL_DELAY)

  return container
}

function findScrollable(el: Element): Element | null {
  let node: Element | null = el
  while (node) {
    const { overflow, overflowY } = getComputedStyle(node)
    if (['auto', 'scroll'].includes(overflow) || ['auto', 'scroll'].includes(overflowY)) {
      return node
    }
    node = node.parentElement
  }
  return null
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

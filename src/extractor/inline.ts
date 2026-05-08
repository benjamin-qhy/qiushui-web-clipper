import type { Span } from '../types'

export function extractSpans(el: Element): Span[] {
  const spans: Span[] = []

  // 飞书文档行内元素通常是 <span> 包含 data-* 属性
  const leaves = el.querySelectorAll('[data-leaf], span[class*="text-"]')

  if (leaves.length === 0) {
    // fallback: 直接取 textContent
    const text = el.textContent?.trim() ?? ''
    if (text) spans.push({ text })
    return spans
  }

  for (const leaf of leaves) {
    const text = leaf.textContent ?? ''
    if (!text) continue

    const span: Span = { text }

    if (
      leaf.getAttribute('data-bold') === 'true' ||
      leaf.closest('[data-bold="true"]')
    ) span.bold = true

    if (
      leaf.getAttribute('data-italic') === 'true' ||
      leaf.closest('[data-italic="true"]')
    ) span.italic = true

    if (
      leaf.getAttribute('data-strike') === 'true' ||
      leaf.closest('[data-strikethrough="true"]')
    ) span.strikethrough = true

    if (
      leaf.getAttribute('data-code') === 'true' ||
      leaf.closest('code')
    ) span.inlineCode = true

    const anchor = leaf.closest('a')
    if (anchor?.href) span.link = anchor.href

    spans.push(span)
  }

  return spans
}

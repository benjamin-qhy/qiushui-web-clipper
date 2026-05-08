import type { Block, BlockType, Cell } from '../types'
import { extractSpans } from './inline'

export function extractBlocks(container: Element): Block[] {
  const blockEls = container.querySelectorAll('[data-block-type]')
  const blocks: Block[] = []

  for (const el of blockEls) {
    const type = el.getAttribute('data-block-type') as BlockType
    if (!type) continue

    const block = parseBlock(el, type)
    if (block) blocks.push(block)
  }

  return blocks
}

function parseBlock(el: Element, type: BlockType): Block | null {
  switch (type) {
    case 'page':
    case 'heading1': case 'heading2': case 'heading3':
    case 'heading4': case 'heading5': case 'heading6':
    case 'heading7': case 'heading8': case 'heading9':
    case 'text':
    case 'quote_container':
    case 'callout':
      return { type, spans: extractSpans(el) }

    case 'bullet':
    case 'ordered': {
      const level = Number(el.getAttribute('data-indent-level') ?? 0)
      return { type, spans: extractSpans(el), level }
    }

    case 'todo': {
      const checked = el.getAttribute('data-checked') === 'true' ||
        el.querySelector('input[type="checkbox"]')?.getAttribute('checked') !== null
      return { type, spans: extractSpans(el), checked }
    }

    case 'code': {
      const language = el.getAttribute('data-language') ??
        el.querySelector('[data-language]')?.getAttribute('data-language') ?? ''
      const text = el.querySelector('pre, code, [data-code-content]')?.textContent ??
        el.textContent ?? ''
      return { type, spans: [{ text }], language }
    }

    case 'divider':
      return { type }

    case 'image': {
      const img = el.querySelector('img')
      return { type, src: img?.src ?? '', alt: img?.alt ?? '' }
    }

    case 'table': {
      const rows = extractTableRows(el)
      return rows.length > 0 ? { type, rows } : null
    }

    default:
      return null
  }
}

function extractTableRows(tableEl: Element): Cell[][] {
  const rows: Cell[][] = []
  const trEls = tableEl.querySelectorAll('tr')

  for (const tr of trEls) {
    const cells: Cell[] = []
    for (const td of tr.querySelectorAll('td, th')) {
      cells.push({ spans: extractSpans(td) })
    }
    if (cells.length > 0) rows.push(cells)
  }

  return rows
}

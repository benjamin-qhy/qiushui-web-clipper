import Defuddle from 'defuddle/full'
import type { DocContent } from '../types'

export function extractGeneral(): DocContent {
  const result = new Defuddle(document, { markdown: true }).parse()

  const title = (result.title ?? document.title ?? '').trim() || 'Untitled'

  return {
    title,
    source: window.location.href,
    author: result.author ?? undefined,
    published: result.published ?? undefined,
    created: new Date().toISOString().slice(0, 10),
    description: result.description ?? undefined,
    blocks: [],
    markdown: result.content ?? '',
  }
}

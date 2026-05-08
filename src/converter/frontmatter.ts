import type { DocMeta } from '../types'

export function buildFrontmatter(meta: DocMeta): string {
  const lines: string[] = ['---']
  lines.push(`title: "${meta.title}"`)
  lines.push(`source: "${meta.source}"`)
  if (meta.author) {
    lines.push('author:')
    lines.push(`  - "[[${meta.author}]]"`)
  } else {
    lines.push('author:')
  }
  lines.push(meta.published ? `published: ${meta.published}` : 'published:')
  lines.push(`created: ${meta.created}`)
  lines.push('description:')
  lines.push('tags:')
  lines.push('  - "clippings"')
  lines.push('---')
  lines.push('')
  return lines.join('\n')
}

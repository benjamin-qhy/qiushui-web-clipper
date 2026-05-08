const ILLEGAL_CHARS = /[/\\:*?"<>|]/g

export function sanitizeFilename(title: string): string {
  const result = title.trim().replace(ILLEGAL_CHARS, '')
  return result || 'untitled'
}

export function resolveFilename(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base
  let i = 1
  while (existing.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

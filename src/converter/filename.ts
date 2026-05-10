export function sanitizeFilename(title: string): string {
  const result = [...title]
    .filter(ch => {
      const cp = ch.codePointAt(0) ?? 0
      // 控制字符 (U+0000–U+001F, U+007F–U+009F)
      if (cp <= 0x1F || (cp >= 0x7F && cp <= 0x9F)) return false
      // 零宽 / 不可见字符 (U+200B–U+200F, U+2028–U+2029, U+FEFF, U+00AD)
      if (cp >= 0x200B && cp <= 0x200F) return false
      if (cp === 0x2028 || cp === 0x2029) return false
      if (cp === 0xFEFF || cp === 0x00AD) return false
      // 文件系统非法字符
      if ('/\\:*?"<>|'.includes(ch)) return false
      return true
    })
    .join('')
    .trim()
    .replace(/^\.+/, '')   // 不能以 . 开头（File System Access API 限制）
    .trim()
  return result || 'untitled'
}

export function resolveFilename(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base
  let i = 1
  while (existing.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

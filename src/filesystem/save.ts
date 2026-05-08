import { sanitizeFilename, resolveFilename } from '../converter/filename'

/**
 * 将内容写入 vault 的指定子目录，自动创建目录，处理文件名冲突。
 * @returns 实际写入的文件名（含 .md 扩展名）
 */
export async function saveToVault(
  vaultHandle: FileSystemDirectoryHandle,
  subDir: string,
  title: string,
  content: string
): Promise<string> {
  const dirHandle = await vaultHandle.getDirectoryHandle(subDir, { create: true })

  // 收集目录中已有的文件名（不含扩展名）
  const existing = new Set<string>()
  for await (const name of dirHandle.keys()) {
    if (name.endsWith('.md')) existing.add(name.slice(0, -3))
  }

  const base = sanitizeFilename(title)
  const finalName = resolveFilename(base, existing)
  const filename = `${finalName}.md`

  const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()

  return filename
}

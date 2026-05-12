import { sanitizeFilename, resolveFilename } from '../converter/filename'

export async function saveImageToVault(
  vaultHandle: FileSystemDirectoryHandle,
  subDir: string,
  notename: string,
  filename: string,
  base64: string,
): Promise<void> {
  const dir = subDir.trim() || 'Clippings'
  const dirHandle = await getDir(vaultHandle, dir)
  const assetsHandle = await getDir(dirHandle, `${notename}.assets`)
  const safeFilename = filename.replace(/^\.+/, '') || 'image.png'
  const fileHandle = await assetsHandle.getFileHandle(safeFilename, { create: true })
  const writable = await fileHandle.createWritable()
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  await writable.write(bytes)
  await writable.close()
}
export async function saveToVault(
  vaultHandle: FileSystemDirectoryHandle,
  subDir: string,
  title: string,
  content: string
): Promise<string> {
  const dir = subDir.trim() || 'Clippings'
  const dirHandle = await getDir(vaultHandle, dir)

  const existing = new Set<string>()
  for await (const name of dirHandle.keys()) {
    if (name.endsWith('.md')) existing.add(name.slice(0, -3))
  }

  const base = sanitizeFilename(title)
  const finalName = resolveFilename(base, existing)
  const filename = `${finalName}.md`

  console.log('[feishu-clipper] saving md file:', JSON.stringify(filename))
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true }).catch(e => {
    throw new Error(`无法创建文件 "${filename}": ${e}`)
  })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()

  return filename
}

export async function getDir(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  console.log('[feishu-clipper] getDirectoryHandle:', JSON.stringify(name))
  return parent.getDirectoryHandle(name, { create: true }).catch(e => {
    throw new Error(`无法创建目录 "${name}": ${e}`)
  })
}

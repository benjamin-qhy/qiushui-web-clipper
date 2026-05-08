// src/storage/vault.ts

const STORAGE_KEY = 'obsidianVaultHandle'

export async function getVaultHandle(): Promise<FileSystemDirectoryHandle | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return (result[STORAGE_KEY] as FileSystemDirectoryHandle) ?? null
}

export async function setVaultHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: handle })
  // 请求持久化存储，防止浏览器清理
  if (navigator.storage?.persist) {
    await navigator.storage.persist()
  }
}

export async function clearVaultHandle(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}

/**
 * 验证已存储的句柄权限是否仍然有效。
 * 返回 true 表示可以直接使用，false 表示需要重新授权。
 */
export async function verifyVaultPermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    const permission = await handle.queryPermission({ mode: 'readwrite' })
    if (permission === 'granted') return true
    const request = await handle.requestPermission({ mode: 'readwrite' })
    return request === 'granted'
  } catch {
    return false
  }
}

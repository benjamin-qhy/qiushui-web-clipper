import { describe, it, expect, vi } from 'vitest'
import { saveToVault } from '../../src/filesystem/save'

function makeMockDirHandle(existingFiles: string[] = []): FileSystemDirectoryHandle {
  const files = new Set(existingFiles)

  const subDirHandle = {
    getFileHandle: vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    keys: vi.fn().mockImplementation(async function* () {
      for (const name of files) yield name
    }),
  }

  return {
    getDirectoryHandle: vi.fn().mockResolvedValue(subDirHandle),
  } as unknown as FileSystemDirectoryHandle
}

describe('saveToVault', () => {
  it('writes file to subdirectory', async () => {
    const rootHandle = makeMockDirHandle()
    await saveToVault(rootHandle, 'Clippings', '我的笔记', '# 内容')
    expect(rootHandle.getDirectoryHandle).toHaveBeenCalledWith('Clippings', { create: true })
  })

  it('resolves conflict by appending -1', async () => {
    const rootHandle = makeMockDirHandle(['我的笔记.md'])
    const result = await saveToVault(rootHandle, 'Clippings', '我的笔记', '# 内容')
    expect(result).toBe('我的笔记-1.md')
  })

  it('returns final filename', async () => {
    const rootHandle = makeMockDirHandle()
    const result = await saveToVault(rootHandle, 'Clippings', '新笔记', '# 内容')
    expect(result).toBe('新笔记.md')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBookmarkTree } from '../../src/composables/useBookmarkTree'

const mocks = vi.hoisted(() => ({
  getSubTree: vi.fn(),
}))

vi.mock('wxt/browser', () => ({
  browser: {
    bookmarks: {
      getSubTree: mocks.getSubTree,
    },
  },
}))

vi.mock('../../src/storage/settings', () => ({
  getSettings: vi.fn(),
}))

vi.mock('../../src/storage/bookmarks', () => ({
  getAllBookmarkRecords: vi.fn(),
}))

describe('useBookmarkTree selectFolder', () => {
  beforeEach(() => {
    mocks.getSubTree.mockReset()
  })

  it('collects bookmarks from descendant folders and annotates their folder path', async () => {
    mocks.getSubTree.mockResolvedValue([
      {
        id: 'folder-1',
        title: '技术',
        syncing: false,
        children: [
          {
            id: 'bookmark-1',
            parentId: 'folder-1',
            title: 'Root Link',
            url: 'https://root.example',
            syncing: false,
          },
          {
            id: 'folder-2',
            parentId: 'folder-1',
            title: '前端',
            syncing: false,
            children: [
              {
                id: 'bookmark-2',
                parentId: 'folder-2',
                title: 'Vue',
                url: 'https://vuejs.org',
                syncing: false,
              },
            ],
          },
        ],
      },
    ])

    const tree = useBookmarkTree()
    await tree.selectFolder('folder-1')

    expect(tree.selectedBookmarks.value.map(bookmark => bookmark.id)).toEqual(['bookmark-1', 'bookmark-2'])
    expect(tree.selectedBookmarks.value[0].folderPath).toBe('')
    expect(tree.selectedBookmarks.value[1].folderPath).toBe('前端')
  })
})

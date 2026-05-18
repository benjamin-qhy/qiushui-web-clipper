import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBookmarkTree } from '../../src/composables/useBookmarkTree'

const { bookmarksCreate, bookmarksGetChildren, bookmarksGetTree, recordsGetAll } = vi.hoisted(() => ({
  bookmarksCreate: vi.fn(),
  bookmarksGetChildren: vi.fn(),
  bookmarksGetTree: vi.fn(),
  recordsGetAll: vi.fn(),
}))

vi.mock('wxt/browser', () => ({
  browser: {
    bookmarks: {
      create: bookmarksCreate,
      getChildren: bookmarksGetChildren,
      getTree: bookmarksGetTree,
    },
  },
}))

vi.mock('../../src/storage/bookmarks', () => ({
  getAllBookmarkRecords: recordsGetAll,
}))

beforeEach(() => {
  bookmarksCreate.mockReset()
  bookmarksGetChildren.mockReset()
  bookmarksGetTree.mockReset()
  recordsGetAll.mockReset()

  bookmarksGetTree.mockResolvedValue([{ id: '0', title: '', children: [] }])
  recordsGetAll.mockResolvedValue([])
})

describe('useBookmarkTree.createFolder', () => {
  it('does not create a duplicate folder with the same parent and title', async () => {
    bookmarksGetChildren.mockResolvedValue([{ id: '2', parentId: '1', title: '阅读', children: [] }])

    const tree = useBookmarkTree()
    await tree.createFolder('1', '阅读')

    expect(bookmarksCreate).not.toHaveBeenCalled()
  })

  it('coalesces concurrent create requests for the same parent and title', async () => {
    bookmarksGetChildren.mockResolvedValue([])
    bookmarksCreate.mockResolvedValue({ id: '2', parentId: '1', title: '阅读' })

    const tree = useBookmarkTree()
    await Promise.all([
      tree.createFolder('1', '阅读'),
      tree.createFolder('1', '阅读'),
    ])

    expect(bookmarksCreate).toHaveBeenCalledTimes(1)
    expect(bookmarksCreate).toHaveBeenCalledWith({ parentId: '1', title: '阅读' })
  })
})

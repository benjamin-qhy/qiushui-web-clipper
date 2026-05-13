import { describe, expect, it } from 'vitest'
import { filterBookmarkListItems } from '../../src/bookmark/filter'
import type { BookmarkListItem } from '../../src/composables/useBookmarkTree'

function bookmark(partial: Partial<BookmarkListItem>): BookmarkListItem {
  return {
    id: partial.id ?? '1',
    title: partial.title ?? '',
    url: partial.url ?? '',
    folderPath: partial.folderPath,
    syncing: false,
  }
}

describe('filterBookmarkListItems', () => {
  const bookmarks = [
    bookmark({ id: '1', title: 'Vue Guide', url: 'https://vuejs.org', folderPath: '前端 / 框架' }),
    bookmark({ id: '2', title: 'MDN', url: 'https://developer.mozilla.org', folderPath: '前端 / 文档' }),
    bookmark({ id: '3', title: '设计资料', url: 'https://design.example', folderPath: '设计' }),
  ]

  it('returns every bookmark when the query is empty', () => {
    expect(filterBookmarkListItems(bookmarks, '  ')).toEqual(bookmarks)
  })

  it('matches bookmark titles case-insensitively', () => {
    expect(filterBookmarkListItems(bookmarks, 'vue').map(bookmark => bookmark.id)).toEqual(['1'])
  })

  it('matches URLs', () => {
    expect(filterBookmarkListItems(bookmarks, 'mozilla').map(bookmark => bookmark.id)).toEqual(['2'])
  })

  it('matches descendant folder paths', () => {
    expect(filterBookmarkListItems(bookmarks, '文档').map(bookmark => bookmark.id)).toEqual(['2'])
  })
})

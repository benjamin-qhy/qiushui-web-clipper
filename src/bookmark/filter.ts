import type { BookmarkListItem } from '../composables/useBookmarkTree'

export function filterBookmarkListItems(
  bookmarks: BookmarkListItem[],
  query: string,
): BookmarkListItem[] {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return bookmarks

  return bookmarks.filter(bookmark => {
    const searchable = [
      bookmark.title,
      bookmark.url,
      bookmark.folderPath,
    ].join(' ').toLowerCase()
    return searchable.includes(keyword)
  })
}

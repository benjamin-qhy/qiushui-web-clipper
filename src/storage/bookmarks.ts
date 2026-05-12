export interface BookmarkRecord {
  id: string
  url: string
  title: string
  summary: string
  tags: string[]
  category: string
  processedAt: number
}

export async function saveBookmarkRecord(record: BookmarkRecord): Promise<void> {
  const key = `bookmark:${record.id}`
  await chrome.storage.local.set({ [key]: record })
}

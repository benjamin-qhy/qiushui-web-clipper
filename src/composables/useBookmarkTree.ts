// src/composables/useBookmarkTree.ts
import { ref } from 'vue'
import { browser } from 'wxt/browser'
import { getSettings } from '../storage/settings'
import { getAllBookmarkRecords } from '../storage/bookmarks'
import type { Browser } from 'wxt/browser'

export type BookmarkNode = Browser.bookmarks.BookmarkTreeNode

export interface FolderNode {
  id: string
  title: string
  parentId?: string
  children: FolderNode[]
  expanded: boolean
}

export function useBookmarkTree() {
  const folderTree = ref<FolderNode[]>([])
  const selectedFolderId = ref<string | null>(null)
  const selectedBookmarks = ref<BookmarkNode[]>([])
  const processedIds = ref<Set<string>>(new Set())
  const dragOverFolderId = ref<string | null>(null)
  const expandedIds = ref<Set<string>>(new Set())
  const error = ref<string | null>(null)

  function buildFolderTree(nodes: BookmarkNode[]): FolderNode[] {
    return nodes
      .filter(n => !n.url)
      .map(n => ({
        id: n.id,
        title: n.title,
        parentId: n.parentId,
        children: buildFolderTree(n.children ?? []),
        expanded: expandedIds.value.has(n.id),
      }))
  }

  async function loadTree() {
    try {
      const roots = await browser.bookmarks.getTree()
      if (roots.length === 0) return
      // roots[0] is the invisible root; its children are Bookmarks Bar, Other Bookmarks, etc.
      folderTree.value = buildFolderTree(roots[0].children ?? [])

      const records = await getAllBookmarkRecords()
      processedIds.value = new Set(records.map(r => r.id))
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  async function selectFolder(folderId: string) {
    selectedFolderId.value = folderId
    const children = await browser.bookmarks.getChildren(folderId)
    selectedBookmarks.value = children.filter(n => !!n.url)
  }

  async function toggleExpand(folderId: string) {
    const next = new Set(expandedIds.value)
    if (next.has(folderId)) {
      next.delete(folderId)
    } else {
      next.add(folderId)
    }
    expandedIds.value = next
    await loadTree()
  }

  async function createFolder(parentId: string, title: string): Promise<void> {
    await browser.bookmarks.create({ parentId, title })
    await loadTree().catch(() => {})
  }

  async function renameFolder(id: string, title: string): Promise<void> {
    await browser.bookmarks.update(id, { title })
    await loadTree().catch(() => {})
  }

  async function deleteFolder(folderId: string): Promise<void> {
    // 1. Find 待整理 folder
    const settings = await getSettings()
    const inboxName = settings.bookmarkInboxFolder
    const results = await browser.bookmarks.search({ title: inboxName })
    const inbox = results.find(r => !r.url)
    if (!inbox) throw new Error(`找不到"${inboxName}"文件夹，请先创建它`)

    // 2. Collect all bookmark nodes in this folder subtree
    const subtree = await browser.bookmarks.getSubTree(folderId)
    const bookmarkNodes: BookmarkNode[] = []
    function collect(nodes: BookmarkNode[]) {
      for (const n of nodes) {
        if (n.url) bookmarkNodes.push(n)
        if (n.children) collect(n.children)
      }
    }
    collect(subtree[0].children ?? [])

    // 3. Move each bookmark to inbox
    try {
      for (const bm of bookmarkNodes) {
        await browser.bookmarks.move(bm.id, { parentId: inbox.id })
      }
    } catch (e) {
      throw new Error(`部分书签移动失败，操作已中止: ${e instanceof Error ? e.message : String(e)}`)
    }

    // 4. Remove the now-empty folder tree
    await browser.bookmarks.removeTree(folderId)
    await loadTree().catch(() => {})

    // If deleted folder was selected, clear selection
    if (selectedFolderId.value === folderId) {
      selectedFolderId.value = null
      selectedBookmarks.value = []
    }
  }

  async function moveFolder(folderId: string, targetParentId: string): Promise<void> {
    await browser.bookmarks.move(folderId, { parentId: targetParentId })
    await loadTree().catch(() => {})
  }

  async function deleteBookmark(id: string): Promise<void> {
    await browser.bookmarks.remove(id)
    if (selectedFolderId.value) {
      await selectFolder(selectedFolderId.value)
    }
  }

  async function moveBookmark(bookmarkId: string, targetFolderId: string): Promise<void> {
    await browser.bookmarks.move(bookmarkId, { parentId: targetFolderId })
    if (selectedFolderId.value) {
      await selectFolder(selectedFolderId.value)
    }
  }

  return {
    folderTree,
    selectedFolderId,
    selectedBookmarks,
    processedIds,
    dragOverFolderId,
    error,
    loadTree,
    selectFolder,
    toggleExpand,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    deleteBookmark,
    moveBookmark,
  }
}

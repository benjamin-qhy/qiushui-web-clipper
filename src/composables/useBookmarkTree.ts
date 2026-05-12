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
    const roots = await browser.bookmarks.getTree()
    // roots[0] is the invisible root; its children are Bookmarks Bar, Other Bookmarks, etc.
    folderTree.value = buildFolderTree(roots[0].children ?? [])

    const records = await getAllBookmarkRecords()
    processedIds.value = new Set(records.map(r => r.id))
  }

  async function selectFolder(folderId: string) {
    selectedFolderId.value = folderId
    const children = await browser.bookmarks.getChildren(folderId)
    selectedBookmarks.value = children.filter(n => !!n.url)
  }

  function toggleExpand(folderId: string) {
    if (expandedIds.value.has(folderId)) {
      expandedIds.value.delete(folderId)
    } else {
      expandedIds.value.add(folderId)
    }
    // Rebuild tree to reflect new expanded state
    loadTree()
  }

  async function createFolder(parentId: string, title: string): Promise<void> {
    await browser.bookmarks.create({ parentId, title })
    await loadTree()
  }

  async function renameFolder(id: string, title: string): Promise<void> {
    await browser.bookmarks.update(id, { title })
    await loadTree()
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
    for (const bm of bookmarkNodes) {
      await browser.bookmarks.move(bm.id, { parentId: inbox.id })
    }

    // 4. Remove the now-empty folder tree
    await browser.bookmarks.removeTree(folderId)
    await loadTree()

    // If deleted folder was selected, clear selection
    if (selectedFolderId.value === folderId) {
      selectedFolderId.value = null
      selectedBookmarks.value = []
    }
  }

  async function moveFolder(folderId: string, targetParentId: string): Promise<void> {
    await browser.bookmarks.move(folderId, { parentId: targetParentId })
    await loadTree()
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

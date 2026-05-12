<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { browser } from 'wxt/browser'
import { useBookmarkTree } from '../../src/composables/useBookmarkTree'
import FolderTree from './components/FolderTree.vue'
import BookmarkList from './components/BookmarkList.vue'
import AISidebar from './components/AISidebar.vue'
import type { FolderNode } from '../../src/composables/useBookmarkTree'

const tree = useBookmarkTree()

onMounted(() => tree.loadTree())

function findTitle(nodes: FolderNode[], id: string): string {
  for (const n of nodes) {
    if (n.id === id) return n.title
    const found = findTitle(n.children, id)
    if (found) return found
  }
  return ''
}

const selectedFolderTitle = computed(() =>
  tree.selectedFolderId.value ? findTitle(tree.folderTree.value, tree.selectedFolderId.value) : ''
)

async function handleSelect(folderId: string) {
  await tree.selectFolder(folderId).catch(setError)
}

function handleOpenBookmark(url: string) {
  browser.tabs.create({ url })
}

function setError(e: unknown) {
  tree.error.value = e instanceof Error ? e.message : String(e)
}

</script>

<template>
  <div class="layout">
    <div class="pane-left">
      <div class="pane-header">书签文件夹</div>
      <div class="pane-body">
        <FolderTree
          :nodes="tree.folderTree.value"
          :selected-id="tree.selectedFolderId.value"
          :drag-over-id="tree.dragOverFolderId.value"
          @select="handleSelect"
          @toggle-expand="(id) => tree.toggleExpand(id).catch(setError)"
          @create-folder="(parentId, title) => tree.createFolder(parentId, title).catch(setError)"
          @rename-folder="(id, title) => tree.renameFolder(id, title).catch(setError)"
          @delete-folder="(id) => tree.deleteFolder(id).catch(setError)"
          @move-folder="(folderId, targetId) => tree.moveFolder(folderId, targetId).catch(setError)"
          @move-bookmark="(bmId, folderId) => tree.moveBookmark(bmId, folderId).catch(setError)"
          @drag-over="(id) => { tree.dragOverFolderId.value = id }"
        />
      </div>
    </div>

    <div class="pane-main">
      <BookmarkList
        :bookmarks="tree.selectedBookmarks.value"
        :processed-ids="tree.processedIds.value"
        :folder-title="selectedFolderTitle"
        @delete-bookmark="(id) => tree.deleteBookmark(id).catch(setError)"
        @open-bookmark="handleOpenBookmark"
      />
    </div>

    <AISidebar />
  </div>

  <div v-if="tree.error.value" class="global-error">{{ tree.error.value }}</div>
</template>

<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
</style>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  color: #222;
}
.pane-left {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pane-header {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.pane-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.pane-main {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.global-error {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: #fce8e6;
  color: #c62828;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid #f5c6c6;
  z-index: 100;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { filterBookmarkListItems } from '../../../src/bookmark/filter'
import type { BookmarkListItem } from '../../../src/composables/useBookmarkTree'

const props = defineProps<{
  bookmarks: BookmarkListItem[]
  processedIds: Set<string>
  folderTitle: string
  isExporting?: boolean
}>()

const emit = defineEmits<{
  deleteBookmark: [id: string]
  openBookmark: [url: string]
  exportMarkdown: []
  exportObsidian: []
}>()

const searchQuery = ref('')
const filteredBookmarks = computed(() => filterBookmarkListItems(props.bookmarks, searchQuery.value))

function getDomain(url: string): string {
  try { return new URL(url).hostname } catch { return '' }
}

function faviconUrl(url: string): string {
  const domain = getDomain(url)
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`
}

function onFaviconError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='2' fill='%23ddd'/></svg>`
}

function onDragStart(e: DragEvent, bookmarkId: string) {
  e.dataTransfer?.setData('type', 'bookmark')
  e.dataTransfer?.setData('id', bookmarkId)
}
</script>

<template>
  <div class="list-panel">
    <div class="list-header">
      <h2 class="folder-title">{{ folderTitle || '请选择文件夹' }}</h2>
      <div v-if="folderTitle" class="search-box">
        <input
          v-model="searchQuery"
          class="search-input"
          type="search"
          placeholder="搜索当前列表..."
        />
      </div>
      <span class="count" v-if="bookmarks.length > 0">{{ filteredBookmarks.length }} 条</span>
      <div class="export-actions">
        <button class="export-btn" :disabled="props.isExporting" @click="emit('exportMarkdown')">
          {{ props.isExporting ? '导出中...' : '导出书签栏 MD' }}
        </button>
        <button class="export-btn" :disabled="props.isExporting" @click="emit('exportObsidian')">
          导出到 Obsidian
        </button>
      </div>
    </div>

    <div v-if="!folderTitle" class="empty-hint">← 点击左侧文件夹查看书签</div>

    <div v-else-if="bookmarks.length === 0" class="empty-hint">此文件夹暂无书签</div>

    <div v-else-if="filteredBookmarks.length === 0" class="empty-hint">未找到匹配书签</div>

    <ul v-else class="bookmark-list">
      <li
        v-for="bm in filteredBookmarks"
        :key="bm.id"
        class="bookmark-item"
        draggable="true"
        @dragstart="onDragStart($event, bm.id)"
      >
        <img
          :src="faviconUrl(bm.url || '')"
          class="favicon"
          @error="onFaviconError"
          width="16"
          height="16"
        />
        <div class="bm-content" @click="bm.url && emit('openBookmark', bm.url)">
          <span class="bm-title">{{ bm.title || bm.url }}</span>
          <span class="bm-url">{{ bm.url }}</span>
          <span v-if="bm.folderPath" class="bm-folder">{{ bm.folderPath }}</span>
        </div>
        <span v-if="processedIds.has(bm.id)" class="badge-processed">已整理</span>
        <button class="delete-btn" title="删除" @click.stop="emit('deleteBookmark', bm.id)">✕</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.list-panel { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.list-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid #e0e0e0; flex-shrink: 0; }
.folder-title { margin: 0; font-size: 15px; font-weight: 600; flex: 1; }
.count { font-size: 12px; color: #888; }
.search-box { flex: 0 1 260px; min-width: 160px; }
.search-input {
  width: 100%;
  height: 28px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: #333;
  outline: none;
}
.search-input:focus { border-color: #bca9ef; box-shadow: 0 0 0 2px #f1ebff; }
.export-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.export-btn {
  border: 1px solid #d7d0ea;
  background: #fff;
  color: #5f3db5;
  border-radius: 4px;
  padding: 5px 9px;
  font-size: 12px;
  cursor: pointer;
}
.export-btn:hover:not(:disabled) { background: #f6f2ff; border-color: #bca9ef; }
.export-btn:disabled { cursor: not-allowed; color: #aaa; border-color: #ddd; background: #f7f7f7; }
.empty-hint { padding: 32px 16px; color: #aaa; font-size: 14px; text-align: center; }
.bookmark-list { flex: 1; overflow-y: auto; list-style: none; margin: 0; padding: 8px 0; }
.bookmark-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: grab;
  border-bottom: 1px solid #f0f0f0;
}
.bookmark-item:hover { background: #f9f9f9; }
.bookmark-item:active { cursor: grabbing; }
.favicon { flex-shrink: 0; border-radius: 2px; }
.bm-content { flex: 1; min-width: 0; cursor: pointer; }
.bm-title { display: block; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #222; }
.bm-url { display: block; font-size: 11px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; }
.bm-folder { display: block; font-size: 11px; color: #6e4dc4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; }
.bm-content:hover .bm-title { color: #6e4dc4; text-decoration: underline; }
.badge-processed { flex-shrink: 0; font-size: 11px; padding: 1px 6px; background: #e6f4ea; color: #2e7d32; border-radius: 10px; }
.delete-btn { background: none; border: none; cursor: pointer; font-size: 12px; color: #bbb; padding: 2px 6px; border-radius: 3px; flex-shrink: 0; }
.delete-btn:hover { background: #fce8e6; color: #c62828; }
</style>

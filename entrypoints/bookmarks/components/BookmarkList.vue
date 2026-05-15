<script setup lang="ts">
import type { BookmarkNode } from '../../../src/composables/useBookmarkTree'

const props = defineProps<{
  bookmarks: BookmarkNode[]
  processedIds: Set<string>
  folderTitle: string
}>()

const emit = defineEmits<{
  deleteBookmark: [id: string]
  openBookmark: [url: string]
}>()

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
      <span class="count" v-if="bookmarks.length > 0">{{ bookmarks.length }} 条</span>
    </div>

    <div v-if="!folderTitle" class="empty-hint">← 点击左侧文件夹查看书签</div>

    <div v-else-if="bookmarks.length === 0" class="empty-hint">此文件夹暂无书签</div>

    <ul v-else class="bookmark-list">
      <li
        v-for="bm in bookmarks"
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
        </div>
        <span v-if="processedIds.has(bm.id)" class="badge-processed">已整理</span>
        <button class="delete-btn" title="删除" @click.stop="emit('deleteBookmark', bm.id)">✕</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.list-panel { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.folder-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  flex: 1;
  color: var(--color-text);
}
.count {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.empty-hint {
  padding: 48px 18px;
  color: var(--color-text-muted);
  font-size: 13px;
  text-align: center;
}
.bookmark-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 0;
}
.bookmark-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  cursor: grab;
  border-bottom: 1px solid var(--color-border-light);
}
.bookmark-item:hover { background: var(--color-surface); }
.bookmark-item:active { cursor: grabbing; }
.favicon { flex-shrink: 0; border-radius: 2px; opacity: 0.85; }
.bm-content { flex: 1; min-width: 0; cursor: pointer; }
.bm-title {
  display: block;
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text);
}
.bm-url {
  display: block;
  font-size: 11px;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 1px;
}
.bm-content:hover .bm-title { color: var(--color-accent); }
.badge-processed {
  flex-shrink: 0;
  font-size: 10px;
  padding: 1px 6px;
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  border-radius: 2px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 11px;
  color: var(--color-text-muted);
  padding: 2px 6px;
  border-radius: 2px;
  flex-shrink: 0;
}
.delete-btn:hover { background: #fce8e6; color: #c62828; }
</style>

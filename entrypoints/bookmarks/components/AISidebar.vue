<!-- entrypoints/bookmarks/components/AISidebar.vue -->
<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { browser } from 'wxt/browser'
import { useBookmarkProcess } from '../../../src/composables/useBookmarkProcess'

const processor = useBookmarkProcess()

const sidebarWidth = ref(320)
let dragStartX = 0
let dragStartWidth = 0

function onDragStart(e: MouseEvent) {
  dragStartX = e.clientX
  dragStartWidth = sidebarWidth.value
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
}

function onDragMove(e: MouseEvent) {
  const delta = dragStartX - e.clientX
  sidebarWidth.value = Math.min(600, Math.max(240, dragStartWidth + delta))
}

function onDragEnd() {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
})

function openSettings() {
  browser.tabs.create({ url: '/options.html' })
}
</script>

<template>
  <aside class="sidebar" :style="{ width: `${sidebarWidth}px` }">
    <div class="drag-handle" @mousedown="onDragStart" />

    <div class="sidebar-header">
      <span class="sidebar-title">AI 整理</span>
      <button class="btn-icon" title="设置" @click="openSettings">⚙</button>
    </div>

    <!-- Action -->
    <div class="action-area">
      <button
        class="btn-process"
        :disabled="processor.state.value === 'processing'"
        @click="processor.start()"
      >
        <span v-if="processor.state.value === 'processing'">
          整理中… {{ processor.progress.value.done }}/{{ processor.progress.value.total }}
        </span>
        <span v-else>▶ 整理「待整理」文件夹</span>
      </button>
    </div>

    <!-- Log -->
    <div class="log-area">
      <div v-if="processor.log.value.length === 0" class="log-empty">
        <span v-if="processor.state.value === 'idle'">点击上方按钮开始整理</span>
        <span v-else-if="processor.state.value === 'processing'">正在处理…</span>
      </div>

      <div
        v-for="(entry, i) in processor.log.value"
        :key="i"
        class="log-entry"
        :class="entry.status"
      >
        <span class="log-time">{{ entry.time }}</span>
        <span class="log-body">
          <template v-if="entry.status === 'ok'">
            <a class="log-title" :href="entry.url" target="_blank" :title="entry.url">{{ entry.title }}</a>
            <span class="log-arrow">→</span>
            <span class="log-category">{{ entry.category }}</span>
          </template>
          <template v-else>
            <span class="log-title error-title">{{ entry.title }}</span>
            <span class="log-error">{{ entry.error }}</span>
          </template>
        </span>
      </div>

      <div v-if="processor.state.value === 'done' && processor.log.value.length > 0" class="log-summary">
        完成：共 {{ processor.progress.value.total }} 条，
        成功 {{ processor.log.value.filter(e => e.status === 'ok').length }} 条
        <template v-if="processor.log.value.filter(e => e.status === 'error').length > 0">
          ，失败 {{ processor.log.value.filter(e => e.status === 'error').length }} 条
        </template>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: relative;
  flex-shrink: 0;
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
}
.drag-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 10;
}
.drag-handle:hover { background: var(--color-border); }

/* Header */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-bg);
}
.sidebar-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.5px;
}
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-muted);
  padding: 0 3px;
  line-height: 1;
}
.btn-icon:hover { color: var(--color-accent); }

/* Action */
.action-area {
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}
.btn-process {
  width: 100%;
  padding: 10px 16px;
  background: var(--color-dark);
  color: #fff;
  border: none;
  border-radius: 2px;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-ui);
  cursor: pointer;
  text-align: center;
  letter-spacing: 0.3px;
}
.btn-process:hover { opacity: 0.85; }
.btn-process:disabled { opacity: 0.5; cursor: not-allowed; }

/* Log */
.log-area {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0 16px;
}
.log-empty {
  padding: 32px 20px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-muted);
}
.log-entry {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 16px;
  font-size: 14px;
  line-height: 1.5;
  border-bottom: 1px solid var(--color-border-light);
}
.log-entry:last-of-type { border-bottom: none; }
.log-time {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
}
.log-body {
  display: flex;
  align-items: baseline;
  gap: 5px;
  flex-wrap: wrap;
  min-width: 0;
}
.log-title {
  color: var(--color-text);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
  flex-shrink: 0;
}
a.log-title {
  text-decoration: none;
}
a.log-title:hover { color: var(--color-accent); text-decoration: underline; }
.error-title { color: var(--color-text-secondary); }
.log-arrow {
  color: var(--color-text-muted);
  flex-shrink: 0;
}
.log-category {
  color: var(--color-accent);
  font-weight: 600;
  white-space: nowrap;
}
.log-error {
  color: #c62828;
  font-size: 14px;
  word-break: break-word;
}
.log-summary {
  padding: 10px 16px 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}
</style>

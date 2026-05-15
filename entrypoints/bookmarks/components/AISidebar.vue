<!-- entrypoints/bookmarks/components/AISidebar.vue -->
<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { browser } from 'wxt/browser'
import { useAIChat } from '../../../src/composables/useAIChat'
import { useBookmarkProcess } from '../../../src/composables/useBookmarkProcess'
import { useBookmarkReorganize } from '../../../src/composables/useBookmarkReorganize'
import ChatMessages from './ai/ChatMessages.vue'
import ChatInput from './ai/ChatInput.vue'
import EmptyState from './ai/EmptyState.vue'

const chat = useAIChat()
const processor = useBookmarkProcess()
const reorganizer = useBookmarkReorganize()

const sidebarWidth = ref(360)
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
  sidebarWidth.value = Math.min(600, Math.max(260, dragStartWidth + delta))
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

const hasMessages = computed(() => chat.messages.value.length > 0)
const isDisabled = computed(() => chat.isLoading.value)

function openSettings() {
  browser.runtime.openOptionsPage()
}

function handleSend(text: string) {
  if (reorganizer.state.value === 'awaiting_confirm') {
    reorganizer.submitModification(chat, text)
  } else {
    chat.addUserMessage(text)
    chat.appendAIMessage({ type: 'text', content: '请使用上方快捷命令开始整理。' })
  }
}

function handleStartProcess() {
  processor.start(chat)
}

function handleStartReorganize() {
  reorganizer.start(chat)
}

function handleConfirmProposal(_msgId: string, keepOldFolders: boolean) {
  reorganizer.confirm(chat, keepOldFolders)
}

function handleModifyProposal(_msgId: string) {
  // The input stays active so the user can describe the requested adjustment.
}

function handleToggleThinking(msgId: string) {
  const msg = chat.messages.value.find(m => m.id === msgId)
  if (msg) chat.updateMessage(msgId, { thinkingCollapsed: !msg.thinkingCollapsed })
}
</script>

<template>
  <aside class="sidebar" :style="{ width: `${sidebarWidth}px` }">
    <div class="drag-handle" @mousedown="onDragStart" />

    <div class="sidebar-header">
      <span class="sidebar-title">AI 整理</span>
      <div class="header-actions">
        <button class="btn-icon" title="新建会话" @click="chat.newConversation()">✦</button>
        <button class="btn-icon" title="AI 设置" @click="openSettings">⚙</button>
      </div>
    </div>

    <EmptyState
      v-if="!hasMessages"
      @start-process="handleStartProcess"
      @start-reorganize="handleStartReorganize"
    />
    <ChatMessages
      v-else
      :messages="chat.messages.value"
      @confirm-proposal="handleConfirmProposal"
      @modify-proposal="handleModifyProposal"
      @toggle-thinking="handleToggleThinking"
    />

    <ChatInput :disabled="isDisabled" @send="handleSend" />
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
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.header-actions { display: flex; gap: 6px; }
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
</style>

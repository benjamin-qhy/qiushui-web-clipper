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

// ── Drag resize ──────────────────────────────────────────────
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

// ── Chat logic ────────────────────────────────────────────────
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
  // Focuses attention to input box — user types modification request there
}

function handleToggleThinking(msgId: string) {
  const msg = chat.messages.value.find(m => m.id === msgId)
  if (msg) chat.updateMessage(msgId, { thinkingCollapsed: !msg.thinkingCollapsed })
}
</script>

<template>
  <aside class="sidebar" :style="{ width: `${sidebarWidth}px` }">
    <!-- Drag handle -->
    <div class="drag-handle" @mousedown="onDragStart" />

    <!-- Header -->
    <div class="sidebar-header">
      <span class="sidebar-title">AI 整理</span>
      <div class="header-actions">
        <button class="btn-icon" title="新建会话" @click="chat.newConversation()">✦</button>
        <button class="btn-icon" title="AI 设置" @click="openSettings">⚙</button>
      </div>
    </div>

    <!-- Messages or Empty state -->
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

    <!-- Input -->
    <ChatInput :disabled="isDisabled" @send="handleSend" />
  </aside>
</template>

<style scoped>
.sidebar {
  position: relative;
  flex-shrink: 0;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fafafa;
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
.drag-handle:hover { background: #b39ddb; }
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.sidebar-title { font-size: 14px; font-weight: 600; color: #333; }
.header-actions { display: flex; gap: 6px; }
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #888;
  padding: 0 2px;
  line-height: 1;
}
.btn-icon:hover { color: #444; }
</style>

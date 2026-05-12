<!-- entrypoints/bookmarks/components/ai/ChatMessages.vue -->
<script setup lang="ts">
import { nextTick, watch, ref } from 'vue'
import type { ChatMessage } from '../../../../src/ai/chat-types'
import CategoryProposal from './CategoryProposal.vue'

const props = defineProps<{ messages: ChatMessage[] }>()
const emit = defineEmits<{
  confirmProposal: [msgId: string, keepOldFolders: boolean]
  modifyProposal: [msgId: string]
  toggleThinking: [msgId: string]
}>()

const listEl = ref<HTMLElement | null>(null)

watch(() => props.messages.length, async () => {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
})
</script>

<template>
  <div class="messages" ref="listEl">
    <div
      v-for="msg in messages"
      :key="msg.id"
      :class="['msg-wrap', msg.role]"
    >
      <!-- User message -->
      <div v-if="msg.role === 'user'" class="bubble user-bubble">
        {{ msg.content }}
      </div>

      <!-- AI text / summary -->
      <div v-else-if="msg.type === 'text' || msg.type === 'summary'" class="bubble ai-bubble">
        {{ msg.content }}
      </div>

      <!-- AI thinking stream -->
      <div v-else-if="msg.type === 'thinking'" class="thinking-block">
        <div class="thinking-header" @click="$emit('toggleThinking', msg.id)">
          <span class="thinking-toggle">{{ msg.thinkingCollapsed ? '▶' : '▼' }}</span>
          <span class="thinking-title">{{ msg.content || '正在处理...' }}</span>
        </div>
        <div v-if="!msg.thinkingCollapsed" class="thinking-lines">
          <div
            v-for="(line, i) in msg.thinkingLines"
            :key="i"
            :class="['thinking-line', line.status]"
          >
            <span class="line-icon">{{ { ok: '✓', error: '✗', skip: '–' }[line.status] }}</span>
            {{ line.text }}
          </div>
        </div>
      </div>

      <!-- Category proposal card -->
      <div v-else-if="msg.type === 'category-proposal'" class="proposal-wrap">
        <CategoryProposal
          :tree="msg.categoryTree ?? []"
          @confirm="(keep) => $emit('confirmProposal', msg.id, keep)"
          @modify="$emit('modifyProposal', msg.id)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.msg-wrap { display: flex; }
.msg-wrap.user { justify-content: flex-end; }
.msg-wrap.ai { justify-content: flex-start; }
.bubble {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}
.user-bubble { background: #6e4dc4; color: #fff; border-bottom-right-radius: 3px; }
.ai-bubble { background: #fff; border: 1px solid #e0e0e0; border-bottom-left-radius: 3px; color: #222; }
.proposal-wrap { width: 100%; }
.thinking-block {
  width: 100%;
  background: #f9f9f9;
  border: 1px solid #ebebeb;
  border-radius: 8px;
  overflow: hidden;
}
.thinking-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  user-select: none;
}
.thinking-toggle { font-size: 10px; color: #999; }
.thinking-title { font-size: 12px; color: #888; }
.thinking-lines { padding: 4px 10px 8px; display: flex; flex-direction: column; gap: 2px; }
.thinking-line {
  font-size: 11px;
  color: #aaa;
  display: flex;
  gap: 6px;
  align-items: flex-start;
}
.thinking-line.ok .line-icon { color: #4caf50; }
.thinking-line.error { color: #f44336; }
.thinking-line.error .line-icon { color: #f44336; }
.thinking-line.skip .line-icon { color: #bbb; }
</style>

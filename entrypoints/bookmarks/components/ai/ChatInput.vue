<!-- entrypoints/bookmarks/components/ai/ChatInput.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ send: [text: string] }>()

const text = ref('')

function handleSend() {
  const trimmed = text.value.trim()
  if (!trimmed || props.disabled) return
  emit('send', trimmed)
  text.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="chat-input">
    <textarea
      v-model="text"
      class="input"
      placeholder="输入消息… (Enter 发送，Shift+Enter 换行)"
      rows="3"
      :disabled="disabled"
      @keydown="handleKeydown"
    />
    <button class="send-btn" :disabled="disabled || !text.trim()" @click="handleSend">
      发送
    </button>
  </div>
</template>

<style scoped>
.chat-input {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
  flex-shrink: 0;
}
.input {
  flex: 1;
  resize: none;
  border: none;
  border-bottom: 1px solid var(--color-border);
  padding: 6px 8px;
  font-size: 14px;
  font-family: var(--font-ui);
  outline: none;
  line-height: 1.5;
  background: transparent;
  color: var(--color-text);
}
.input:focus { border-bottom-color: var(--color-accent); }
.input:disabled { opacity: 0.5; }
.send-btn {
  align-self: flex-end;
  padding: 6px 14px;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 2px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  font-family: var(--font-ui);
}
.send-btn:hover { opacity: 0.85; }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>

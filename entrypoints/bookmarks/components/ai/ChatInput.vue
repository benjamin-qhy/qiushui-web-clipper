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
  padding: 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.input {
  flex: 1;
  resize: none;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  line-height: 1.5;
}
.input:focus { border-color: #6e4dc4; }
.input:disabled { background: #f5f5f5; }
.send-btn {
  align-self: flex-end;
  padding: 8px 14px;
  background: #6e4dc4;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>

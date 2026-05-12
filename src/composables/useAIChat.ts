import { ref } from 'vue'
import type { ChatMessage, MessageType, ThinkingLine, CategoryNode } from '../ai/chat-types'

let idCounter = 0
function nextId(): string {
  return `msg-${Date.now()}-${++idCounter}`
}

export function useAIChat() {
  const messages = ref<ChatMessage[]>([])
  const input = ref('')
  const isLoading = ref(false)

  function addUserMessage(text: string): void {
    messages.value = [...messages.value, {
      id: nextId(),
      role: 'user',
      type: 'text',
      content: text,
    }]
  }

  function appendAIMessage(partial: {
    type: MessageType
    content: string
    thinkingLines?: ThinkingLine[]
    categoryTree?: CategoryNode[]
  }): string {
    const id = nextId()
    messages.value = [...messages.value, {
      id,
      role: 'ai',
      thinkingCollapsed: false,
      ...partial,
    }]
    return id
  }

  function updateMessage(id: string, patch: Partial<ChatMessage>): void {
    messages.value = messages.value.map(m =>
      m.id === id ? { ...m, ...patch } : m
    )
  }

  function newConversation(): void {
    messages.value = []
    input.value = ''
    isLoading.value = false
  }

  return { messages, input, isLoading, addUserMessage, appendAIMessage, updateMessage, newConversation }
}

export type AIChatInstance = ReturnType<typeof useAIChat>

import { describe, it, expect } from 'vitest'
import { useAIChat } from '../../src/composables/useAIChat'

describe('useAIChat', () => {
  it('starts with empty messages', () => {
    const chat = useAIChat()
    expect(chat.messages.value).toEqual([])
  })

  it('addUserMessage appends a user message', () => {
    const chat = useAIChat()
    chat.addUserMessage('hello')
    expect(chat.messages.value).toHaveLength(1)
    expect(chat.messages.value[0].role).toBe('user')
    expect(chat.messages.value[0].content).toBe('hello')
    expect(chat.messages.value[0].type).toBe('text')
  })

  it('appendAIMessage returns the new message id', () => {
    const chat = useAIChat()
    const id = chat.appendAIMessage({ type: 'text', content: 'hi' })
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
    const msg = chat.messages.value.find(m => m.id === id)
    expect(msg?.role).toBe('ai')
    expect(msg?.content).toBe('hi')
  })

  it('updateMessage patches an existing message', () => {
    const chat = useAIChat()
    const id = chat.appendAIMessage({ type: 'thinking', content: '', thinkingLines: [] })
    chat.updateMessage(id, { thinkingLines: [{ text: 'line1', status: 'ok' }] })
    const msg = chat.messages.value.find(m => m.id === id)
    expect(msg?.thinkingLines).toHaveLength(1)
    expect(msg?.thinkingLines![0].text).toBe('line1')
  })

  it('newConversation clears all messages and input', () => {
    const chat = useAIChat()
    chat.addUserMessage('hello')
    chat.input.value = 'typing'
    chat.newConversation()
    expect(chat.messages.value).toEqual([])
    expect(chat.input.value).toBe('')
  })

  it('isLoading starts false', () => {
    const chat = useAIChat()
    expect(chat.isLoading.value).toBe(false)
  })
})

import { ref } from 'vue'
import type { DocContent, MessageRequest, MessageResponse } from '../types'

export function useDocContent() {
  const doc = ref<DocContent | null>(null)
  const error = ref<string | null>(null)
  const isLoading = ref(false)

  async function fetch() {
    isLoading.value = true
    error.value = null
    doc.value = null

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error('无法获取当前标签页')

      const msg: MessageRequest = { type: 'EXTRACT_DOC' }
      const response: MessageResponse = await chrome.tabs.sendMessage(tab.id, msg)

      if (!response.ok) throw new Error(response.error)
      doc.value = response.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      isLoading.value = false
    }
  }

  return { doc, error, isLoading, fetch }
}

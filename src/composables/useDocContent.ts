import { ref } from 'vue'
import { browser } from 'wxt/browser'
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
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error('无法获取当前标签页')

      const msg: MessageRequest = { type: 'EXTRACT_DOC' }
      const response: MessageResponse = await browser.tabs.sendMessage(tab.id, msg)

      if (!response.ok) throw new Error(response.error)
      if (!('data' in response)) throw new Error('响应格式错误')
      doc.value = response.data
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('Could not establish connection') || msg.includes('Receiving end does not exist')) {
        error.value = '当前页面不支持，请在飞书或金山文档页面使用此插件'
      } else {
        error.value = msg
      }
    } finally {
      isLoading.value = false
    }
  }

  return { doc, error, isLoading, fetch }
}

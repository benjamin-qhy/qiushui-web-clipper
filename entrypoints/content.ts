import { defineContentScript } from 'wxt/utils/define-content-script'
import type { MessageRequest, MessageResponse, DocContent } from '../src/types'
import { scrollToLoadAll } from '../src/extractor/scroll'
import { extractBlocks } from '../src/extractor/blocks'

export default defineContentScript({
  matches: ['*://*.feishu.cn/docx/*', '*://*.feishu.cn/wiki/*'],

  main() {
    chrome.runtime.onMessage.addListener(
      (message: MessageRequest, _sender, sendResponse: (r: MessageResponse) => void) => {
        if (message.type === 'EXTRACT_DOC') {
          extractDoc().then(sendResponse).catch(err =>
            sendResponse({ ok: false, error: String(err) })
          )
          return true // 保持 sendResponse 有效（异步回调必须）
        }
      }
    )
  },
})

async function extractDoc(): Promise<MessageResponse> {
  const container = await scrollToLoadAll()
  if (!container) {
    return { ok: false, error: '找不到飞书文档内容容器，请确认当前页面是飞书文档。' }
  }

  const blocks = extractBlocks(container)
  const titleBlock = blocks.find(b => b.type === 'page')
  const title = titleBlock?.spans?.map(s => s.text).join('') ??
    document.title.replace(' - 飞书文档', '').trim()

  const author = extractMeta('author') ?? extractMeta('feishu:creator')
  const published = extractMeta('article:published_time') ??
    extractMeta('feishu:create_time')

  const data: DocContent = {
    title,
    source: location.href,
    author: author ?? undefined,
    published: published ? published.slice(0, 10) : undefined,
    created: new Date().toISOString().slice(0, 10),
    blocks: blocks.filter(b => b.type !== 'page'),
  }

  return { ok: true, data }
}

function extractMeta(name: string): string | null {
  return (
    document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ??
    document.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ??
    null
  )
}

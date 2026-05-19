import type { AIProvider } from '../ai/types'

interface AIResult {
  summary: string
  tags: string[]
  category: string
}

export function buildPrompt(title: string, url: string, pageText: string): string {
  const content = pageText.slice(0, 2000)
  return `你是一个书签整理助手。根据以下网页信息，输出一个 JSON 对象。

标题: ${title}
URL: ${url}
正文摘要: ${content}

输出格式（仅输出 JSON，不要其他内容）：
{"summary":"一句话描述网页核心内容，50字以内，中文","tags":["标签1","标签2","标签3"],"category":"分类名称（中文）"}`
}

export function parseAIResult(raw: string): AIResult {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((t): t is string => typeof t === 'string')
        : [],
      category: typeof parsed.category === 'string' && parsed.category ? parsed.category : '未分类',
    }
  } catch {
    return { summary: '', tags: [], category: '未分类' }
  }
}

export async function processBookmark(
  title: string,
  url: string,
  pageText: string,
  aiProvider: AIProvider,
): Promise<AIResult> {
  const prompt = buildPrompt(title, url, pageText)
  const raw = await aiProvider.complete(prompt)
  return parseAIResult(raw)
}

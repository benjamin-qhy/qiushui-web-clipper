export type MessageRole = 'user' | 'ai'
export type MessageType = 'text' | 'thinking' | 'category-proposal' | 'summary'

export interface ThinkingLine {
  text: string
  status: 'ok' | 'error' | 'skip'
}

export interface CategoryNode {
  name: string
  children?: CategoryNode[]
}

export interface ChatMessage {
  id: string
  role: MessageRole
  type: MessageType
  content: string
  thinkingLines?: ThinkingLine[]
  thinkingCollapsed?: boolean
  categoryTree?: CategoryNode[]
}

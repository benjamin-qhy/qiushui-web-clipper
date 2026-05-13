export interface AIProvider {
  complete(prompt: string): Promise<string>
  testConnection(): Promise<void>
}

export interface AIResult {
  summary: string
  tags: string[]
  category: string
}

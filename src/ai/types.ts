export interface AIProvider {
  complete(prompt: string): Promise<string>
}

export interface AIResult {
  summary: string
  tags: string[]
  category: string
}

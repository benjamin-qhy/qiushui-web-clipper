import type { AIConfig } from '../storage/settings'
import type { AIProvider } from './types'

export class OpenAICompatibleProvider implements AIProvider {
  constructor(private config: AIConfig) {}

  async complete(prompt: string): Promise<string> {
    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) throw new Error(`AI API error: ${res.status}`)
    const data = await res.json() as { choices: { message: { content: string } }[] }
    return data.choices[0]?.message?.content ?? ''
  }
}

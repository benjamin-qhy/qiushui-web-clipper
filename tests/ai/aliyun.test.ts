import { describe, it, expect, vi } from 'vitest'
import { OpenAICompatibleProvider } from '../../src/ai/aliyun'

describe('OpenAICompatibleProvider', () => {
  it('returns content from successful API response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"summary":"摘要","tags":["前端"],"category":"技术"}' } }],
      }),
    } as unknown as Response)

    const provider = new OpenAICompatibleProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
      model: 'test-model',
    })
    const result = await provider.complete('prompt')
    expect(result).toBe('{"summary":"摘要","tags":["前端"],"category":"技术"}')
  })

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response)
    const provider = new OpenAICompatibleProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: '',
      model: '',
    })
    await expect(provider.complete('prompt')).rejects.toThrow('AI API error: 401')
  })
})

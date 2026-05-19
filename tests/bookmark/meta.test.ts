import { describe, it, expect } from 'vitest'
import { buildMetaFromDom } from '../../src/bookmark/meta'

describe('buildMetaFromDom', () => {
  it('returns title, keywords, description', () => {
    const result = buildMetaFromDom('React 文档', 'react,hooks', '一个 JS 框架')
    expect(result).toEqual({
      title: 'React 文档',
      keywords: 'react,hooks',
      description: '一个 JS 框架',
    })
  })

  it('allows empty strings for missing meta', () => {
    const result = buildMetaFromDom('标题', '', '')
    expect(result.keywords).toBe('')
    expect(result.description).toBe('')
  })
})

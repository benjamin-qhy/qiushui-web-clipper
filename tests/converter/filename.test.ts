import { describe, it, expect } from 'vitest'
import { sanitizeFilename, resolveFilename } from '../../src/converter/filename'

describe('sanitizeFilename', () => {
  it('normal title', () => {
    expect(sanitizeFilename('我的会议记录')).toBe('我的会议记录')
  })

  it('strips illegal chars', () => {
    expect(sanitizeFilename('file/name:test*?')).toBe('filenametest')
  })

  it('trims whitespace', () => {
    expect(sanitizeFilename('  hello  ')).toBe('hello')
  })

  it('fallback for empty result', () => {
    expect(sanitizeFilename('///**')).toBe('untitled')
  })
})

describe('resolveFilename', () => {
  it('no conflict returns original', () => {
    expect(resolveFilename('note', new Set())).toBe('note')
  })

  it('conflict adds -1 suffix', () => {
    expect(resolveFilename('note', new Set(['note']))).toBe('note-1')
  })

  it('increments suffix until no conflict', () => {
    expect(resolveFilename('note', new Set(['note', 'note-1', 'note-2']))).toBe('note-3')
  })
})

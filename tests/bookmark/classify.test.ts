import { describe, it, expect } from 'vitest'
import {
  buildFolderPaths,
  buildFolderPathMap,
  buildClassifyPrompt,
  buildTitlePrompt,
  parseFolder,
  parseTitle,
} from '../../src/bookmark/classify'
import type { PageMeta } from '../../src/bookmark/meta'

const makeNode = (id: string, title: string, parentId: string, children: object[] = []) => ({
  id, title, parentId, index: 0, dateAdded: 0, children,
})

const sampleTree = [
  makeNode('1', '书签栏', '0', [
    makeNode('2', '工作', '1', [
      makeNode('3', '前端', '2', []),
    ]),
    makeNode('4', '学习', '1', []),
    { id: '5', title: 'React 官网', url: 'https://react.dev', parentId: '1', index: 2, dateAdded: 0 },
  ]),
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tree = sampleTree as any

describe('buildFolderPaths', () => {
  it('returns flat list of folder paths', () => {
    const paths = buildFolderPaths(tree)
    expect(paths).toContain('书签栏')
    expect(paths).toContain('书签栏/工作')
    expect(paths).toContain('书签栏/工作/前端')
    expect(paths).toContain('书签栏/学习')
  })

  it('skips bookmark nodes (nodes with url)', () => {
    const paths = buildFolderPaths(tree)
    expect(paths).not.toContain('书签栏/React 官网')
  })
})

describe('buildFolderPathMap', () => {
  it('maps path to folder id', () => {
    const map = buildFolderPathMap(tree)
    expect(map.get('书签栏/工作/前端')).toBe('3')
    expect(map.get('书签栏/学习')).toBe('4')
  })

  it('does not include bookmark nodes', () => {
    const map = buildFolderPathMap(tree)
    expect(map.has('书签栏/React 官网')).toBe(false)
  })
})

describe('buildClassifyPrompt', () => {
  const meta: PageMeta = { title: 'React', keywords: 'frontend,hooks', description: 'A JS library' }

  it('puts user system prompt and folder list in system part', () => {
    const { system } = buildClassifyPrompt(meta, 'https://react.dev', ['书签栏/前端'], '自定义指令')
    expect(system).toContain('自定义指令')
    expect(system).toContain('书签栏/前端')
    expect(system).toContain('{"folder":')
  })

  it('puts meta info in user part', () => {
    const { user } = buildClassifyPrompt(meta, 'https://react.dev', [], '指令')
    expect(user).toContain('React')
    expect(user).toContain('https://react.dev')
    expect(user).toContain('frontend,hooks')
  })
})

describe('buildTitlePrompt', () => {
  it('includes meta info and output format constraint', () => {
    const meta: PageMeta = { title: 'GitHub', keywords: '', description: 'Code hosting' }
    const prompt = buildTitlePrompt(meta, 'https://github.com')
    expect(prompt).toContain('GitHub')
    expect(prompt).toContain('https://github.com')
    expect(prompt).toContain('{"title":')
  })
})

describe('parseFolder', () => {
  it('parses valid JSON folder path', () => {
    expect(parseFolder('{"folder":"书签栏/工作/前端"}')).toBe('书签栏/工作/前端')
  })

  it('returns 其他 on invalid JSON', () => {
    expect(parseFolder('not json')).toBe('其他')
  })

  it('returns 其他 when folder field is empty string', () => {
    expect(parseFolder('{"folder":""}')).toBe('其他')
  })

  it('returns 其他 when folder field is missing', () => {
    expect(parseFolder('{}')).toBe('其他')
  })
})

describe('parseTitle', () => {
  it('parses valid JSON title', () => {
    expect(parseTitle('{"title":"GitHub - 代码托管平台"}', '原标题')).toBe('GitHub - 代码托管平台')
  })

  it('returns fallback on invalid JSON', () => {
    expect(parseTitle('bad json', '原标题')).toBe('原标题')
  })

  it('returns fallback when title field is empty', () => {
    expect(parseTitle('{"title":""}', '原标题')).toBe('原标题')
  })
})

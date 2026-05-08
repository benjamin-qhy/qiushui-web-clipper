import { ref } from 'vue'
import { saveToVault } from '../filesystem/save'
import { buildFrontmatter } from '../converter/frontmatter'
import { blocksToMarkdown } from '../converter/blocks'
import type { DocContent } from '../types'

export function useFileSave() {
  const savedFilename = ref<string | null>(null)
  const error = ref<string | null>(null)
  const isSaving = ref(false)

  async function save(
    vaultHandle: FileSystemDirectoryHandle,
    doc: DocContent,
    subDir: string
  ) {
    isSaving.value = true
    error.value = null
    savedFilename.value = null

    try {
      const frontmatter = buildFrontmatter(doc)
      const body = blocksToMarkdown(doc.blocks)
      const content = `${frontmatter}\n${body}\n`

      const filename = await saveToVault(vaultHandle, subDir, doc.title, content)
      savedFilename.value = filename
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      isSaving.value = false
    }
  }

  async function copyToClipboard(doc: DocContent) {
    const frontmatter = buildFrontmatter(doc)
    const body = blocksToMarkdown(doc.blocks)
    const content = `${frontmatter}\n${body}\n`
    await navigator.clipboard.writeText(content)
  }

  return { savedFilename, error, isSaving, save, copyToClipboard }
}

import { ref } from 'vue'
import {
  getVaultHandle,
  setVaultHandle,
  clearVaultHandle,
  verifyVaultPermission,
} from '../storage/vault'

export function useVaultStore() {
  const handle = ref<FileSystemDirectoryHandle | null>(null)
  const isAuthorized = ref(false)
  const isLoading = ref(false)

  async function init() {
    isLoading.value = true
    try {
      const stored = await getVaultHandle()
      if (stored) {
        const valid = await verifyVaultPermission(stored)
        if (valid) {
          handle.value = stored
          isAuthorized.value = true
        } else {
          await clearVaultHandle()
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  async function authorize() {
    const dir = await window.showDirectoryPicker({ mode: 'readwrite' })
    await setVaultHandle(dir)
    handle.value = dir
    isAuthorized.value = true
  }

  return { handle, isAuthorized, isLoading, init, authorize }
}

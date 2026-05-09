import { ref } from 'vue'
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '../storage/settings'
import type { Settings } from '../storage/settings'

export function useSettings() {
  const settings = ref<Settings>({ ...DEFAULT_SETTINGS, aliyunOSS: { ...DEFAULT_SETTINGS.aliyunOSS } })
  const isSaving = ref(false)
  const saveStatus = ref<'idle' | 'saved' | 'error'>('idle')

  async function load() {
    settings.value = await getSettings()
  }

  async function save() {
    isSaving.value = true
    try {
      await saveSettings(settings.value)
      saveStatus.value = 'saved'
      setTimeout(() => { saveStatus.value = 'idle' }, 2000)
    } catch {
      saveStatus.value = 'error'
    } finally {
      isSaving.value = false
    }
  }

  return { settings, isSaving, saveStatus, load, save }
}

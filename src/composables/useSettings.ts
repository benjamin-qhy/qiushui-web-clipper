import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '../storage/settings'
import type { Settings } from '../storage/settings'

export function useSettings() {
  const settings = ref<Settings>({ ...DEFAULT_SETTINGS, aliyunOSS: { ...DEFAULT_SETTINGS.aliyunOSS } })
  const isSaving = ref(false)
  const saveStatus = ref<'idle' | 'saved' | 'error'>('idle')
  let resetStatusTimer: ReturnType<typeof setTimeout> | undefined
  let latestSaveId = 0

  async function load() {
    settings.value = await getSettings()
  }

  function getSettingsSnapshot(): Settings {
    return {
      ...settings.value,
      aliyunOSS: { ...settings.value.aliyunOSS },
    }
  }

  function clearResetStatusTimer() {
    if (resetStatusTimer !== undefined) {
      clearTimeout(resetStatusTimer)
      resetStatusTimer = undefined
    }
  }

  function scheduleResetStatus() {
    clearResetStatusTimer()
    resetStatusTimer = setTimeout(() => {
      saveStatus.value = 'idle'
      resetStatusTimer = undefined
    }, 2000)
  }

  if (getCurrentScope()) {
    onScopeDispose(clearResetStatusTimer)
  }

  async function save() {
    const saveId = ++latestSaveId
    isSaving.value = true
    clearResetStatusTimer()
    try {
      await saveSettings(getSettingsSnapshot())
      if (saveId !== latestSaveId) {
        return
      }
      saveStatus.value = 'saved'
      scheduleResetStatus()
    } catch {
      if (saveId !== latestSaveId) {
        return
      }
      saveStatus.value = 'error'
    } finally {
      if (saveId === latestSaveId) {
        isSaving.value = false
      }
    }
  }

  return { settings, isSaving, saveStatus, load, save }
}

import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '../storage/settings'
import type { Settings } from '../storage/settings'

export function useSettings() {
  const settings = ref<Settings>({ ...DEFAULT_SETTINGS, aliyunOSS: { ...DEFAULT_SETTINGS.aliyunOSS } })
  const isSaving = ref(false)
  const saveStatus = ref<'idle' | 'saved' | 'error'>('idle')
  let resetStatusTimer: ReturnType<typeof setTimeout> | undefined

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
    isSaving.value = true
    clearResetStatusTimer()
    try {
      await saveSettings(getSettingsSnapshot())
      saveStatus.value = 'saved'
      scheduleResetStatus()
    } catch {
      saveStatus.value = 'error'
    } finally {
      isSaving.value = false
    }
  }

  return { settings, isSaving, saveStatus, load, save }
}

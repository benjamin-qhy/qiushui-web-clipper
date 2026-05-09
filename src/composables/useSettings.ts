import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '../storage/settings'
import type { Settings } from '../storage/settings'

export function useSettings() {
  const settings = ref<Settings>({ ...DEFAULT_SETTINGS, aliyunOSS: { ...DEFAULT_SETTINGS.aliyunOSS } })
  const isSaving = ref(false)
  const saveStatus = ref<'idle' | 'saved' | 'error'>('idle')
  let resetStatusTimer: ReturnType<typeof setTimeout> | undefined
  let latestSaveId = 0
  let pendingSave: { id: number; snapshot: Settings } | undefined
  let saveQueue: Promise<void> | undefined

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

  function scheduleResetStatus(saveId: number) {
    clearResetStatusTimer()
    resetStatusTimer = setTimeout(() => {
      if (saveId !== latestSaveId) {
        resetStatusTimer = undefined
        return
      }
      saveStatus.value = 'idle'
      resetStatusTimer = undefined
    }, 2000)
  }

  if (getCurrentScope()) {
    onScopeDispose(clearResetStatusTimer)
  }

  function flushPendingSaves() {
    if (saveQueue) {
      return saveQueue
    }

    saveQueue = (async () => {
      try {
        while (pendingSave) {
          const currentSave = pendingSave
          pendingSave = undefined

          try {
            await saveSettings(currentSave.snapshot)
            if (currentSave.id !== latestSaveId) {
              continue
            }
            saveStatus.value = 'saved'
            scheduleResetStatus(currentSave.id)
          } catch {
            if (currentSave.id !== latestSaveId) {
              continue
            }
            saveStatus.value = 'error'
          }
        }
      } finally {
        saveQueue = undefined
        if (!pendingSave) {
          isSaving.value = false
        }
      }
    })()

    return saveQueue
  }

  async function save() {
    pendingSave = { id: ++latestSaveId, snapshot: getSettingsSnapshot() }
    isSaving.value = true
    clearResetStatusTimer()
    await flushPendingSaves()
  }

  return { settings, isSaving, saveStatus, load, save }
}

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { browser } from 'wxt/browser'
import { getAllBookmarkRecords } from '../../../src/storage/bookmarks'
import { exportCategoriesToVault } from '../../../src/bookmark/export'
import { getVaultHandle } from '../../../src/storage/vault'
import { getSettings } from '../../../src/storage/settings'
import type { ProcessingStatus } from '../../../src/storage/bookmarks'

const status = ref<ProcessingStatus>({
  state: 'idle',
  total: 0,
  processed: 0,
  duplicatesRemoved: 0,
  deadLinksRemoved: 0,
  lastRunAt: null,
})
const isTriggering = ref(false)
const isExporting = ref(false)
const exportResult = ref<string | null>(null)
const exportError = ref<string | null>(null)
const aiConfigured = ref(true)

onMounted(async () => {
  await refreshStatus()
  const settings = await getSettings()
  aiConfigured.value = !!settings.aiConfig.apiKey.trim()
})

async function refreshStatus() {
  const res = await browser.runtime.sendMessage({ type: 'GET_PROCESSING_STATUS' }) as ProcessingStatus
  if (res && res.state) status.value = res
}

async function triggerProcessing() {
  isTriggering.value = true
  exportResult.value = null
  exportError.value = null
  await browser.runtime.sendMessage({ type: 'PROCESS_BOOKMARKS' })
  await refreshStatus()
  isTriggering.value = false
}

async function handleExport() {
  isExporting.value = true
  exportResult.value = null
  exportError.value = null
  try {
    const vaultHandle = await getVaultHandle()
    if (!vaultHandle) {
      exportError.value = '请先在设置中配置 Obsidian Vault 目录'
      return
    }
    const settings = await getSettings()
    const records = await getAllBookmarkRecords()
    if (records.length === 0) {
      exportResult.value = '暂无已处理书签可导出'
      return
    }
    await exportCategoriesToVault(vaultHandle, settings.bookmarkSubDir, records)
    exportResult.value = `已导出 ${records.length} 条书签到 Obsidian`
  } catch (e) {
    exportError.value = e instanceof Error ? e.message : String(e)
  } finally {
    isExporting.value = false
  }
}

function openSettings() {
  browser.runtime.openOptionsPage()
}

function formatDate(ts: number | null): string {
  if (!ts) return '从未'
  return new Date(ts).toLocaleString('zh-CN')
}

const canTrigger = computed(() => aiConfigured.value && !isTriggering.value && status.value.state !== 'running')
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <span class="sidebar-title">AI 整理</span>
      <button class="btn-config" title="AI 设置" @click="openSettings">⚙</button>
    </div>

    <div v-if="!aiConfigured" class="ai-unconfigured">
      <p>尚未配置 AI API Key</p>
      <button class="btn-link" @click="openSettings">前往配置 →</button>
    </div>

    <div class="status-card">
      <div class="status-row">
        <span class="label">状态</span>
        <span :class="['badge', status.state]">
          {{ { idle: '空闲', running: '处理中', done: '完成', error: '错误' }[status.state] }}
        </span>
      </div>

      <div v-if="status.state === 'running'" class="progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: status.total ? `${(status.processed / status.total) * 100}%` : '0%' }" />
        </div>
        <span class="progress-text">{{ status.processed }} / {{ status.total }}</span>
      </div>

      <div v-if="status.duplicatesRemoved > 0" class="stat">✓ 去重 {{ status.duplicatesRemoved }} 条</div>
      <div v-if="status.deadLinksRemoved > 0" class="stat">✓ 死链 {{ status.deadLinksRemoved }} 条</div>
      <div v-if="status.error" class="error-msg">✗ {{ status.error }}</div>
      <div class="last-run">上次：{{ formatDate(status.lastRunAt) }}</div>
    </div>

    <div class="actions">
      <button class="btn-primary" :disabled="!canTrigger" @click="triggerProcessing">
        {{ isTriggering ? '触发中…' : '立即整理' }}
      </button>
      <button class="btn-secondary" :disabled="isExporting" @click="handleExport">
        {{ isExporting ? '导出中…' : '导出到 Obsidian' }}
      </button>
    </div>

    <p v-if="exportResult" class="success">✓ {{ exportResult }}</p>
    <p v-if="exportError" class="error-msg">✗ {{ exportError }}</p>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  flex-shrink: 0;
  border-left: 1px solid #e0e0e0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  background: #fafafa;
}
.sidebar-header { display: flex; align-items: center; justify-content: space-between; }
.sidebar-title { font-size: 14px; font-weight: 600; color: #333; }
.btn-config { background: none; border: none; cursor: pointer; font-size: 16px; color: #888; padding: 0; }
.btn-config:hover { color: #444; }
.ai-unconfigured {
  padding: 10px; background: #fff8e1; border: 1px solid #ffe082;
  border-radius: 6px; font-size: 12px; color: #795548;
}
.ai-unconfigured p { margin: 0 0 6px; }
.btn-link { background: none; border: none; cursor: pointer; font-size: 12px; color: #6e4dc4; padding: 0; text-decoration: underline; }
.status-card { padding: 12px; border: 1px solid #e0e0e0; border-radius: 6px; background: #fff; }
.status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.label { font-size: 12px; color: #555; }
.badge { padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
.badge.idle { background: #f0f0f0; color: #666; }
.badge.running { background: #e8f0fe; color: #1a73e8; }
.badge.done { background: #e6f4ea; color: #2e7d32; }
.badge.error { background: #fce8e6; color: #c62828; }
.progress { margin-bottom: 8px; }
.progress-bar { height: 4px; background: #e0e0e0; border-radius: 2px; overflow: hidden; margin-bottom: 3px; }
.progress-fill { height: 100%; background: #6e4dc4; transition: width 0.3s; }
.progress-text { font-size: 11px; color: #666; }
.stat { font-size: 11px; color: #2e7d32; }
.last-run { font-size: 11px; color: #aaa; margin-top: 6px; }
.actions { display: flex; flex-direction: column; gap: 6px; }
.btn-primary {
  width: 100%; padding: 8px; background: #6e4dc4; color: #fff;
  border: none; border-radius: 6px; font-size: 13px; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary {
  width: 100%; padding: 8px; background: #f5f5f5; color: #222;
  border: 1px solid #ccc; border-radius: 6px; font-size: 13px; cursor: pointer;
}
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.success { color: #2e7d32; font-size: 12px; margin: 0; }
.error-msg { color: #c62828; font-size: 12px; margin: 0; }
</style>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { browser } from 'wxt/browser'
import { getAllBookmarkRecords } from '../../src/storage/bookmarks'
import { exportCategoriesToVault } from '../../src/bookmark/export'
import { getVaultHandle } from '../../src/storage/vault'
import type { ProcessingStatus } from '../../src/storage/bookmarks'

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

async function refreshStatus() {
  const res = await browser.runtime.sendMessage({ type: 'GET_PROCESSING_STATUS' }) as ProcessingStatus
  if (res && res.state) status.value = res
}

onMounted(refreshStatus)

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
    const { getSettings } = await import('../../src/storage/settings')
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

function formatDate(ts: number | null): string {
  if (!ts) return '从未'
  return new Date(ts).toLocaleString('zh-CN')
}
</script>

<template>
  <main class="page">
    <h1 class="title">秋水 · 书签整理</h1>

    <section class="card">
      <div class="status-row">
        <span class="label">状态</span>
        <span :class="['badge', status.state]">{{ { idle: '空闲', running: '处理中', done: '完成', error: '错误' }[status.state] }}</span>
      </div>

      <div v-if="status.state === 'running'" class="progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: status.total ? `${(status.processed / status.total) * 100}%` : '0%' }" />
        </div>
        <span class="progress-text">{{ status.processed }} / {{ status.total }}</span>
      </div>

      <div v-if="status.duplicatesRemoved > 0" class="stat">✓ 去重：删除 {{ status.duplicatesRemoved }} 条重复</div>
      <div v-if="status.deadLinksRemoved > 0" class="stat">✓ 死链：删除 {{ status.deadLinksRemoved }} 条失效</div>
      <div v-if="status.error" class="error-msg">✗ {{ status.error }}</div>

      <div class="last-run">上次整理：{{ formatDate(status.lastRunAt) }}</div>
    </section>

    <div class="actions">
      <button class="btn-primary" :disabled="isTriggering || status.state === 'running'" @click="triggerProcessing">
        {{ isTriggering ? '触发中…' : '立即整理' }}
      </button>
      <button class="btn-secondary" :disabled="isExporting" @click="handleExport">
        {{ isExporting ? '导出中…' : '导出到 Obsidian' }}
      </button>
    </div>

    <p v-if="exportResult" class="success">✓ {{ exportResult }}</p>
    <p v-if="exportError" class="error-msg">✗ {{ exportError }}</p>
  </main>
</template>

<style scoped>
.page {
  max-width: 480px;
  margin: 0 auto;
  padding: 32px 24px;
  font-family: system-ui, -apple-system, sans-serif;
  color: #222;
}
.title { margin: 0 0 24px; font-size: 20px; font-weight: 600; }
.card {
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  margin-bottom: 20px;
}
.status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.label { color: #555; font-size: 13px; }
.badge { padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.badge.idle { background: #f0f0f0; color: #666; }
.badge.running { background: #e8f0fe; color: #1a73e8; }
.badge.done { background: #e6f4ea; color: #2e7d32; }
.badge.error { background: #fce8e6; color: #c62828; }
.progress { margin-bottom: 12px; }
.progress-bar { height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
.progress-fill { height: 100%; background: #6e4dc4; transition: width 0.3s; }
.progress-text { font-size: 12px; color: #666; }
.stat { font-size: 13px; color: #2e7d32; margin-bottom: 4px; }
.last-run { font-size: 12px; color: #888; margin-top: 12px; }
.actions { display: flex; gap: 10px; margin-bottom: 12px; }
.btn-primary {
  flex: 1; padding: 10px; background: #6e4dc4; color: #fff;
  border: none; border-radius: 6px; font-size: 14px; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  flex: 1; padding: 10px; background: #f5f5f5; color: #222;
  border: 1px solid #ccc; border-radius: 6px; font-size: 14px; cursor: pointer;
}
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
.success { color: #2e7d32; font-size: 13px; margin: 0; }
.error-msg { color: #c62828; font-size: 13px; margin: 0; }
</style>

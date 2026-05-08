<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useVaultStore } from '../../src/composables/useVaultStore'
import { useDocContent } from '../../src/composables/useDocContent'
import { useFileSave } from '../../src/composables/useFileSave'

const vault = useVaultStore()
const docContent = useDocContent()
const fileSave = useFileSave()

const subDir = ref('Clippings')
const propertiesOpen = ref(true)
const showDropdown = ref(false)

const editableTitle = ref('')
const editableTags = ref('clippings')

onMounted(async () => {
  await vault.init()
  await docContent.fetch()
  if (docContent.doc.value) {
    editableTitle.value = docContent.doc.value.title
  }
})

const doc = computed(() => docContent.doc.value)
const isFeishuDoc = computed(() => doc.value !== null || docContent.isLoading.value)

const previewLines = computed(() => {
  if (!doc.value) return []
  const lines: string[] = []
  for (const block of doc.value.blocks) {
    if (block.spans) lines.push(block.spans.map(s => s.text).join(''))
    if (lines.length >= 5) break
  }
  return lines
})

async function handleSave() {
  if (!vault.handle.value || !doc.value) return
  const mergedDoc = {
    ...doc.value,
    title: editableTitle.value || doc.value.title,
  }
  await fileSave.save(vault.handle.value, mergedDoc, subDir.value)
  showDropdown.value = false
}

async function handleCopy() {
  if (!doc.value) return
  const mergedDoc = {
    ...doc.value,
    title: editableTitle.value || doc.value.title,
  }
  await fileSave.copyToClipboard(mergedDoc)
  showDropdown.value = false
}
</script>

<template>
  <div class="popup">
    <!-- 非飞书文档页 -->
    <div v-if="!isFeishuDoc && !docContent.isLoading.value" class="empty-state">
      <p>请在飞书文档页面使用此插件</p>
    </div>

    <!-- 加载中 -->
    <div v-else-if="docContent.isLoading.value" class="loading">
      <p>正在提取文档内容…</p>
    </div>

    <!-- 主界面 -->
    <template v-else-if="doc">
      <!-- 标题 -->
      <h2 class="doc-title">{{ doc.title }}</h2>

      <!-- 属性面板 -->
      <div class="properties">
        <button class="properties-toggle" @click="propertiesOpen = !propertiesOpen">
          属性 {{ propertiesOpen ? '∧' : '∨' }}
        </button>
        <div v-if="propertiesOpen" class="properties-body">
          <div class="prop-row">
            <span class="prop-icon">≡</span>
            <span class="prop-label">title</span>
            <input v-model="editableTitle" class="prop-input" />
          </div>
          <div class="prop-row">
            <span class="prop-icon">≡</span>
            <span class="prop-label">source</span>
            <span class="prop-value truncate">{{ doc.source }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-icon">≡</span>
            <span class="prop-label">author</span>
            <span class="prop-value">{{ doc.author ? `[[${doc.author}]]` : '' }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-icon">📅</span>
            <span class="prop-label">published</span>
            <span class="prop-value">{{ doc.published ?? '' }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-icon">📅</span>
            <span class="prop-label">created</span>
            <span class="prop-value">{{ doc.created }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-icon">≡</span>
            <span class="prop-label">tags</span>
            <input v-model="editableTags" class="prop-input" />
          </div>
        </div>
      </div>

      <!-- 内容预览 -->
      <div class="preview">
        <p v-for="(line, i) in previewLines" :key="i" class="preview-line">{{ line }}</p>
      </div>

      <!-- 目录输入 + 保存按钮 -->
      <div class="footer">
        <input v-model="subDir" class="dir-input" placeholder="Clippings" />

        <!-- 未授权 vault -->
        <button v-if="!vault.isAuthorized.value" class="btn-authorize" @click="vault.authorize()">
          选择 Obsidian Vault 目录
        </button>

        <!-- 已授权，显示保存按钮 -->
        <div v-else class="save-row">
          <button
            class="btn-save"
            :disabled="fileSave.isSaving.value"
            @click="handleSave"
          >
            {{ fileSave.isSaving.value ? '保存中…' : '保存到 Obsidian' }}
          </button>
          <button class="btn-dropdown" @click="showDropdown = !showDropdown">▼</button>
          <div v-if="showDropdown" class="dropdown">
            <button @click="handleCopy">复制 Markdown</button>
          </div>
        </div>

        <!-- 保存结果 -->
        <p v-if="fileSave.savedFilename.value" class="success">
          ✓ 已保存到 {{ subDir }}/{{ fileSave.savedFilename.value }}
        </p>
        <p v-if="fileSave.error.value" class="error-msg">{{ fileSave.error.value }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.popup { width: 380px; min-height: 200px; font-family: sans-serif; padding: 12px; }
.doc-title { font-size: 15px; font-weight: 600; margin: 0 0 8px; line-height: 1.4; }
.properties { border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 8px; }
.properties-toggle { background: none; border: none; width: 100%; text-align: left;
  padding: 8px 12px; cursor: pointer; font-size: 13px; color: #555; }
.properties-body { padding: 4px 12px 8px; }
.prop-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; }
.prop-icon { width: 16px; text-align: center; color: #888; }
.prop-label { width: 70px; color: #666; flex-shrink: 0; }
.prop-input { flex: 1; border: none; border-bottom: 1px solid #ddd; font-size: 12px;
  outline: none; padding: 1px 2px; }
.prop-value { flex: 1; color: #333; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.truncate { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.preview { background: #f9f9f9; border-radius: 4px; padding: 8px; margin-bottom: 8px;
  font-size: 12px; color: #444; max-height: 80px; overflow: hidden; }
.preview-line { margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.footer { display: flex; flex-direction: column; gap: 6px; }
.dir-input { border: 1px solid #ccc; border-radius: 6px; padding: 8px 12px;
  font-size: 13px; outline: none; }
.save-row { display: flex; gap: 2px; position: relative; }
.btn-save { flex: 1; background: #6e4dc4; color: white; border: none; border-radius: 6px 0 0 6px;
  padding: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-dropdown { background: #6e4dc4; color: white; border: none; border-radius: 0 6px 6px 0;
  padding: 10px 12px; cursor: pointer; }
.dropdown { position: absolute; bottom: 44px; right: 0; background: white;
  border: 1px solid #ddd; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); z-index: 10; }
.dropdown button { display: block; width: 100%; padding: 8px 16px; border: none;
  background: none; cursor: pointer; font-size: 13px; text-align: left; }
.dropdown button:hover { background: #f5f5f5; }
.btn-authorize { background: #6e4dc4; color: white; border: none; border-radius: 6px;
  padding: 10px; font-size: 14px; cursor: pointer; }
.success { color: #2e7d32; font-size: 12px; margin: 0; }
.error-msg { color: #c62828; font-size: 12px; margin: 0; }
.loading, .empty-state { padding: 20px; text-align: center; color: #666; font-size: 13px; }
</style>

<script setup lang="ts">
import { browser } from 'wxt/browser'
import { ref, computed, onMounted } from 'vue'
import { useVaultStore } from '../../src/composables/useVaultStore'
import { useDocContent } from '../../src/composables/useDocContent'
import { useFileSave } from '../../src/composables/useFileSave'
import { getSettings } from '../../src/storage/settings'

const vault = useVaultStore()
const docContent = useDocContent()
const fileSave = useFileSave()

const propertiesOpen = ref(true)
const showDropdown = ref(false)
const ossIncomplete = ref(false)

const editableTitle = ref('')
const editableSource = ref('')
const editableAuthor = ref('')
const editablePublished = ref('')
const editableCreated = ref('')
const editableDescription = ref('')
const editableTags = ref('clippings')

onMounted(async () => {
  await vault.init()
  await docContent.fetch()
  if (docContent.doc.value) {
    const d = docContent.doc.value
    editableTitle.value = d.title
    editableSource.value = d.source
    editableAuthor.value = d.author ?? ''
    editablePublished.value = d.published ?? ''
    editableCreated.value = d.created
    editableDescription.value = d.description ?? ''
  }

  const settings = await getSettings()
  if (settings.imageMode === 'oss') {
    const cfg = settings.aliyunOSS
    ossIncomplete.value = !cfg.accessKeyId.trim() || !cfg.accessKeySecret.trim() || !cfg.bucket.trim()
  }
})

const doc = computed(() => docContent.doc.value)
const isFeishuDoc = computed(() => doc.value !== null || docContent.isLoading.value)

const previewText = computed(() => {
  if (!doc.value) return ''
  return doc.value.blocks
    .filter(b => b.spans)
    .map(b => b.spans!.map(s => s.text).join(''))
    .filter(line => line.trim())
    .join('\n')
})

function mergedDoc() {
  return {
    ...doc.value!,
    title: editableTitle.value || doc.value!.title,
    source: editableSource.value,
    author: editableAuthor.value || undefined,
    published: editablePublished.value || undefined,
    created: editableCreated.value,
    description: editableDescription.value || undefined,
  }
}

async function handleSave() {
  if (!vault.handle.value || !doc.value) return
  await fileSave.save(vault.handle.value, mergedDoc())
  showDropdown.value = false
}

async function handleCopy() {
  if (!doc.value) return
  await fileSave.copyToClipboard(mergedDoc())
  showDropdown.value = false
}

function openSettings() {
  return browser.runtime.openOptionsPage()
}

function openBookmarks() {
  browser.tabs.create({ url: '/bookmarks.html' })
}
</script>

<template>
  <div class="popup">
    <!-- 非飞书文档页 / 提取失败 -->
    <div v-if="!isFeishuDoc && !docContent.isLoading.value" class="empty-state">
      <p v-if="docContent.error.value" class="error-msg">{{ docContent.error.value }}</p>
      <p v-else>请在飞书文档页面使用此插件</p>
    </div>

    <!-- 加载中 -->
    <div v-else-if="docContent.isLoading.value" class="loading">
      <p>正在提取文档内容…</p>
    </div>

    <!-- 主界面 -->
    <template v-else-if="doc">
      <!-- 标题 + 设置入口 -->
      <div class="title-row">
        <h2 class="doc-title">{{ doc.title }}</h2>
        <button class="btn-gear" title="设置" @click="openSettings">⚙</button>
        <button class="btn-bookmark" title="整理书签" @click="openBookmarks">⊞</button>
      </div>

      <!-- 中间可滚动区域 -->
      <div class="middle">

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
            <input v-model="editableSource" class="prop-input" />
          </div>
          <div class="prop-row">
            <span class="prop-icon">≡</span>
            <span class="prop-label">author</span>
            <input v-model="editableAuthor" class="prop-input" />
          </div>
          <div class="prop-row">
            <span class="prop-icon">📅</span>
            <span class="prop-label">published</span>
            <input v-model="editablePublished" class="prop-input" />
          </div>
          <div class="prop-row">
            <span class="prop-icon">📅</span>
            <span class="prop-label">created</span>
            <input v-model="editableCreated" class="prop-input" />
          </div>
          <div class="prop-row prop-row-desc">
            <span class="prop-icon">≡</span>
            <span class="prop-label">description</span>
            <textarea v-model="editableDescription" class="prop-textarea" rows="3" />
          </div>
          <div class="prop-row">
            <span class="prop-icon">≡</span>
            <span class="prop-label">tags</span>
            <input v-model="editableTags" class="prop-input" />
          </div>
        </div>
      </div>

      <!-- 内容预览 -->
      <textarea class="preview" readonly :value="previewText" />

      </div><!-- end .middle -->

      <!-- 底部操作区 -->
      <div class="footer">
        <template v-if="!vault.isAuthorized.value && !vault.needsReauth.value && !vault.isLoading.value">
          <p class="warn-msg">请先在设置中配置 Vault 目录</p>
          <button class="btn-authorize" @click="openSettings">去设置</button>
        </template>

        <template v-else-if="vault.needsReauth.value">
          <button class="btn-authorize" @click="vault.reauthorize()">点击授权访问 Vault</button>
        </template>

        <template v-else-if="ossIncomplete">
          <p class="warn-msg">OSS 配置不完整</p>
          <button class="btn-authorize" @click="openSettings">去设置</button>
        </template>

        <template v-else>
          <div class="save-row">
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
              <button @click="vault.changeVault()">更换 Vault 目录</button>
            </div>
          </div>
        </template>

        <!-- 保存结果 -->
        <p v-if="fileSave.savedFilename.value" class="success">
          ✓ 已保存：{{ fileSave.savedFilename.value }}
        </p>
        <p v-if="fileSave.error.value" class="error-msg">{{ fileSave.error.value }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 整体容器：固定高度，分三层（标题 / 中间滚动 / 底部固定） */
.popup {
  width: 380px;
  max-height: 580px;
  font-family: sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.title-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 12px 0 8px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.doc-title {
  font-size: 15px; font-weight: 600; margin: 0; line-height: 1.4;
  flex: 1;
}
.btn-gear { background: none; border: none; cursor: pointer; font-size: 16px; color: #888;
  padding: 0 2px; line-height: 1; flex-shrink: 0; }
.btn-gear:hover { color: #444; }
.btn-bookmark { background: none; border: none; cursor: pointer; font-size: 16px; color: #888;
  padding: 0 2px; line-height: 1; flex-shrink: 0; }
.btn-bookmark:hover { color: #444; }
/* 中间区域可滚动 */
.middle {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 0;
}
.properties { border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 8px; }
.properties-toggle { background: none; border: none; width: 100%; text-align: left;
  padding: 8px 0; cursor: pointer; font-size: 13px; color: #555; }
.properties-body { padding: 4px 0 8px; }
.prop-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; }
.prop-icon { width: 16px; text-align: center; color: #888; }
.prop-label { width: 70px; color: #666; flex-shrink: 0; }
.prop-input { flex: 1; min-width: 0; border: none; border-bottom: 1px solid #ddd; font-size: 12px;
  outline: none; padding: 1px 2px; overflow: hidden; }
.prop-row-desc { align-items: flex-start; }
.prop-textarea { flex: 1; border: 1px solid #ddd; border-radius: 3px; font-size: 11px;
  outline: none; padding: 2px 4px; resize: vertical; font-family: sans-serif; line-height: 1.4; }
.preview { background: #f9f9f9; border: 1px solid #e8e8e8; border-radius: 4px; padding: 8px;
  font-size: 12px; color: #444; width: 100%; box-sizing: border-box;
  min-height: 120px; resize: vertical; font-family: sans-serif; line-height: 1.5;
  outline: none; }
/* 底部固定 */
.footer { flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; padding: 8px 0 12px; border-top: 1px solid #f0f0f0; }
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
.warn-msg { color: #b45309; font-size: 12px; margin: 0; }
.success { color: #2e7d32; font-size: 12px; margin: 0; }
.error-msg { color: #c62828; font-size: 12px; margin: 0; }
.loading, .empty-state { padding: 20px; text-align: center; color: #666; font-size: 13px; }
</style>

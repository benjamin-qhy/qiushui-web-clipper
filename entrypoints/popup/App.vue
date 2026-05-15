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
        <span class="header-brand">Qiushui</span>
        <button class="btn-settings" @click="openSettings">设置</button>
        <button class="btn-bookmarks" @click="openBookmarks">书签</button>
      </div>

      <div class="doc-meta">
        <h2 class="doc-title">{{ doc.title }}</h2>
        <p class="doc-source">Feishu · Article</p>
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
            <span class="prop-label">title</span>
            <input v-model="editableTitle" class="prop-input" />
          </div>
          <div class="prop-row">
            <span class="prop-label">source</span>
            <input v-model="editableSource" class="prop-input" />
          </div>
          <div class="prop-row">
            <span class="prop-label">author</span>
            <input v-model="editableAuthor" class="prop-input" />
          </div>
          <div class="prop-row">
            <span class="prop-label">published</span>
            <input v-model="editablePublished" class="prop-input" />
          </div>
          <div class="prop-row">
            <span class="prop-label">created</span>
            <input v-model="editableCreated" class="prop-input" />
          </div>
          <div class="prop-row prop-row-desc">
            <span class="prop-label">description</span>
            <textarea v-model="editableDescription" class="prop-textarea" rows="3" />
          </div>
          <div class="prop-row">
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
.popup {
  width: 380px;
  max-height: 580px;
  font-family: var(--font-ui);
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 16px;
}

/* Header */
.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0 10px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.header-brand {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--color-text);
  flex: 1;
}
.btn-settings {
  font-size: 11px;
  background: var(--color-dark);
  color: #fff;
  border: none;
  padding: 3px 9px;
  border-radius: 2px;
  cursor: pointer;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.btn-settings:hover { opacity: 0.8; }
.btn-bookmarks {
  font-size: 11px;
  background: var(--color-accent);
  color: #fff;
  border: none;
  padding: 3px 9px;
  border-radius: 2px;
  cursor: pointer;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.btn-bookmarks:hover { opacity: 0.85; }

/* Doc title area */
.doc-meta { padding: 10px 0 0; flex-shrink: 0; }
.doc-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 3px;
  line-height: 1.4;
}
.doc-source {
  font-size: 7px;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 600;
  margin: 0 0 8px;
}

/* Middle scrollable */
.middle {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 8px;
  min-height: 0;
}

/* Properties */
.properties { margin-bottom: 8px; }
.properties-toggle {
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  padding: 6px 0;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: 6px;
}
.properties-body { padding: 2px 0 4px; }
.prop-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.prop-label {
  width: 56px;
  font-size: 6.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-text-muted);
  text-align: right;
  flex-shrink: 0;
}
.prop-input {
  flex: 1;
  min-width: 0;
  border: none;
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text);
  font-family: var(--font-ui);
  outline: none;
  padding: 2px 4px;
  background: transparent;
}
.prop-input:focus { border-bottom-color: var(--color-accent); }
.prop-row-desc { align-items: flex-start; }
.prop-textarea {
  flex: 1;
  border: none;
  border-bottom: 1px solid var(--color-border);
  font-size: 11px;
  font-family: var(--font-ui);
  color: var(--color-text);
  outline: none;
  padding: 2px 4px;
  resize: vertical;
  line-height: 1.5;
  background: transparent;
}
.prop-textarea:focus { border-bottom-color: var(--color-accent); }

/* Preview */
.preview {
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  padding: 10px 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
  font-family: var(--font-content);
  line-height: 1.7;
  width: 100%;
  box-sizing: border-box;
  min-height: 100px;
  resize: vertical;
  outline: none;
  border-radius: 2px;
}

/* Footer */
.footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0 14px;
  border-top: 1px solid var(--color-border-light);
}
.save-row { display: flex; gap: 1px; position: relative; }
.btn-save {
  flex: 1;
  background: var(--color-dark);
  color: #fff;
  border: none;
  padding: 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 2px 0 0 2px;
  font-family: var(--font-ui);
}
.btn-save:hover { opacity: 0.85; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-dropdown {
  background: var(--color-dark);
  color: #fff;
  border: none;
  border-left: 1px solid rgba(255,255,255,0.15);
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 0 2px 2px 0;
}
.btn-dropdown:hover { opacity: 0.85; }
.dropdown {
  position: absolute;
  bottom: 44px;
  right: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  z-index: 10;
  min-width: 140px;
}
.dropdown button {
  display: block;
  width: 100%;
  padding: 8px 14px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  text-align: left;
  color: var(--color-text);
  font-family: var(--font-ui);
}
.dropdown button:hover { background: var(--color-surface); }
.btn-authorize {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 2px;
  padding: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font-ui);
}
.btn-authorize:hover { opacity: 0.85; }
.warn-msg { color: #b45309; font-size: 11px; margin: 0; }
.success { color: #2e7d32; font-size: 11px; margin: 0; }
.error-msg { color: #c62828; font-size: 11px; margin: 0; }
.loading, .empty-state {
  padding: 40px 0;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 12px;
}
</style>

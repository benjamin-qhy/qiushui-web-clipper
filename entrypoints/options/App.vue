<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSettings } from '../../src/composables/useSettings'
import { useVaultStore } from '../../src/composables/useVaultStore'

const { settings, isSaving, saveStatus, load, save } = useSettings()
const vault = useVaultStore()

const showSecret = ref(false)
const showAISecret = ref(false)
const testStatus = ref<'idle' | 'testing' | 'ok' | 'fail'>('idle')
const testError = ref('')
const aiTestStatus = ref<'idle' | 'testing' | 'ok' | 'fail'>('idle')
const aiTestError = ref('')

const ossRegions = [
  { value: 'oss-cn-hangzhou', label: '华东1（杭州）' },
  { value: 'oss-cn-shanghai', label: '华东2（上海）' },
  { value: 'oss-cn-beijing', label: '华北2（北京）' },
  { value: 'oss-cn-shenzhen', label: '华南1（深圳）' },
  { value: 'oss-cn-chengdu', label: '西南1（成都）' },
  { value: 'oss-cn-hongkong', label: '中国香港' },
]

const version = '2.0.0'
const mainEl = ref<HTMLElement | null>(null)
const activeSection = ref('vault')
const sectionIds = ['vault', 'images', 'ai', 'org', 'inbox']

let observer: IntersectionObserver | null = null

function scrollTo(id: string) {
  const el = document.getElementById(`section-${id}`)
  if (el && mainEl.value) {
    mainEl.value.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' })
  }
}

function setupObserver() {
  if (!mainEl.value) return
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = entry.target.id.replace('section-', '')
          activeSection.value = id
          break
        }
      }
    },
    { root: mainEl.value, threshold: 0.3 }
  )
  for (const id of sectionIds) {
    const el = document.getElementById(`section-${id}`)
    if (el) observer.observe(el)
  }
}

onUnmounted(() => observer?.disconnect())

onMounted(async () => {
  await load()
  await vault.init()
  await nextTick()
  setupObserver()
})

const vaultName = computed(() => vault.handle.value?.name ?? null)
const vaultButtonLabel = computed(() => {
  if (vault.needsReauth.value) return '重新授权'
  return vaultName.value ? '重新选择' : '选择目录'
})

const ossPathPreview = computed(() => {
  const prefix = settings.value.aliyunOSS.prefix.trim().replace(/^\/+|\/+$/g, '')
  const prefixPath = prefix ? `${prefix}/` : ''
  return `${prefixPath}202605/笔记标题-20260509143022583.png`
})

function resetTestStatus() {
  testStatus.value = 'idle'
  testError.value = ''
}

function resetAITestStatus() {
  aiTestStatus.value = 'idle'
  aiTestError.value = ''
}

function handleVaultAction() {
  if (vault.needsReauth.value) {
    return vault.reauthorize()
  }
  return vault.authorize()
}

watch(
  () => [
    settings.value.imageMode,
    settings.value.ossProvider,
    settings.value.aliyunOSS.accessKeyId,
    settings.value.aliyunOSS.accessKeySecret,
    settings.value.aliyunOSS.bucket,
    settings.value.aliyunOSS.region,
    settings.value.aliyunOSS.prefix,
    settings.value.aliyunOSS.customDomain,
  ],
  () => {
    resetTestStatus()
  },
)

watch(
  () => [
    settings.value.aiConfig.baseUrl,
    settings.value.aiConfig.apiKey,
    settings.value.aiConfig.model,
  ],
  () => {
    resetAITestStatus()
  },
)

async function testConnection() {
  const config = settings.value.aliyunOSS
  if (
    !config.accessKeyId.trim() ||
    !config.accessKeySecret.trim() ||
    !config.bucket.trim() ||
    !config.region.trim()
  ) {
    testStatus.value = 'fail'
    testError.value = '请先填写完整的 OSS 连接信息'
    return
  }

  testStatus.value = 'testing'
  testError.value = ''

  try {
    const { AliyunOSSUploader } = await import('../../src/uploader/aliyun')
    const uploader = new AliyunOSSUploader(config)
    const transparentPng1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    await uploader.upload({
      base64: transparentPng1x1,
      mimeType: 'image/png',
      notename: '.connection-test',
      source: 'feishu',
    })

    testStatus.value = 'ok'
  } catch (error) {
    testStatus.value = 'fail'
    testError.value = error instanceof Error ? error.message : String(error)
  }
}

async function testAIModel() {
  const config = settings.value.aiConfig
  if (!config.baseUrl.trim() || !config.apiKey.trim() || !config.model.trim()) {
    aiTestStatus.value = 'fail'
    aiTestError.value = '请先填写完整的 AI 配置信息'
    return
  }

  aiTestStatus.value = 'testing'
  aiTestError.value = ''

  try {
    const { createAIProvider } = await import('../../src/ai')
    const provider = createAIProvider({
      baseUrl: config.baseUrl.trim(),
      apiKey: config.apiKey.trim(),
      model: config.model.trim(),
    })
    await provider.testConnection()
    aiTestStatus.value = 'ok'
  } catch (error) {
    aiTestStatus.value = 'fail'
    aiTestError.value = error instanceof Error ? error.message : String(error)
  }
}
</script>

<template>
  <div class="settings-layout">
    <!-- Left nav -->
    <nav class="settings-nav">
      <div class="nav-header">
        <div class="nav-brand">Qiushui Clipper</div>
        <div class="nav-title">Settings</div>
      </div>
      <div class="nav-body">
        <div class="nav-group-label">General</div>
        <a class="nav-item" :class="{ active: activeSection === 'vault' }" href="#section-vault" @click.prevent="scrollTo('vault')">Vault</a>
        <a class="nav-item" :class="{ active: activeSection === 'images' }" href="#section-images" @click.prevent="scrollTo('images')">Images</a>
        <a class="nav-item" :class="{ active: activeSection === 'ai' }" href="#section-ai" @click.prevent="scrollTo('ai')">AI Model</a>
        <div class="nav-group-label">Bookmarks</div>
        <a class="nav-item" :class="{ active: activeSection === 'org' }" href="#section-org" @click.prevent="scrollTo('org')">Organization</a>
        <a class="nav-item" :class="{ active: activeSection === 'inbox' }" href="#section-inbox" @click.prevent="scrollTo('inbox')">Inbox</a>
      </div>
      <div class="nav-footer">v{{ version }}</div>
    </nav>

    <!-- Right content -->
    <main class="settings-main" ref="mainEl">

      <div class="main-topbar">
        <div></div>
        <button class="btn-save" type="button" :disabled="isSaving" @click="save">
          {{ isSaving ? 'Saving…' : 'Save Settings' }}
        </button>
      </div>

      <!-- Vault -->
      <section id="section-vault" class="settings-section">
        <div class="section-header">
          <h2 class="section-title">Vault</h2>
          <p class="section-desc">Obsidian 笔记库配置</p>
        </div>
        <div class="field">
          <label class="field-label">Vault Path</label>
          <div class="vault-row">
            <span class="vault-name">{{ vaultName ?? '未选择' }}</span>
            <button class="btn-secondary" type="button" @click="handleVaultAction">{{ vaultButtonLabel }}</button>
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="sub-dir">Sub Directory</label>
          <input id="sub-dir" v-model="settings.subDir" class="field-input" placeholder="Clippings" />
          <p class="field-hint">笔记会保存到 Vault 下的此子目录，留空则保存到根目录。</p>
        </div>
      </section>

      <div class="section-divider"></div>

      <!-- Images -->
      <section id="section-images" class="settings-section">
        <div class="section-header">
          <h2 class="section-title">Images</h2>
          <p class="section-desc">图片存储方式</p>
        </div>
        <div class="field">
          <label class="field-label">Image Mode</label>
          <div class="mode-group">
            <button
              class="mode-btn"
              :class="{ active: settings.imageMode === 'local' }"
              type="button"
              @click="settings.imageMode = 'local'"
            >Local</button>
            <button
              class="mode-btn"
              :class="{ active: settings.imageMode === 'oss' }"
              type="button"
              @click="settings.imageMode = 'oss'"
            >Aliyun OSS</button>
          </div>
          <p class="field-hint">Local: 图片保存到 .assets 子目录</p>
        </div>

        <template v-if="settings.imageMode === 'oss'">
          <div class="field">
            <label class="field-label" for="access-key-id">Access Key ID</label>
            <input id="access-key-id" v-model="settings.aliyunOSS.accessKeyId" class="field-input" autocomplete="off" />
          </div>
          <div class="field">
            <label class="field-label" for="access-key-secret">Access Key Secret</label>
            <div class="secret-row">
              <input id="access-key-secret" v-model="settings.aliyunOSS.accessKeySecret" :type="showSecret ? 'text' : 'password'" class="field-input" autocomplete="off" />
              <button class="btn-secondary" type="button" @click="showSecret = !showSecret">{{ showSecret ? '隐藏' : '显示' }}</button>
            </div>
          </div>
          <div class="field">
            <label class="field-label" for="oss-bucket">Bucket</label>
            <input id="oss-bucket" v-model="settings.aliyunOSS.bucket" class="field-input" autocomplete="off" />
          </div>
          <div class="field">
            <label class="field-label" for="oss-region">Region</label>
            <select id="oss-region" v-model="settings.aliyunOSS.region" class="field-input field-select">
              <option v-for="region in ossRegions" :key="region.value" :value="region.value">{{ region.label }}</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="oss-prefix">Path Prefix</label>
            <input id="oss-prefix" v-model="settings.aliyunOSS.prefix" class="field-input" placeholder="qiushui-web-clipper" />
            <p class="field-hint preview-path">{{ ossPathPreview }}</p>
          </div>
          <div class="field">
            <label class="field-label" for="oss-custom-domain">Custom Domain</label>
            <input id="oss-custom-domain" v-model="settings.aliyunOSS.customDomain" class="field-input" placeholder="https://img.example.com" autocomplete="off" />
          </div>
          <div class="field test-row">
            <button class="btn-secondary" type="button" :disabled="testStatus === 'testing'" @click="testConnection">
              {{ testStatus === 'testing' ? '测试中…' : '测试连接' }}
            </button>
            <span v-if="testStatus === 'ok'" class="status-ok">✓ 连接成功</span>
            <span v-else-if="testStatus === 'fail'" class="status-fail">✗ {{ testError }}</span>
          </div>
        </template>
      </section>

      <div class="section-divider"></div>

      <!-- AI Model -->
      <section id="section-ai" class="settings-section">
        <div class="section-header">
          <h2 class="section-title">AI Model</h2>
          <p class="section-desc">AI 模型配置</p>
        </div>
        <div class="field">
          <label class="field-label" for="ai-base-url">Base URL</label>
          <input id="ai-base-url" v-model="settings.aiConfig.baseUrl" class="field-input" placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1" />
          <p class="field-hint">支持任意 OpenAI 兼容接口</p>
        </div>
        <div class="field">
          <label class="field-label" for="ai-api-key">API Key</label>
          <div class="secret-row">
            <input id="ai-api-key" v-model="settings.aiConfig.apiKey" :type="showAISecret ? 'text' : 'password'" class="field-input" autocomplete="off" />
            <button class="btn-secondary" type="button" @click="showAISecret = !showAISecret">{{ showAISecret ? '隐藏' : '显示' }}</button>
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="ai-model">Model</label>
          <input id="ai-model" v-model="settings.aiConfig.model" class="field-input" placeholder="qwen-long" />
        </div>
        <div class="field test-row">
          <button class="btn-secondary" type="button" :disabled="aiTestStatus === 'testing'" @click="testAIModel">
            {{ aiTestStatus === 'testing' ? '测试中…' : '测试模型' }}
          </button>
          <span v-if="aiTestStatus === 'ok'" class="status-ok">✓ 模型可用</span>
          <span v-else-if="aiTestStatus === 'fail'" class="status-fail">✗ {{ aiTestError }}</span>
        </div>
      </section>

      <div class="section-divider"></div>

      <!-- Organization -->
      <section id="section-org" class="settings-section">
        <div class="section-header">
          <h2 class="section-title">Organization</h2>
          <p class="section-desc">书签整理配置</p>
        </div>
        <div class="field">
          <label class="field-label" for="bookmark-inbox">Inbox Folder</label>
          <input id="bookmark-inbox" v-model="settings.bookmarkInboxFolder" class="field-input" placeholder="待整理" />
          <p class="field-hint">将书签收藏到该文件夹后，插件会自动整理其中的内容。</p>
        </div>
        <div class="field">
          <label class="field-label" for="bookmark-sub-dir">Obsidian Sub Directory</label>
          <input id="bookmark-sub-dir" v-model="settings.bookmarkSubDir" class="field-input" placeholder="Bookmarks" />
          <p class="field-hint">整理后的书签笔记将保存到 Vault 下的此子目录中。</p>
        </div>
      </section>

      <div class="section-divider"></div>

      <!-- Inbox -->
      <section id="section-inbox" class="settings-section">
        <div class="section-header">
          <h2 class="section-title">Inbox</h2>
          <p class="section-desc">自动处理设置</p>
        </div>
        <div class="field">
          <label class="field-label" for="process-interval">Process Interval (hours)</label>
          <input id="process-interval" v-model.number="settings.processInterval" class="field-input" type="number" min="1" max="168" style="max-width: 120px;" />
        </div>
      </section>

      <div class="section-divider"></div>

      <div class="bottom-save">
        <span v-if="saveStatus === 'saved'" class="status-ok">✓ 已保存</span>
        <span v-else-if="saveStatus === 'error'" class="status-fail">保存失败</span>
        <button class="btn-save" type="button" :disabled="isSaving" @click="save">
          {{ isSaving ? 'Saving…' : 'Save Settings' }}
        </button>
      </div>

    </main>
  </div>
</template>

<style scoped>
.settings-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  font-family: var(--font-ui);
  background: var(--color-base);
  color: var(--color-text);
}

/* Left Nav */
.settings-nav {
  width: 200px;
  flex-shrink: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.nav-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--color-border);
}
.nav-brand {
  font-size: 7px;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 3px;
}
.nav-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.3px;
}
.nav-body {
  flex: 1;
  padding: 14px 0;
  overflow-y: auto;
}
.nav-group-label {
  font-size: 6px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 8px 20px 6px;
  margin-top: 4px;
}
.nav-group-label:first-child { margin-top: 0; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 0;
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: 13px;
  padding: 7px 20px;
  cursor: pointer;
  transition: color 0.1s;
  border-left: 2px solid transparent;
  margin-left: -1px;
}
.nav-item:hover { color: var(--color-text); }
.nav-item.active {
  color: var(--color-text);
  font-weight: 600;
  border-left-color: var(--color-accent);
}
.nav-footer {
  padding: 12px 20px;
  font-size: 11px;
  color: var(--color-text-muted);
  border-top: 1px solid var(--color-border);
}

/* Right Main */
.settings-main {
  flex: 1;
  overflow-y: auto;
  background: var(--color-bg);
}
.main-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 12px 40px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border-light);
}
.settings-section {
  padding: 28px 40px;
}
.section-header { margin-bottom: 20px; }
.section-title {
  margin: 0 0 3px;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}
.section-desc {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}
.section-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 0 40px;
}
.field { margin-bottom: 18px; max-width: 520px; }
.field:last-child { margin-bottom: 0; }
.field-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-text-muted);
  margin-bottom: 7px;
}
.field-input {
  box-sizing: border-box;
  width: 100%;
  background: var(--color-surface);
  border: none;
  border-bottom: 1px solid var(--color-border);
  padding: 8px 10px;
  font-size: 13px;
  color: var(--color-text);
  font-family: var(--font-ui);
  outline: none;
}
.field-input:focus { border-bottom-color: var(--color-accent); }
.field-select { cursor: pointer; }
.field-hint {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.5;
}
.preview-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  word-break: break-all;
}
.vault-row, .secret-row, .test-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.vault-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 8px 10px;
}
.secret-row .field-input { flex: 1; }
.mode-group { display: flex; gap: 6px; margin-bottom: 6px; }
.mode-btn {
  padding: 6px 18px;
  background: var(--color-bg);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font-ui);
  letter-spacing: 0.3px;
}
.mode-btn:hover { border-color: var(--color-text-muted); }
.mode-btn.active {
  background: var(--color-dark);
  color: #fff;
  border-color: var(--color-dark);
}
.btn-secondary {
  padding: 7px 16px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  font-family: var(--font-ui);
}
.btn-secondary:hover { border-color: var(--color-text-muted); color: var(--color-text); }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-save {
  padding: 8px 22px;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 2px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  font-family: var(--font-ui);
}
.btn-save:hover { opacity: 0.85; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.status-ok { color: #2e7d32; font-size: 12px; }
.status-fail { color: #c62828; font-size: 12px; word-break: break-word; }
.bottom-save {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px 40px 40px;
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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

onMounted(async () => {
  await load()
  await vault.init()
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
  <main class="page">
    <h1 class="title">秋水 · 网页剪藏 · 设置</h1>

    <section class="section">
      <h2 class="section-title">Vault 配置</h2>

      <div class="field">
        <label class="label">Obsidian Vault 目录</label>
        <div class="vault-row">
          <span class="vault-name">{{ vaultName ?? '未选择' }}</span>
          <button class="btn-secondary" type="button" @click="handleVaultAction">
            {{ vaultButtonLabel }}
          </button>
        </div>
      </div>

      <div class="field">
        <label class="label" for="sub-dir">默认子目录</label>
        <input id="sub-dir" v-model="settings.subDir" class="input" placeholder="Clippings" />
        <p class="hint">笔记会保存到 Vault 下的此子目录中，留空则保存到 Vault 根目录。</p>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">图片处理方式</h2>

      <div class="radio-group">
        <label class="radio-label">
          <input v-model="settings.imageMode" type="radio" value="local" />
          保存到本地 Vault
        </label>
        <label class="radio-label">
          <input v-model="settings.imageMode" type="radio" value="oss" />
          上传到云存储
        </label>
      </div>
    </section>

    <section v-if="settings.imageMode === 'oss'" class="section">
      <h2 class="section-title">云存储配置</h2>

      <div class="field">
        <label class="label" for="oss-provider">云存储平台</label>
        <select id="oss-provider" v-model="settings.ossProvider" class="input">
          <option value="aliyun">阿里云 OSS</option>
        </select>
      </div>

      <template v-if="settings.ossProvider === 'aliyun'">
        <div class="divider-label">阿里云 OSS</div>

        <div class="field">
          <label class="label" for="access-key-id">Access Key ID</label>
          <input id="access-key-id" v-model="settings.aliyunOSS.accessKeyId" class="input" autocomplete="off" />
        </div>

        <div class="field">
          <label class="label" for="access-key-secret">Access Key Secret</label>
          <div class="secret-row">
            <input
              id="access-key-secret"
              v-model="settings.aliyunOSS.accessKeySecret"
              :type="showSecret ? 'text' : 'password'"
              class="input"
              autocomplete="off"
            />
            <button class="btn-secondary" type="button" @click="showSecret = !showSecret">
              {{ showSecret ? '隐藏' : '显示' }}
            </button>
          </div>
        </div>

        <div class="field">
          <label class="label" for="oss-bucket">Bucket 名称</label>
          <input id="oss-bucket" v-model="settings.aliyunOSS.bucket" class="input" autocomplete="off" />
        </div>

        <div class="field">
          <label class="label" for="oss-region">地域</label>
          <select id="oss-region" v-model="settings.aliyunOSS.region" class="input">
            <option v-for="region in ossRegions" :key="region.value" :value="region.value">
              {{ region.label }}
            </option>
          </select>
        </div>

        <div class="field">
          <label class="label" for="oss-prefix">路径前缀</label>
          <input id="oss-prefix" v-model="settings.aliyunOSS.prefix" class="input" placeholder="qiushui-web-clipper" />
          <p class="hint preview">路径预览：{{ ossPathPreview }}</p>
        </div>

        <div class="field">
          <label class="label" for="oss-custom-domain">自定义访问域名</label>
          <input
            id="oss-custom-domain"
            v-model="settings.aliyunOSS.customDomain"
            class="input"
            placeholder="https://img.example.com"
            autocomplete="off"
          />
          <p class="hint">留空则使用默认 OSS 域名；填写后 Markdown 图片链接会优先使用这个域名。</p>
        </div>

        <div class="field test-row">
          <button class="btn-secondary" type="button" :disabled="testStatus === 'testing'" @click="testConnection">
            {{ testStatus === 'testing' ? '测试中…' : '测试连接' }}
          </button>
          <span v-if="testStatus === 'ok'" class="test-ok">✓ 连接成功</span>
          <span v-else-if="testStatus === 'fail'" class="test-fail">✗ {{ testError }}</span>
        </div>
      </template>
    </section>

    <section class="section">
      <h2 class="section-title">AI 配置</h2>

      <div class="field">
        <label class="label" for="ai-base-url">API 地址</label>
        <input
          id="ai-base-url"
          v-model="settings.aiConfig.baseUrl"
          class="input"
          placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
        />
        <p class="hint">支持任意 OpenAI 兼容接口，默认为阿里云通义千问。</p>
      </div>

      <div class="field">
        <label class="label" for="ai-api-key">API Key</label>
        <div class="secret-row">
          <input
            id="ai-api-key"
            v-model="settings.aiConfig.apiKey"
            :type="showAISecret ? 'text' : 'password'"
            class="input"
            autocomplete="off"
          />
          <button class="btn-secondary" type="button" @click="showAISecret = !showAISecret">
            {{ showAISecret ? '隐藏' : '显示' }}
          </button>
        </div>
      </div>

      <div class="field">
        <label class="label" for="ai-model">模型</label>
        <input
          id="ai-model"
          v-model="settings.aiConfig.model"
          class="input"
          placeholder="qwen-long"
        />
      </div>

      <div class="field test-row">
        <button class="btn-secondary" type="button" :disabled="aiTestStatus === 'testing'" @click="testAIModel">
          {{ aiTestStatus === 'testing' ? '测试中…' : '测试模型' }}
        </button>
        <span v-if="aiTestStatus === 'ok'" class="test-ok">✓ 模型可用</span>
        <span v-else-if="aiTestStatus === 'fail'" class="test-fail">✗ {{ aiTestError }}</span>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">书签整理</h2>

      <div class="field">
        <label class="label" for="bookmark-inbox">待整理文件夹名称</label>
        <input
          id="bookmark-inbox"
          v-model="settings.bookmarkInboxFolder"
          class="input"
          placeholder="待整理"
        />
        <p class="hint">将书签收藏到该文件夹后，插件会自动整理其中的内容。</p>
      </div>

      <div class="field">
        <label class="label" for="process-interval">自动整理间隔（小时）</label>
        <input
          id="process-interval"
          v-model.number="settings.processInterval"
          class="input"
          type="number"
          min="1"
          max="168"
        />
      </div>

      <div class="field">
        <label class="label" for="bookmark-sub-dir">Obsidian 书签子目录</label>
        <input
          id="bookmark-sub-dir"
          v-model="settings.bookmarkSubDir"
          class="input"
          placeholder="Bookmarks"
        />
        <p class="hint">整理后的书签笔记将保存到 Vault 下的此子目录中。</p>
      </div>
    </section>

    <footer class="footer">
      <button class="btn-save" type="button" :disabled="isSaving" @click="save">
        {{ isSaving ? '保存中…' : '保存设置' }}
      </button>
      <span v-if="saveStatus === 'saved'" class="save-ok">✓ 已保存</span>
      <span v-else-if="saveStatus === 'error'" class="save-fail">保存失败</span>
    </footer>
  </main>
</template>

<style scoped>
.page {
  max-width: 560px;
  margin: 0 auto;
  padding: 32px 24px;
  color: #222;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.title {
  margin: 0 0 24px;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
}

.section {
  margin-bottom: 20px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
}

.section-title {
  margin: 0 0 16px;
  color: #444;
  font-size: 15px;
  font-weight: 600;
}

.field {
  margin-bottom: 14px;
}

.field:last-child {
  margin-bottom: 0;
}

.label {
  display: block;
  margin-bottom: 5px;
  color: #555;
  font-size: 13px;
}

.input {
  box-sizing: border-box;
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.4;
  outline: none;
}

.input:focus {
  border-color: #6e4dc4;
}

.hint {
  margin: 5px 0 0;
  color: #888;
  font-size: 11px;
  line-height: 1.4;
}

.preview {
  word-break: break-all;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.vault-row,
.secret-row,
.footer,
.test-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vault-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #333;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.secret-row .input {
  flex: 1;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}

.divider-label {
  margin-bottom: 14px;
  padding-bottom: 6px;
  border-bottom: 1px solid #eee;
  color: #888;
  font-size: 12px;
}

.btn-secondary,
.btn-save {
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.3;
  white-space: nowrap;
}

.btn-secondary {
  padding: 6px 14px;
  border: 1px solid #ccc;
  background: #f5f5f5;
  color: #222;
}

.btn-secondary:hover {
  background: #eee;
}

.btn-save {
  padding: 10px 24px;
  border: 0;
  background: #6e4dc4;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.btn-secondary:disabled,
.btn-save:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.test-ok,
.save-ok {
  color: #2e7d32;
  font-size: 13px;
}

.test-fail,
.save-fail {
  color: #c62828;
  font-size: 13px;
}

.test-fail {
  white-space: pre-wrap;
  word-break: break-word;
}

.footer {
  padding-top: 4px;
}

@media (max-width: 520px) {
  .page {
    padding: 20px 14px;
  }

  .section {
    padding: 16px;
  }

  .vault-row,
  .secret-row,
  .test-row {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

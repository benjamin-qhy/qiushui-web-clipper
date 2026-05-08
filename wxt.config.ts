import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: '飞书文档 → Obsidian',
    description: '将飞书文档一键保存为 Obsidian Markdown 笔记',
    version: '0.1.0',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['*://*.feishu.cn/*'],
  },
})

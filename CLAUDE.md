# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

飞书文档 → Obsidian 浏览器扩展（Chrome/Firefox），将飞书文档（docx/wiki）一键提取为 Obsidian Markdown 笔记。使用 WXT + Vue 3 + TypeScript 构建。

## 常用命令

```bash
pnpm dev                  # 开发模式（Chrome，热重载）
pnpm dev:firefox          # 开发模式（Firefox）
pnpm build                # 构建 Chrome 扩展
pnpm compile              # TypeScript 类型检查
pnpm vitest run           # 运行全部测试
pnpm vitest run tests/converter/blocks.test.ts  # 运行单个测试文件
```

测试使用 jsdom 环境，测试文件在 `tests/` 目录下。

每次修改源文件后，必须运行 `pnpm build` 重新编译，确保 `.output/chrome-mv3/` 下的产物是最新的。

## 架构概览

### 消息流

```
飞书文档页面（Content Script）
  ↓ chrome.runtime.sendMessage({ type: 'EXTRACT_DOC' })
Popup（entrypoints/popup/App.vue）
  ↓ useFileSave.save()
  ↓ buildFrontmatter() + blocksToMarkdown()
Obsidian Vault（File System Access API）
```

### 入口文件

- `entrypoints/content.ts` — Content Script，注入到 `*.feishu.cn/docx/*` 和 `*.feishu.cn/wiki/*`。处理两类消息：`EXTRACT_DOC`（提取文档）和 `DOWNLOAD_IMAGE`（下载图片为 base64）
- `entrypoints/popup/App.vue` — 弹窗 UI，触发提取和保存
- `entrypoints/options/App.vue` — 设置页（subDir、imageMode、OSS 配置）
- `entrypoints/background.ts` — 后台 Service Worker

### 核心模块

**提取层 `src/extractor/`**
- `collect.ts` — 自动滚动页面（每步 400px）触发懒加载，收集所有 `[data-block-type]` 元素；blob URL 图片立即用 canvas 转为 data URL，避免视口外回收
- `blocks.ts` — 解析单个 DOM 块元素为 `Block` 结构
- `inline.ts` — 解析行内 span 样式（粗体/斜体/代码/链接等）
- `scroll.ts` — 滚动容器查找辅助

**转换层 `src/converter/`**
- `blocks.ts` — `Block[]` → Markdown 正文（列表项用单换行，其他块用双换行）
- `inline.ts` — `Span[]` → Markdown 行内语法
- `frontmatter.ts` — 生成 YAML frontmatter（title/source/author/published/created/description/tags）
- `filename.ts` — 安全文件名（去除非法字符，处理重名冲突）

**存储层 `src/storage/`**
- `settings.ts` — 用 `browser.storage.local` 持久化设置（`Settings` 接口）
- `vault.ts` — 用 IndexedDB 持久化 `FileSystemDirectoryHandle`（Obsidian vault 路径）

**文件系统 `src/filesystem/save.ts`**
- 用 File System Access API 写入 `.md` 文件和图片资源（`{subDir}/{notename}.assets/`）

**图片上传 `src/uploader/`**
- `types.ts` — `ImageUploader` 接口
- `aliyun.ts` — 阿里云 OSS 上传，用 `crypto.subtle` 做 HMAC-SHA1 签名（`x-oss-date` 头）
- `index.ts` — 工厂函数 `createUploader(settings)`，imageMode=local 时返回 null

**Vue Composables `src/composables/`**
- `useVaultStore.ts` — vault 授权状态管理
- `useDocContent.ts` — 向 content script 发消息获取文档
- `useFileSave.ts` — 保存流程编排（下载图片 → 上传/本地存储 → 写 md 文件）
- `useSettings.ts` — 设置读写

### 核心类型（`src/types.ts`）

- `Block` — 文档块：type、spans、level、language、checked、rows、src、alt
- `DocContent extends DocMeta` — 包含 blocks 的完整文档
- `MessageRequest / MessageResponse` — Content Script ↔ Popup 通信协议

### 图片模式

- **local 模式**：图片下载后用 File System Access API 保存到 `{subDir}/{notename}.assets/`，Markdown 引用相对路径
- **oss 模式**：图片上传到阿里云 OSS，Markdown 引用完整 URL（支持自定义域名）

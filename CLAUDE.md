Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.
Tradeoff: These guidelines bias toward caution over speed. For trivial tasks, use judgment.
1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.
Before implementing:

* State your assumptions explicitly. If uncertain, ask.
* If multiple interpretations exist, present them - don't pick silently.
* If a simpler approach exists, say so. Push back when warranted.
* If something is unclear, stop. Name what's confusing. Ask.
2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

* No features beyond what was asked.
* No abstractions for single-use code.
* No "flexibility" or "configurability" that wasn't requested.
* No error handling for impossible scenarios.
* If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.
3. Surgical Changes
Touch only what you must. Clean up only your own mess.
When editing existing code:

* Don't "improve" adjacent code, comments, or formatting.
* Don't refactor things that aren't broken.
* Match existing style, even if you'd do it differently.
* If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

* Remove imports/variables/functions that YOUR changes made unused.
* Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.
4. Goal-Driven Execution
Define success criteria. Loop until verified.
Transform tasks into verifiable goals:

* "Add validation" → "Write tests for invalid inputs, then make them pass"
* "Fix the bug" → "Write a test that reproduces it, then make it pass"
* "Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

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

<!-- entrypoints/bookmarks/components/ai/CategoryProposal.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import type { CategoryNode } from '../../../../src/ai/chat-types'
import CategoryTreeNode from './CategoryTreeNode.vue'

defineProps<{ tree: CategoryNode[] }>()
const emit = defineEmits<{
  confirm: [keepOldFolders: boolean]
  modify: []
}>()

const keepOldFolders = ref<boolean | null>(null)

function handleConfirm() {
  if (keepOldFolders.value === null) return
  emit('confirm', keepOldFolders.value)
}
</script>

<template>
  <div class="proposal">
    <div class="proposal-title">建议目录结构</div>
    <div class="tree">
      <CategoryTreeNode v-for="node in tree" :key="node.name" :node="node" :depth="0" />
    </div>

    <div class="old-folder-choice">
      <span class="choice-label">处理完成后，原目录：</span>
      <div class="choice-btns">
        <button
          :class="['choice-btn', { active: keepOldFolders === true }]"
          @click="keepOldFolders = true"
        >保留原目录</button>
        <button
          :class="['choice-btn', { active: keepOldFolders === false }]"
          @click="keepOldFolders = false"
        >删除原目录</button>
      </div>
    </div>

    <div class="actions">
      <button class="btn-modify" @click="$emit('modify')">修改</button>
      <button class="btn-confirm" :disabled="keepOldFolders === null" @click="handleConfirm">
        确认执行
      </button>
    </div>
  </div>
</template>

<style scoped>
.proposal {
  border: 1px solid var(--color-border);
  border-radius: 2px;
  padding: 12px;
  background: var(--color-surface);
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.proposal-title {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.tree { max-height: 240px; overflow-y: auto; }
.old-folder-choice { display: flex; flex-direction: column; gap: 6px; }
.choice-label { font-size: 11px; color: var(--color-text-secondary); }
.choice-btns { display: flex; gap: 6px; }
.choice-btn {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background: var(--color-bg);
  font-size: 11px;
  font-family: var(--font-ui);
  cursor: pointer;
  color: var(--color-text);
}
.choice-btn:hover { border-color: var(--color-text-muted); }
.choice-btn.active {
  border-color: var(--color-accent);
  background: #fff7f0;
  color: var(--color-accent);
  font-weight: 600;
}
.actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-modify {
  padding: 5px 14px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  border-radius: 2px;
  font-size: 11px;
  font-family: var(--font-ui);
  cursor: pointer;
  color: var(--color-text-secondary);
}
.btn-modify:hover { border-color: var(--color-text-muted); color: var(--color-text); }
.btn-confirm {
  padding: 5px 14px;
  background: var(--color-dark);
  color: #fff;
  border: none;
  border-radius: 2px;
  font-size: 11px;
  font-family: var(--font-ui);
  cursor: pointer;
}
.btn-confirm:hover { opacity: 0.85; }
.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
</style>

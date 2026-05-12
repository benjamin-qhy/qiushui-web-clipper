<!-- entrypoints/bookmarks/components/ai/CategoryProposal.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import type { CategoryNode } from '../../../../src/ai/chat-types'

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

<!-- Recursive node component defined inline for simplicity -->
<script lang="ts">
import { defineComponent, h } from 'vue'
import type { CategoryNode } from '../../../../src/ai/chat-types'

const CategoryTreeNode = defineComponent({
  name: 'CategoryTreeNode',
  props: {
    node: { type: Object as () => CategoryNode, required: true },
    depth: { type: Number, default: 0 },
  },
  setup(props) {
    return () => h('div', { class: 'tree-node', style: { paddingLeft: `${props.depth * 14}px` } }, [
      h('span', { class: 'node-label' }, [
        h('span', { class: 'icon' }, props.node.children?.length ? '📁' : '📄'),
        props.node.name,
      ]),
      ...(props.node.children ?? []).map(child =>
        h(CategoryTreeNode, { node: child, depth: props.depth + 1, key: child.name })
      ),
    ])
  },
})
export { CategoryTreeNode }
</script>

<style scoped>
.proposal {
  border: 1px solid #d1c4e9;
  border-radius: 8px;
  padding: 12px;
  background: #f3effe;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.proposal-title { font-weight: 600; color: #4a148c; font-size: 12px; }
.tree { max-height: 240px; overflow-y: auto; }
.tree-node { padding: 2px 0; }
.node-label { display: flex; align-items: center; gap: 4px; color: #333; }
.icon { font-size: 12px; }
.old-folder-choice { display: flex; flex-direction: column; gap: 6px; }
.choice-label { font-size: 12px; color: #555; }
.choice-btns { display: flex; gap: 6px; }
.choice-btn {
  flex: 1; padding: 5px 8px; border: 1px solid #ccc; border-radius: 5px;
  background: #fff; font-size: 12px; cursor: pointer;
}
.choice-btn.active { border-color: #6e4dc4; background: #ede7f6; color: #6e4dc4; font-weight: 500; }
.actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-modify {
  padding: 6px 14px; border: 1px solid #ccc; background: #fff;
  border-radius: 5px; font-size: 12px; cursor: pointer;
}
.btn-confirm {
  padding: 6px 14px; background: #6e4dc4; color: #fff;
  border: none; border-radius: 5px; font-size: 12px; cursor: pointer;
}
.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
</style>

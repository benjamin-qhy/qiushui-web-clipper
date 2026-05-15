<script setup lang="ts">
import type { CategoryNode } from '../../../../src/ai/chat-types'

defineProps<{
  node: CategoryNode
  depth: number
}>()
</script>

<template>
  <div class="tree-node" :style="{ paddingLeft: `${depth * 14}px` }">
    <span class="node-label">
      <span class="icon">{{ node.children?.length ? '📁' : '📄' }}</span>
      {{ node.name }}
    </span>

    <CategoryTreeNode
      v-for="child in node.children ?? []"
      :key="child.name"
      :node="child"
      :depth="depth + 1"
    />
  </div>
</template>

<style scoped>
.tree-node { padding: 2px 0; }
.node-label { display: flex; align-items: center; gap: 4px; color: var(--color-text); }
.icon { font-size: 12px; }
</style>

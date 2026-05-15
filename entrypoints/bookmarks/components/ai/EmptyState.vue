<!-- entrypoints/bookmarks/components/ai/EmptyState.vue -->
<script setup lang="ts">
defineEmits<{
  startProcess: []
  startReorganize: []
}>()
</script>

<template>
  <div class="empty-state">
    <p class="hint">选择一个操作开始</p>
    <button class="quick-btn" @click="$emit('startReorganize')">
      🔄 重新整理分类
    </button>
    <button class="quick-btn" @click="$emit('startProcess')">
      ▶ 开始整理
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex: 1;
  padding: 24px;
}
.hint {
  font-size: 14px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0 0 6px;
}
.quick-btn {
  width: 100%;
  max-width: 200px;
  padding: 9px 16px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  font-size: 14px;
  font-family: var(--font-ui);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}
.quick-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>

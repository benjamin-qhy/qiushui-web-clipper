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
  gap: 12px;
  flex: 1;
  padding: 24px;
}
.hint { font-size: 12px; color: #aaa; margin: 0 0 4px; }
.quick-btn {
  width: 100%;
  max-width: 200px;
  padding: 10px 16px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}
.quick-btn:hover { background: #ede7f6; border-color: #b39ddb; }
</style>

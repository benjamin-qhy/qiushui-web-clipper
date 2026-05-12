<script setup lang="ts">
import { ref } from 'vue'
import type { FolderNode } from '../../../src/composables/useBookmarkTree'

const props = defineProps<{
  nodes: FolderNode[]
  selectedId: string | null
  dragOverId: string | null
  depth?: number
}>()

const emit = defineEmits<{
  select: [id: string]
  toggleExpand: [id: string]
  createFolder: [parentId: string, title: string]
  renameFolder: [id: string, title: string]
  deleteFolder: [id: string]
  moveFolder: [folderId: string, targetParentId: string]
  moveBookmark: [bookmarkId: string, targetFolderId: string]
  dragOver: [folderId: string | null]
}>()

const depth = props.depth ?? 0

const creatingIn = ref<string | null>(null)
const newFolderTitle = ref('')
const editingId = ref<string | null>(null)
const editingTitle = ref('')

function startCreate(parentId: string) {
  creatingIn.value = parentId
  newFolderTitle.value = ''
}

function confirmCreate(parentId: string) {
  if (newFolderTitle.value.trim()) {
    emit('createFolder', parentId, newFolderTitle.value.trim())
  }
  creatingIn.value = null
}

function startRename(node: FolderNode) {
  editingId.value = node.id
  editingTitle.value = node.title
}

function confirmRename(id: string) {
  if (editingTitle.value.trim()) {
    emit('renameFolder', id, editingTitle.value.trim())
  }
  editingId.value = null
}

function onDragOver(e: DragEvent, folderId: string) {
  e.preventDefault()
  emit('dragOver', folderId)
}

function onDragLeave() {
  emit('dragOver', null)
}

function onDrop(e: DragEvent, targetFolderId: string) {
  e.preventDefault()
  emit('dragOver', null)
  const type = e.dataTransfer?.getData('type')
  const id = e.dataTransfer?.getData('id')
  if (!id) return
  if (type === 'bookmark') {
    emit('moveBookmark', id, targetFolderId)
  } else if (type === 'folder') {
    if (id !== targetFolderId) {
      emit('moveFolder', id, targetFolderId)
    }
  }
}

function onFolderDragStart(e: DragEvent, folderId: string) {
  e.dataTransfer?.setData('type', 'folder')
  e.dataTransfer?.setData('id', folderId)
}
</script>

<template>
  <ul class="folder-list" :style="{ paddingLeft: depth > 0 ? '16px' : '0' }">
    <li
      v-for="node in nodes"
      :key="node.id"
      class="folder-item"
    >
      <div
        class="folder-row"
        :class="{
          selected: selectedId === node.id,
          'drag-over': dragOverId === node.id,
        }"
        draggable="true"
        @dragstart="onFolderDragStart($event, node.id)"
        @dragover="onDragOver($event, node.id)"
        @dragleave="onDragLeave"
        @drop="onDrop($event, node.id)"
        @click="emit('select', node.id)"
      >
        <button
          class="expand-btn"
          @click.stop="emit('toggleExpand', node.id)"
        >
          {{ node.children.length > 0 ? (node.expanded ? '▾' : '▸') : '·' }}
        </button>

        <template v-if="editingId === node.id">
          <input
            class="inline-input"
            v-model="editingTitle"
            @keyup.enter="confirmRename(node.id)"
            @keyup.escape="editingId = null"
            @blur="confirmRename(node.id)"
            @click.stop
          />
        </template>
        <span v-else class="folder-name">{{ node.title }}</span>

        <div class="folder-actions" @click.stop>
          <button class="action-btn" title="新建子文件夹" @click="startCreate(node.id)">＋</button>
          <button class="action-btn" title="重命名" @click="startRename(node)">✎</button>
          <button class="action-btn danger" title="删除（书签移入待整理）" @click="emit('deleteFolder', node.id)">✕</button>
        </div>
      </div>

      <!-- Inline new folder input -->
      <div v-if="creatingIn === node.id" class="folder-row new-folder-row">
        <input
          class="inline-input"
          v-model="newFolderTitle"
          placeholder="文件夹名称"
          @keyup.enter="confirmCreate(node.id)"
          @keyup.escape="creatingIn = null"
          @blur="confirmCreate(node.id)"
        />
      </div>

      <!-- Recursive children -->
      <FolderTree
        v-if="node.expanded && node.children.length > 0"
        :nodes="node.children"
        :selected-id="selectedId"
        :drag-over-id="dragOverId"
        :depth="depth + 1"
        @select="emit('select', $event)"
        @toggle-expand="emit('toggleExpand', $event)"
        @create-folder="(parentId, title) => emit('createFolder', parentId, title)"
        @rename-folder="(id, title) => emit('renameFolder', id, title)"
        @delete-folder="(id) => emit('deleteFolder', id)"
        @move-folder="(folderId, targetId) => emit('moveFolder', folderId, targetId)"
        @move-bookmark="(bmId, folderId) => emit('moveBookmark', bmId, folderId)"
        @drag-over="(id) => emit('dragOver', id)"
      />
    </li>
  </ul>
</template>

<style scoped>
.folder-list { list-style: none; margin: 0; padding: 0; }
.folder-item { }
.folder-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  position: relative;
}
.folder-row:hover { background: #f5f5f5; }
.folder-row.selected { background: #ede9f7; }
.folder-row.drag-over { background: #d4e4ff; outline: 2px solid #1a73e8; }
.expand-btn {
  background: none; border: none; cursor: pointer;
  font-size: 11px; color: #888; width: 16px; flex-shrink: 0; padding: 0;
}
.folder-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.folder-actions {
  display: none;
  gap: 2px;
  align-items: center;
}
.folder-row:hover .folder-actions { display: flex; }
.action-btn {
  background: none; border: none; cursor: pointer;
  font-size: 12px; color: #888; padding: 1px 4px; border-radius: 3px;
}
.action-btn:hover { background: #e0e0e0; color: #333; }
.action-btn.danger:hover { background: #fce8e6; color: #c62828; }
.new-folder-row { padding-left: 32px; }
.inline-input {
  flex: 1; font-size: 13px; border: 1px solid #6e4dc4;
  border-radius: 3px; padding: 1px 4px; outline: none;
}
</style>

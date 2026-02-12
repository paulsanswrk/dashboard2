<template>
  <Teleport to="body">
    <Transition name="ctx-fade">
      <div
          v-if="visible"
          class="ctx-menu-overlay"
          @mousedown.self="$emit('close')"
          @contextmenu.prevent="$emit('close')"
      >
        <div
            ref="menuRef"
            class="ctx-menu"
            :style="menuStyle"
            @contextmenu.prevent
        >
          <!-- Duplicate -->
          <button v-if="!canvasMode" class="ctx-item" @click="$emit('duplicate')">
            <Icon name="i-heroicons-document-duplicate" class="ctx-icon"/>
            <span class="ctx-label">Duplicate</span>
            <span class="ctx-hotkey">Ctrl+D</span>
          </button>

          <!-- Copy -->
          <button v-if="!canvasMode" class="ctx-item" @click="$emit('copy')">
            <Icon name="i-heroicons-clipboard-document" class="ctx-icon"/>
            <span class="ctx-label">Copy</span>
            <span class="ctx-hotkey">Ctrl+C</span>
          </button>

          <!-- Cut -->
          <button v-if="!canvasMode" class="ctx-item" @click="$emit('cut')">
            <Icon name="i-heroicons-scissors" class="ctx-icon"/>
            <span class="ctx-label">Cut</span>
            <span class="ctx-hotkey">Ctrl+X</span>
          </button>

          <!-- Paste -->
          <button class="ctx-item" :class="{ 'ctx-item--disabled': !hasClipboard }" :disabled="!hasClipboard" @click="hasClipboard && $emit('paste')">
            <Icon name="i-heroicons-clipboard" class="ctx-icon"/>
            <span class="ctx-label">Paste</span>
            <span class="ctx-hotkey">Ctrl+V</span>
          </button>

          <div v-if="!canvasMode" class="ctx-divider"/>

          <!-- Bring to Front -->
          <button v-if="!canvasMode" class="ctx-item" @click="$emit('bring-to-front')">
            <Icon name="i-heroicons-arrow-up-on-square" class="ctx-icon"/>
            <span class="ctx-label">Bring to Front</span>
          </button>

          <!-- Send to Back -->
          <button v-if="!canvasMode" class="ctx-item" @click="$emit('send-to-back')">
            <Icon name="i-heroicons-arrow-down-on-square" class="ctx-icon"/>
            <span class="ctx-label">Send to Back</span>
          </button>

          <div v-if="!canvasMode" class="ctx-divider"/>

          <!-- Add / Remove Link -->
          <button v-if="!canvasMode && !hasLink" class="ctx-item" @click="$emit('add-link')">
            <Icon name="i-heroicons-link" class="ctx-icon"/>
            <span class="ctx-label">Add Link</span>
          </button>
          <button v-if="!canvasMode && hasLink" class="ctx-item ctx-item--danger" @click="$emit('remove-link')">
            <Icon name="i-heroicons-link" class="ctx-icon"/>
            <span class="ctx-label">Remove Link</span>
          </button>

          <!-- Edit in Chart Builder (chart-only) -->
          <template v-if="!canvasMode && widgetType === 'chart'">
            <div class="ctx-divider"/>
            <button class="ctx-item" @click="$emit('edit-chart')">
              <Icon name="i-heroicons-pencil-square" class="ctx-icon"/>
              <span class="ctx-label">Edit in Chart Builder</span>
            </button>
          </template>

          <div v-if="!canvasMode" class="ctx-divider"/>

          <!-- Delete -->
          <button v-if="!canvasMode" class="ctx-item ctx-item--danger" @click="$emit('delete')">
            <Icon name="i-heroicons-trash" class="ctx-icon"/>
            <span class="ctx-label">Delete</span>
            <span class="ctx-hotkey">Del</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  x: number
  y: number
  widgetType: 'chart' | 'text' | 'image' | 'icon'
  widgetId: string
  hasLink?: boolean
  hasClipboard?: boolean
  canvasMode?: boolean
}>()

defineEmits<{
  close: []
  duplicate: []
  copy: []
  cut: []
  paste: []
  'bring-to-front': []
  'send-to-back': []
  'add-link': []
  'remove-link': []
  'edit-chart': []
  delete: []
}>()

const menuRef = ref<HTMLElement | null>(null)

// Position the menu, clamping to viewport
const menuStyle = computed(() => {
  const menuW = 220
  const menuH = 370 // approximate max height
  const pad = 8
  let left = props.x
  let top = props.y

  if (import.meta.client) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (left + menuW + pad > vw) left = vw - menuW - pad
    if (top + menuH + pad > vh) top = vh - menuH - pad
    if (left < pad) left = pad
    if (top < pad) top = pad
  }

  return { left: `${left}px`, top: `${top}px` }
})

// Close on Escape
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.ctx-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.ctx-menu {
  position: fixed;
  min-width: 210px;
  background: white;
  border: 1px solid #e2e6ea;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 5px 0;
  z-index: 10000;
  animation: ctx-scale-in 0.12s ease-out;
}

.dark .ctx-menu {
  background: #1f2937;
  border-color: #374151;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2);
}

@keyframes ctx-scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 14px;
  font-size: 13px;
  color: #374151;
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
  white-space: nowrap;
}

.dark .ctx-item {
  color: #d1d5db;
}

.ctx-item:hover {
  background: #f3f4f6;
}

.dark .ctx-item:hover {
  background: #374151;
}

.ctx-item--danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.dark .ctx-item--danger:hover {
  background: #451a1a;
  color: #f87171;
}

.ctx-item--disabled {
  opacity: 0.4;
  cursor: default;
}

.ctx-item--disabled:hover {
  background: none;
}

.ctx-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.7;
}

.ctx-label {
  flex: 1;
  text-align: left;
}

.ctx-hotkey {
  font-size: 11px;
  color: #9ca3af;
  margin-left: 16px;
}

.dark .ctx-hotkey {
  color: #6b7280;
}

.ctx-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 10px;
}

.dark .ctx-divider {
  background: #374151;
}

.ctx-fade-enter-active,
.ctx-fade-leave-active {
  transition: opacity 0.1s ease;
}

.ctx-fade-enter-from,
.ctx-fade-leave-to {
  opacity: 0;
}
</style>

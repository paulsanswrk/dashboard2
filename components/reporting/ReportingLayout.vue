<template>
  <div class="h-full resizable-layout" :style="{ gridTemplateColumns: gridColumns }">
    <aside class="resizable-left-panel border-r bg-dark overflow-hidden relative">
      <slot name="left" />
      <!-- Resize handle for the entire left panel -->
      <div class="resize-handle-right" @mousedown="startResize"></div>
    </aside>
    <main class="overflow-auto">
      <slot name="center" />
    </main>
    <aside v-if="showRightSidebar" class="border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-dark overflow-auto">
      <slot name="right" />
    </aside>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, ref} from 'vue'

// Props
const props = defineProps<{
  showRightSidebar?: boolean
}>()

// Basic 3-panel layout for the reporting builder
const leftWidth = ref(3) // Start with 3fr (25% of 12fr total)

// Computed grid columns based on sidebar visibility
const gridColumns = computed(() => {
  if (props.showRightSidebar) {
    return `${leftWidth.value}fr 6fr 3fr`
  } else {
    return `${leftWidth.value}fr 9fr`
  }
})
const leftPanelRef = ref<HTMLElement>()
let isResizing = false
let startX = 0
let startWidth = 0

function startResize(event: MouseEvent) {
  isResizing = true
  startX = event.clientX
  startWidth = leftWidth.value

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleResize(event: MouseEvent) {
  if (!isResizing) return

  const deltaX = event.clientX - startX
  const containerWidth = leftPanelRef.value?.parentElement?.clientWidth || 0

  // Calculate new width in fr units (assuming 12fr total grid)
  const frUnit = containerWidth / 12
  const newWidth = Math.max(2, Math.min(5, startWidth + Math.round(deltaX / frUnit)))

  leftWidth.value = newWidth
}

function stopResize() {
  isResizing = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  nextTick(() => {
    const leftPanel = document.querySelector('.resizable-left-panel') as HTMLElement
    if (leftPanel) leftPanelRef.value = leftPanel
  })
})
</script>

<style scoped>
html, body, :host { height: 100%; }

.resizable-layout {
  display: grid;
  height: 100%;
  position: relative;
}

.resizable-left-panel {
  position: relative;
  overflow: hidden;
}

.resize-handle-right {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: rgba(255, 255, 255, 0.1);
  cursor: col-resize;
  transition: background 0.2s;
  z-index: 10;
}

.resize-handle-right:hover {
  background: rgba(255, 255, 255, 0.3);
}

.resize-handle-right:active {
  background: rgba(255, 255, 255, 0.5);
}
</style>



<template>
  <div class="debug-panel border rounded bg-neutral-50 dark:bg-neutral-800 p-2">
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-medium text-xs flex items-center gap-2">
        <Icon name="i-heroicons-beaker" class="w-3 h-3 text-orange-500"/>
        GridLayout Debug
      </h3>
      <UButton
        variant="ghost"
        size="xs"
        color="gray"
        class="cursor-pointer"
        @click="isOpen = !isOpen"
      >
        <Icon :name="isOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-3 h-3"/>
      </UButton>
    </div>

    <div v-if="isOpen" class="space-y-3">
      <!-- Basic Layout Properties -->
      <div>
        <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Basic Layout</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Columns</label>
            <UInput :model-value="config.colNum" @update:model-value="emit('update:config', {...config, colNum: Number($event)})" type="number" size="sm" min="1" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Row Height</label>
            <UInput :model-value="config.rowHeight" @update:model-value="emit('update:config', {...config, rowHeight: Number($event)})" type="number" size="sm" min="1" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max Rows</label>
            <UInput :model-value="maxRowsInput" @update:model-value="updateMaxRows($event)" type="number" size="sm" min="1" placeholder="Infinity" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Margin [x,y]</label>
            <div class="flex gap-1">
              <UInput :model-value="config.margin?.[0]" @update:model-value="updateMargin(0, $event)" type="number" size="sm" placeholder="x" min="0" />
              <UInput :model-value="config.margin?.[1]" @update:model-value="updateMargin(1, $event)" type="number" size="sm" placeholder="y" min="0" />
            </div>
          </div>
        </div>
      </div>

      <!-- Behavior Properties -->
      <div>
        <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Behavior</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Draggable</label>
            <UCheckbox :model-value="config.isDraggable" @update:model-value="emit('update:config', {...config, isDraggable: $event})" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Resizable</label>
            <UCheckbox :model-value="config.isResizable" @update:model-value="emit('update:config', {...config, isResizable: $event})" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mirrored (RTL)</label>
            <UCheckbox :model-value="config.isMirrored" @update:model-value="emit('update:config', {...config, isMirrored: $event})" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bounded</label>
            <UCheckbox :model-value="config.isBounded" @update:model-value="emit('update:config', {...config, isBounded: $event})" />
          </div>
        </div>
      </div>

      <!-- Layout Properties -->
      <div>
        <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Layout</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Auto Size</label>
            <UCheckbox :model-value="config.autoSize" @update:model-value="emit('update:config', {...config, autoSize: $event})" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Vertical Compact</label>
            <UCheckbox :model-value="config.verticalCompact" @update:model-value="emit('update:config', {...config, verticalCompact: $event})" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Restore on Drag</label>
            <UCheckbox :model-value="config.restoreOnDrag" @update:model-value="emit('update:config', {...config, restoreOnDrag: $event})" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Prevent Collision</label>
            <UCheckbox :model-value="config.preventCollision" @update:model-value="emit('update:config', {...config, preventCollision: $event})" />
          </div>
        </div>
      </div>

      <!-- Performance Properties -->
      <div>
        <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Performance</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CSS Transforms</label>
            <UCheckbox :model-value="config.useCssTransforms" @update:model-value="emit('update:config', {...config, useCssTransforms: $event})" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Style Cursor</label>
            <UCheckbox :model-value="config.useStyleCursor" @update:model-value="emit('update:config', {...config, useStyleCursor: $event})" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Transform Scale</label>
            <UInput :model-value="config.transformScale" @update:model-value="emit('update:config', {...config, transformScale: Number($event)})" type="number" size="sm" step="0.1" min="0.1" />
          </div>
        </div>
      </div>

      <!-- Responsive Properties -->
      <div>
        <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Responsive</h4>
        <div class="space-y-2">
          <div>
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Responsive</label>
            <UCheckbox :model-value="config.responsive" @update:model-value="emit('update:config', {...config, responsive: $event})" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Breakpoints</label>
              <UTextarea
                :model-value="breakpointsJson"
                @update:model-value="updateBreakpoints($event)"
                :rows="2"
                size="sm"
                monospace
                placeholder='{"lg": 1200, "md": 996, "sm": 768, "xs": 480, "xxs": 0}'
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Columns per Breakpoint</label>
              <UTextarea
                :model-value="colsJson"
                @update:model-value="updateCols($event)"
                :rows="2"
                size="sm"
                monospace
                placeholder='{"lg": 12, "md": 10, "sm": 6, "xs": 4, "xxs": 2}'
              />
            </div>
          </div>
        </div>
      </div>

      <!-- JSON Editor for gridLayout -->
      <div>
        <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Layout Data</h4>
        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Grid Layout JSON</label>
        <UTextarea
          :model-value="layoutJson"
          @update:model-value="updateLayoutFromJson($event)"
          :rows="6"
          size="sm"
          monospace
          placeholder="Edit the grid layout as JSON..."
        />
      </div>

      <!-- Current Layout Info -->
      <div class="text-xs text-gray-600 dark:text-gray-400 border-t pt-2">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <div class="font-medium mb-1">Layout Stats</div>
            <div>Items: {{ layout.length }}</div>
            <div>Total Width: {{ layout.reduce((sum, item) => sum + item.w, 0) }}</div>
            <div>Max Height: {{ layout.length ? Math.max(...layout.map(item => item.y + item.h)) : 0 }}</div>
          </div>
          <div>
            <div class="font-medium mb-1">Config Summary</div>
            <div>Responsive: {{ config.responsive ? 'Yes' : 'No' }}</div>
            <div>Draggable: {{ config.isDraggable ? 'Yes' : 'No' }}</div>
            <div>Resizable: {{ config.isResizable ? 'Yes' : 'No' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface GridConfig {
  colNum: number
  rowHeight: number
  maxRows: number
  margin: [number, number]
  isDraggable: boolean
  isResizable: boolean
  isMirrored: boolean
  isBounded: boolean
  autoSize: boolean
  verticalCompact: boolean
  restoreOnDrag: boolean
  preventCollision: boolean
  useCssTransforms: boolean
  useStyleCursor: boolean
  transformScale: number
  responsive: boolean
  breakpoints: Record<string, number>
  cols: Record<string, number>
}

interface LayoutItem {
  x: number
  y: number
  w: number
  h: number
  i: string
}

const props = defineProps<{
  config: GridConfig
  layout: LayoutItem[]
}>()

const emit = defineEmits<{
  'update:config': [config: GridConfig]
  'update:layout': [layout: LayoutItem[]]
}>()

const isOpen = ref(false)

// Derived values for inputs
const maxRowsInput = computed(() => {
  return props.config.maxRows === Infinity ? '' : props.config.maxRows
})

const breakpointsJson = computed(() => JSON.stringify(props.config.breakpoints || {}))
const colsJson = computed(() => JSON.stringify(props.config.cols || {}))
const layoutJson = ref(JSON.stringify(props.layout, null, 2))

watch(() => props.layout, (newLayout) => {
  layoutJson.value = JSON.stringify(newLayout, null, 2)
}, { deep: true })

function updateMaxRows(value: string | number) {
  const num = Number(value)
  emit('update:config', {
    ...props.config,
    maxRows: !value || isNaN(num) ? Infinity : num
  })
}

function updateMargin(index: 0 | 1, value: string | number) {
  const margin: [number, number] = [...(props.config.margin || [20, 20])] as [number, number]
  margin[index] = Number(value) || 0
  emit('update:config', { ...props.config, margin })
}

function updateBreakpoints(json: string) {
  try {
    const breakpoints = JSON.parse(json)
    emit('update:config', { ...props.config, breakpoints })
  } catch {
    // Invalid JSON, ignore
  }
}

function updateCols(json: string) {
  try {
    const cols = JSON.parse(json)
    emit('update:config', { ...props.config, cols })
  } catch {
    // Invalid JSON, ignore
  }
}

function updateLayoutFromJson(json: string) {
  layoutJson.value = json
  try {
    const layout = JSON.parse(json)
    if (Array.isArray(layout)) {
      emit('update:layout', layout)
    }
  } catch {
    // Invalid JSON, ignore
  }
}
</script>

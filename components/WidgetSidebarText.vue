<template>
  <div class="space-y-3">
    <div>
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
      <UTextarea v-model="localForm.content" :rows="4" class="mt-1 w-full" :readonly="readonly" @input="emitContent"/>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Font Family</label>
        <USelectMenu
            v-model="localForm.fontFamily"
            :items="fontFamilyItems"
            value-key="value"
            label-key="label"
            :portal="true"
            :popper="{ strategy: 'fixed' }"
            :ui="{ content: 'z-[120]' }"
            class="mt-1 w-full"
        />
      </div>
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Font Size</label>
        <UInput v-model.number="localForm.fontSize" type="number" min="8" class="mt-1"/>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Line Height</label>
        <UInput v-model.number="localForm.lineHeight" type="number" min="10" class="mt-1"/>
      </div>
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Padding</label>
        <UInput v-model.number="localForm.padding" type="number" min="0" class="mt-1"/>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Text Color</label>
        <input v-model="localForm.color" type="color" class="mt-1 w-full h-10 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer"/>
      </div>
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Background</label>
        <input v-model="localForm.background" type="color" class="mt-1 w-full h-10 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer"/>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button
          type="button"
          class="relative inline-flex items-center justify-center px-1 py-1 text-xs font-semibold ring-1 ring-inset focus:z-10 rounded-md w-[30px]"
          :class="localForm.bold ? 'bg-orange-500 text-white ring-orange-500' : 'bg-white text-gray-900 ring-gray-300 hover:bg-gray-50'"
          @click="localForm.bold = !localForm.bold"
      >
        <span class="font-bold">B</span>
      </button>
      <button
          type="button"
          class="relative inline-flex items-center justify-center px-1 py-1 text-xs font-semibold ring-1 ring-inset focus:z-10 rounded-md w-[30px]"
          :class="localForm.italic ? 'bg-orange-500 text-white ring-orange-500' : 'bg-white text-gray-900 ring-gray-300 hover:bg-gray-50'"
          @click="localForm.italic = !localForm.italic"
      >
        <span class="italic">I</span>
      </button>
      <button
          type="button"
          class="relative inline-flex items-center justify-center px-1 py-1 text-xs font-semibold ring-1 ring-inset focus:z-10 rounded-md w-[30px]"
          :class="localForm.underline ? 'bg-orange-500 text-white ring-orange-500' : 'bg-white text-gray-900 ring-gray-300 hover:bg-gray-50'"
          @click="localForm.underline = !localForm.underline"
      >
        <span class="underline">U</span>
      </button>
      <button
          type="button"
          class="relative inline-flex items-center justify-center px-1 py-1 text-xs font-semibold ring-1 ring-inset focus:z-10 rounded-md w-[30px]"
          :class="localForm.align==='left' ? 'bg-gray-600 text-white ring-gray-600' : 'bg-white text-gray-900 ring-gray-300 hover:bg-gray-50'"
          @click="localForm.align='left'"
      >
        <Icon name="i-heroicons-bars-3-bottom-left-20-solid" class="w-4 h-4"/>
      </button>
      <button
          type="button"
          class="relative inline-flex items-center justify-center px-1 py-1 text-xs font-semibold ring-1 ring-inset focus:z-10 rounded-md w-[30px]"
          :class="localForm.align==='center' ? 'bg-gray-600 text-white ring-gray-600' : 'bg-white text-gray-900 ring-gray-300 hover:bg-gray-50'"
          @click="localForm.align='center'"
      >
        <Icon name="i-heroicons-bars-3-20-solid" class="w-4 h-4"/>
      </button>
      <button
          type="button"
          class="relative inline-flex items-center justify-center px-1 py-1 text-xs font-semibold ring-1 ring-inset focus:z-10 rounded-md w-[30px]"
          :class="localForm.align==='right' ? 'bg-gray-600 text-white ring-gray-600' : 'bg-white text-gray-900 ring-gray-300 hover:bg-gray-50'"
          @click="localForm.align='right'"
      >
        <Icon name="i-heroicons-bars-3-bottom-right-20-solid" class="w-4 h-4"/>
      </button>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Shape</label>
        <USelectMenu
            v-model="localForm.shape"
            :items="[
              {label: 'Square', value: 'square'},
              {label: 'Pill', value: 'pill'},
              {label: 'None', value: 'none'}
            ]"
            value-key="value"
            label-key="label"
            :portal="true"
            :popper="{ strategy: 'fixed' }"
            :ui="{ content: 'z-[120]' }"
            class="mt-1 w-full"
        />
      </div>
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Shadow</label>
        <USelectMenu
            v-model="localForm.shadow"
            :items="[
              {label: 'None', value: 'none'},
              {label: 'Soft', value: 'soft'},
              {label: 'Solid', value: 'solid'}
            ]"
            value-key="value"
            label-key="label"
            :portal="true"
            :popper="{ strategy: 'fixed' }"
            :ui="{ content: 'z-[120]' }"
            class="mt-1 w-full"
        />
      </div>
    </div>

    <!-- Border Section -->
    <div class="border-t pt-3 mt-3">
      <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3">Border</h4>
      <div class="space-y-3">
        <!-- Border Width -->
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Border Width</label>
          <div class="flex gap-1 flex-wrap mt-1">
            <button
                v-for="option in borderWidthOptions"
                :key="option.value"
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-colors"
                :class="localForm.borderWidth === option.value
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="localForm.borderWidth = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <!-- Border Color -->
        <div v-if="localForm.borderWidth > 0">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Border Color</label>
          <div class="flex gap-2 items-center mt-1">
            <input
                type="color"
                v-model="localForm.borderColor"
                class="w-8 h-8 rounded cursor-pointer border-0"
            />
            <UInput
                v-model="localForm.borderColor"
                size="sm"
                class="flex-1"
                placeholder="#cccccc"
            />
          </div>
        </div>
        <!-- Border Style -->
        <div v-if="localForm.borderWidth > 0">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Border Style</label>
          <div class="flex gap-1 flex-wrap mt-1">
            <button
                v-for="option in borderStyleOptions"
                :key="option.value"
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-colors"
                :class="localForm.borderStyle === option.value
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
                @click="localForm.borderStyle = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  textForm: any
  fontFamilyItems: Array<{ label: string; value: string }>
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update-text-form': [partial: Record<string, any>]
  'update-text-content': [content: string]
  'delete-widget': []
}>()

const localForm = reactive({...props.textForm})

watch(() => ({...props.textForm}), (val) => {
  Object.assign(localForm, val)
})

watch(localForm, (val) => {
  emit('update-text-form', {...val})
}, {deep: true})

function emitContent() {
  emit('update-text-content', localForm.content || '')
}

const borderWidthOptions = [
  {label: 'None', value: 0},
  {label: '1px', value: 1},
  {label: '2px', value: 2},
  {label: '3px', value: 3}
]

const borderStyleOptions = [
  {label: 'Solid', value: 'solid'},
  {label: 'Dashed', value: 'dashed'},
  {label: 'Dotted', value: 'dotted'}
]


</script>


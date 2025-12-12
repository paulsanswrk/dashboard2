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
      <UButton
          size="sm"
          :variant="localForm.bold ? 'solid' : 'outline'"
          color="orange"
          class="cursor-pointer"
          @click="localForm.bold = !localForm.bold"
      >B
      </UButton>
      <UButton
          size="sm"
          :variant="localForm.italic ? 'solid' : 'outline'"
          color="orange"
          class="cursor-pointer"
          @click="localForm.italic = !localForm.italic"
      >I
      </UButton>
      <UButton
          size="sm"
          :variant="localForm.underline ? 'solid' : 'outline'"
          color="orange"
          class="cursor-pointer"
          @click="localForm.underline = !localForm.underline"
      >U
      </UButton>
      <div class="ml-auto flex gap-1">
        <UButton size="sm" :variant="localForm.align==='left'?'solid':'outline'" color="gray" class="cursor-pointer" @click="localForm.align='left'">
          <Icon name="i-heroicons-bars-3-bottom-left-20-solid" class="w-4 h-4"/>
        </UButton>
        <UButton size="sm" :variant="localForm.align==='center'?'solid':'outline'" color="gray" class="cursor-pointer" @click="localForm.align='center'">
          <Icon name="i-heroicons-bars-3-20-solid" class="w-4 h-4"/>
        </UButton>
        <UButton size="sm" :variant="localForm.align==='right'?'solid':'outline'" color="gray" class="cursor-pointer" @click="localForm.align='right'">
          <Icon name="i-heroicons-bars-3-bottom-right-20-solid" class="w-4 h-4"/>
        </UButton>
      </div>
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
            class="mt-1"
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
            class="mt-1"
        />
      </div>
    </div>
    <div class="flex justify-between items-center pt-2 text-xs text-gray-400">
      <span>Changes save automatically</span>
      <UButton size="xs" color="red" variant="outline" class="cursor-pointer" @click="confirmDelete">
        Delete
      </UButton>
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

function confirmDelete() {
  const shouldDelete = typeof window !== 'undefined'
      ? window.confirm('Delete this text block? This action cannot be undone.')
      : true
  if (shouldDelete) {
    emit('delete-widget')
  }
}
</script>


<template>
  <div class="space-y-4">
    <!-- Icon Preview -->
    <div class="flex items-center gap-3">
      <div
          class="w-16 h-16 rounded border flex items-center justify-center"
          :style="{ backgroundColor: form.backgroundColor || 'transparent' }"
      >
        <Icon
            v-if="form.iconName"
            :name="form.iconName"
            :style="{ color: form.color, width: '40px', height: '40px' }"
        />
      </div>
      <div class="flex-1">
        <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Icon Widget</div>
        <div class="text-xs text-gray-500">{{ form.iconName?.replace('i-lucide-', '') || 'None' }}</div>
      </div>
    </div>

    <!-- Change Icon Button -->
    <UButton
        variant="outline"
        class="w-full cursor-pointer"
        @click="emit('change-icon')"
    >
      <Icon name="i-lucide-image" class="w-4 h-4 mr-2"/>
      Change Icon
    </UButton>

    <!-- Color -->
    <div>
      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Icon Color</label>
      <div class="flex items-center gap-2">
        <input
            type="color"
            :value="form.color"
            @input="updateField('color', ($event.target as HTMLInputElement).value)"
            class="w-8 h-8 rounded cursor-pointer border-0"
        />
        <UInput
            :model-value="form.color"
            @update:model-value="updateField('color', $event)"
            size="sm"
            class="flex-1"
            placeholder="#374151"
        />
      </div>
    </div>

    <!-- Size -->
    <div>
      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Size: {{ form.size }}px</label>
      <input
          type="range"
          :value="form.size"
          @input="updateField('size', Number(($event.target as HTMLInputElement).value))"
          min="16"
          max="128"
          step="4"
          class="w-full"
      />
    </div>

    <!-- Background Color -->
    <div>
      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Background Color</label>
      <div class="flex items-center gap-2">
        <input
            type="color"
            :value="form.backgroundColor || '#ffffff'"
            @input="updateField('backgroundColor', ($event.target as HTMLInputElement).value)"
            class="w-8 h-8 rounded cursor-pointer border-0"
        />
        <UInput
            :model-value="form.backgroundColor || 'transparent'"
            @update:model-value="updateField('backgroundColor', $event)"
            size="sm"
            class="flex-1"
            placeholder="transparent"
        />
        <UButton
            size="xs"
            variant="ghost"
            class="cursor-pointer"
            @click="updateField('backgroundColor', 'transparent')"
            title="Clear background"
        >
          <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
        </UButton>
      </div>
    </div>

    <!-- Border -->
    <div class="space-y-2">
      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">Border</label>
      <div class="flex items-center gap-2">
        <UInput
            type="number"
            :model-value="form.borderWidth"
            @update:model-value="updateField('borderWidth', Number($event))"
            size="sm"
            class="w-16"
            placeholder="0"
            min="0"
            max="10"
        />
        <span class="text-xs text-gray-500">px</span>
        <input
            type="color"
            :value="form.borderColor || '#cccccc'"
            @input="updateField('borderColor', ($event.target as HTMLInputElement).value)"
            class="w-8 h-8 rounded cursor-pointer border-0"
        />
      </div>
    </div>

    <!-- Border Radius -->
    <div>
      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Border Radius: {{ form.borderRadius }}px</label>
      <input
          type="range"
          :value="form.borderRadius"
          @input="updateField('borderRadius', Number(($event.target as HTMLInputElement).value))"
          min="0"
          max="50"
          step="2"
          class="w-full"
      />
    </div>

    <!-- Delete Button -->
    <div class="pt-4 border-t">
      <UButton
          color="red"
          variant="outline"
          class="w-full cursor-pointer"
          @click="emit('delete')"
      >
        <Icon name="i-heroicons-trash" class="w-4 h-4 mr-2"/>
        Delete Icon
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
interface IconForm {
  iconName: string
  color: string
  size: number
  backgroundColor: string
  borderRadius: number
  borderColor: string
  borderWidth: number
  borderStyle: string
}

const props = defineProps<{
  form: IconForm
}>()

const emit = defineEmits<{
  'update': [field: keyof IconForm, value: any]
  'change-icon': []
  'delete': []
}>()

function updateField(field: keyof IconForm, value: any) {
  emit('update', field, value)
}
</script>

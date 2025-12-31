<template>
  <div
      class="h-full w-full flex items-center justify-center overflow-hidden"
      :style="containerStyle"
  >
    <Icon
        v-if="styleProps?.iconName"
        :name="styleProps.iconName"
        :style="iconStyle"
    />
    <div v-else class="flex flex-col items-center justify-center text-gray-400">
      <Icon name="i-lucide-image" class="w-12 h-12 mb-2"/>
      <span class="text-sm">No icon selected</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface StyleProps {
  iconName?: string
  color?: string
  size?: number
  backgroundColor?: string
  borderRadius?: number
  borderColor?: string
  borderWidth?: number
  borderStyle?: string
}

const props = defineProps<{
  styleProps: StyleProps
  editMode?: boolean
}>()

const containerStyle = computed(() => {
  const s = props.styleProps || {}
  return {
    borderRadius: `${s.borderRadius || 0}px`,
    backgroundColor: s.backgroundColor || 'transparent',
    border: s.borderWidth && s.borderWidth > 0
        ? `${s.borderWidth}px ${s.borderStyle || 'solid'} ${s.borderColor || '#ccc'}`
        : 'none'
  }
})

const iconStyle = computed(() => {
  const s = props.styleProps || {}
  const size = s.size || 48
  return {
    color: s.color || '#374151',
    width: `${size}px`,
    height: `${size}px`
  }
})
</script>

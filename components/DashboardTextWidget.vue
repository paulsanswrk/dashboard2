<template>
  <div
      class="h-full w-full overflow-auto rounded-md"
      :style="computedStyle"
  >
    <div
        ref="editableRef"
        class="whitespace-pre-wrap break-words min-h-[32px] outline-none"
        :style="{ textAlign: textAlign }"
        :contenteditable="!readonly"
        @input="onInput"
    ></div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  styleProps?: Record<string, any>
  readonly?: boolean
}>()
const emit = defineEmits<{
  'update:content': [value: string]
}>()

const editableRef = ref<HTMLElement | null>(null)
const lastWidgetContent = ref<string>('')

const shapeRadius = (shape?: string, baseRadius?: number) => {
  if (shape === 'pill') return '999px'
  if (shape === 'square') return `${baseRadius ?? 6}px`
  return `${baseRadius ?? 0}px`
}

const content = computed(() => props.styleProps?.content ?? 'Add your text')

const textAlign = computed(() => props.styleProps?.align || 'left')

// Sync content from props to DOM only when it changes externally (not from user input)
watch(content, (newContent) => {
  // Only update DOM if the content is different from what the user typed
  // This prevents cursor jumping when typing
  if (editableRef.value && newContent !== lastWidgetContent.value) {
    // Save current selection if element is focused
    const isFocused = document.activeElement === editableRef.value
    
    if (!isFocused) {
      // Safe to update - element is not focused
      editableRef.value.innerText = newContent
      lastWidgetContent.value = newContent
    }
    // If focused, don't update - user is typing
  }
}, { immediate: false })

// Initial content sync on mount
onMounted(() => {
  if (editableRef.value) {
    editableRef.value.innerText = content.value
    lastWidgetContent.value = content.value
  }
})

// Also watch for widget changes (when selecting a different widget)
watch(() => props.styleProps?.content, (newContent) => {
  if (editableRef.value && newContent !== undefined) {
    const currentText = editableRef.value.innerText
    const isFocused = document.activeElement === editableRef.value
    
    // Update if content is different AND we're not actively editing
    if (newContent !== currentText && !isFocused) {
      editableRef.value.innerText = newContent
      lastWidgetContent.value = newContent
    }
  }
}, { immediate: true })

const computedStyle = computed(() => {
  const s = props.styleProps || {}
  const fontSize = typeof s.fontSize === 'number' ? `${s.fontSize}px` : (s.fontSize || '14px')
  const lineHeight = typeof s.lineHeight === 'number' ? `${s.lineHeight}px` : (s.lineHeight || '1.5')
  const padding = Array.isArray(s.padding)
      ? s.padding.map((p: any) => typeof p === 'number' ? `${p}px` : p || '0px').join(' ')
      : (typeof s.padding === 'number' ? `${s.padding}px` : (s.padding || '16px'))
  const borderRadius = shapeRadius(s.shape, s.borderRadius)

  const shadow = (() => {
    if (!s.shadow || s.shadow === 'none') return 'none'
    if (s.shadow === 'soft') return '0 6px 18px rgba(0,0,0,0.08)'
    if (s.shadow === 'solid') return '0 8px 24px rgba(0,0,0,0.12)'
    return s.shadow
  })()

  const fontWeight = s.fontWeight || (s.bold ? 700 : 500)
  const fontStyle = s.italic ? 'italic' : 'normal'
  const textDecoration = s.underline ? 'underline' : 'none'
  
  // Handle transparent background
  const background = s.transparentBackground ? 'transparent' : (s.background || '#ffffff')

  return {
    fontFamily: s.fontFamily || 'inherit',
    fontSize,
    lineHeight,
    color: s.color || '#111827',
    background,
    padding,
    borderRadius,
    boxShadow: shadow,
    fontWeight,
    fontStyle,
    textDecoration,
  }
})

function onInput(e: Event) {
  if (props.readonly) return
  const value = (e.target as HTMLElement).innerText || ''
  lastWidgetContent.value = value
  emit('update:content', value)
}

// Expose focus method for parent component
function focus() {
  if (editableRef.value) {
    editableRef.value.focus()
  }
}

defineExpose({ focus, editableRef })
</script>

<style scoped>
:deep(p) {
  margin: 0;
}
</style>

<template>
  <div
      class="h-full w-full flex items-center justify-center overflow-hidden"
      :style="containerStyle"
      @click="handleClick"
  >
    <img
        v-if="styleProps?.imageUrl"
        :src="styleProps.imageUrl"
        :alt="styleProps?.alt || 'Dashboard image'"
        class="max-w-full max-h-full w-full h-full"
        :style="imageStyle"
    />
    <div v-else class="flex flex-col items-center justify-center text-gray-400">
      <Icon name="i-heroicons-photo" class="w-12 h-12 mb-2"/>
      <span class="text-sm">No image selected</span>
    </div>
    <div
        v-if="styleProps?.linkEnabled && hasLink"
        class="absolute top-1 right-1 opacity-50 hover:opacity-100"
    >
      <Icon :name="linkIcon" class="w-4 h-4 text-blue-500"/>
    </div>
  </div>
</template>

<script setup lang="ts">
interface StyleProps {
  imageUrl?: string
  alt?: string
  objectFit?: string
  backgroundColor?: string
  borderRadius?: number
  borderColor?: string
  borderWidth?: number
  borderStyle?: string
  shadowColor?: string
  shadowSize?: string
  shadowPosition?: string
  linkEnabled?: boolean
  linkType?: string
  linkUrl?: string
  linkNewTab?: boolean
  linkDashboardId?: string
  linkTabId?: string
}

const props = defineProps<{
  styleProps: StyleProps
  editMode?: boolean
}>()

// Check if link is configured
const hasLink = computed(() => {
  const s = props.styleProps
  if (!s?.linkEnabled) return false
  if (s.linkType === 'tab') {
    return !!s.linkDashboardId && !!s.linkTabId
  }
  return !!s.linkUrl
})

const linkIcon = computed(() => {
  const s = props.styleProps
  return s?.linkType === 'tab' ? 'i-heroicons-arrow-top-right-on-square' : 'i-heroicons-link'
})

// Compute shadow CSS based on size and position
function getShadowCSS(size: string | undefined, position: string | undefined, color: string | undefined): string {
  if (!size || size === 'none') return 'none'

  const shadowColor = color || 'rgba(0, 0, 0, 0.2)'
  let blur = 4
  let spread = 0

  switch (size) {
    case 'small':
      blur = 4
      spread = 0
      break
    case 'normal':
      blur = 8
      spread = 2
      break
    case 'large':
      blur = 16
      spread = 4
      break
  }

  // Calculate offsets based on position
  let offsetX = 0
  let offsetY = 0

  switch (position) {
    case 'top-left':
      offsetX = -blur / 2
      offsetY = -blur / 2
      break
    case 'top':
      offsetX = 0
      offsetY = -blur / 2
      break
    case 'top-right':
      offsetX = blur / 2
      offsetY = -blur / 2
      break
    case 'left':
      offsetX = -blur / 2
      offsetY = 0
      break
    case 'middle':
      offsetX = 0
      offsetY = 0
      break
    case 'right':
      offsetX = blur / 2
      offsetY = 0
      break
    case 'bottom-left':
      offsetX = -blur / 2
      offsetY = blur / 2
      break
    case 'bottom':
      offsetX = 0
      offsetY = blur / 2
      break
    case 'bottom-right':
    default:
      offsetX = blur / 2
      offsetY = blur / 2
      break
  }

  return `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${shadowColor}`
}

const containerStyle = computed(() => {
  const s = props.styleProps || {}
  return {
    borderRadius: `${s.borderRadius || 0}px`,
    backgroundColor: s.backgroundColor || 'transparent',
    border: s.borderWidth && s.borderWidth > 0
        ? `${s.borderWidth}px ${s.borderStyle || 'solid'} ${s.borderColor || '#ccc'}`
        : 'none',
    boxShadow: getShadowCSS(s.shadowSize, s.shadowPosition, s.shadowColor),
    cursor: s.linkEnabled && hasLink.value ? 'pointer' : 'default',
    position: 'relative' as const
  }
})

const imageStyle = computed(() => ({
  objectFit: (props.styleProps?.objectFit || 'cover') as any,
  borderRadius: `${props.styleProps?.borderRadius || 0}px`
}))

const router = useRouter()

function handleClick() {
  // Don't navigate in edit mode
  if (props.editMode) return
  
  const s = props.styleProps
  if (!s?.linkEnabled) return

  if (s.linkType === 'tab' && s.linkDashboardId && s.linkTabId) {
    // Navigate to dashboard tab
    router.push(`/dashboards/${s.linkDashboardId}?tab=${s.linkTabId}`)
  } else if (s.linkUrl) {
    if (s.linkNewTab) {
      window.open(s.linkUrl, '_blank')
    } else {
      window.location.href = s.linkUrl
    }
  }
}
</script>

# Nuxt UI v4 Modal Migration Guide

## Overview

When upgrading to Nuxt UI v4, the `UModal` component changed its API for controlling visibility. The old `model-value` prop has been replaced with an `open` prop.

## What Changed

### Before (Nuxt UI v3)

```vue

<UModal :model-value="isOpen" @update:model-value="isOpen = $event">
  <!-- Modal content -->
</UModal>
```

### After (Nuxt UI v4)

```vue

<UModal v-model:open="isOpen">
  <!-- Modal content -->
</UModal>
```

## Migration Patterns

### Pattern 1: Direct Binding (Recommended)

For modals where you control the state directly:

```vue

<template>
  <UButton @click="isModalOpen = true">Open Modal</UButton>
  <UModal v-model:open="isModalOpen">
    <!-- Content -->
  </UModal>
</template>

<script setup>
  const isModalOpen = ref(false)
</script>
```

### Pattern 2: Component Props (Child Components)

For reusable modal components that accept props:

```vue

<template>
  <UModal :open="isOpen" @update:open="$emit('update:isOpen', $event)">
    <!-- Content -->
  </UModal>
</template>

<script setup>
  const props = defineProps({
    isOpen: {
      type: Boolean,
      required: true
    }
  })

  const emit = defineEmits(['update:isOpen'])
</script>
```

### Pattern 3: Computed Property Wrapper

For components using `modelValue` pattern:

```vue

<template>
  <UModal v-model:open="isOpen">
    <!-- Content -->
  </UModal>
</template>

<script setup>
  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits(['update:modelValue'])

  const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
</script>
```

## Common Issues

### Issue: Modal Doesn't Open After Upgrade

**Symptom**: Clicking a button that should open a modal does nothing.

**Cause**: Using old `model-value` prop instead of `v-model:open`.

**Solution**: Replace `:model-value` and `@update:model-value` with `v-model:open`.

### Issue: TypeScript Errors

**Symptom**: Type errors related to modal props.

**Cause**: Type definitions changed in v4.

**Solution**: Ensure you're using `open` prop instead of `model-value`.

## Files Updated in This Migration

The following files were updated during the Nuxt UI v4 upgrade:

### Pages

- `pages/dashboards/index.vue`
- `pages/organizations.vue`
- `pages/dashboards/[id].vue`
- `pages/admin/organizations/[id].vue`

### Components

- `components/DeleteUserModal.vue`
- `components/AddUserModal.vue`
- `components/UsersBulkDeleteModal.vue`
- `components/DeleteReportModal.vue`
- `components/AddViewerModal.vue`
- `components/DeleteViewerModal.vue`
- `components/ViewersBulkDeleteModal.vue`
- `components/CreateReportModal.vue`
- `components/ShareDashboardModal.vue`

## Quick Reference

| Old Pattern                 | New Pattern             |
|-----------------------------|-------------------------|
| `:model-value="isOpen"`     | `:open="isOpen"`        |
| `@update:model-value="..."` | `@update:open="..."`    |
| `v-model="isOpen"`          | `v-model:open="isOpen"` |

## Testing Checklist

After migrating modals, verify:

- [ ] Modal opens when trigger button is clicked
- [ ] Modal closes when cancel/close button is clicked
- [ ] Modal closes when clicking outside (if enabled)
- [ ] Modal state persists correctly during component lifecycle
- [ ] No console errors related to modal props

## Additional Resources

- [Nuxt UI v4 Modal Documentation](https://ui4.nuxt.com/docs/components/modal)
- [Vue 3 v-model Modifiers](https://vuejs.org/guide/components/v-model.html#v-model-modifiers)




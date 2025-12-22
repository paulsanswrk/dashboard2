<template>
  <div class="space-y-3 hidden">
    <div class="flex items-center gap-2">
      <input id="excludeNulls" type="checkbox" v-model="excludeNullsInDimensions" :disabled="props.disabled" />
      <label for="excludeNulls" class="text-sm" :class="{ 'text-gray-400': props.disabled }">Exclude nulls in dimensions</label>
    </div>
  </div>
</template>

<script setup lang="ts">
import {useReportState} from '@/composables/useReportState'

const props = defineProps<{
  disabled?: boolean
}>()
const {excludeNullsInDimensions} = useReportState()
</script>

<style scoped>
</style>



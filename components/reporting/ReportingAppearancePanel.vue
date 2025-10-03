<template>
  <div class="space-y-4">
    <div>
      <h3 class="font-medium mb-2">Titles</h3>
      <input v-model="appearance.chartTitle" class="border rounded w-full px-2 py-1 mb-2" placeholder="Chart title" />
      <input v-model="appearance.xAxisLabel" class="border rounded w-full px-2 py-1 mb-2" placeholder="X axis label" />
      <input v-model="appearance.yAxisLabel" class="border rounded w-full px-2 py-1 mb-2" placeholder="Y axis label" />
      <input v-model="appearance.legendTitle" class="border rounded w-full px-2 py-1" placeholder="Legend title" />
    </div>
    <div>
      <h3 class="font-medium mb-2">Number formatting</h3>
      <div class="flex items-center gap-2">
        <label class="text-sm">Decimals</label>
        <input type="number" v-model.number="appearance.numberFormat.decimalPlaces" min="0" max="6" class="border rounded px-2 py-1 w-20" />
        <label class="text-sm">Thousands Sep</label>
        <input type="checkbox" v-model="appearance.numberFormat.thousandsSeparator" />
      </div>
    </div>
    <div>
      <h3 class="font-medium mb-2">Palette</h3>
      <div class="space-y-2">
        <div class="flex items-center gap-2" v-for="(c, i) in (appearance.palette || [])" :key="i">
          <input v-model="appearance.palette[i]" class="border rounded px-2 py-1 w-28" placeholder="#3366FF" />
          <button class="text-sm text-red-600 underline" @click="removeColor(i)">remove</button>
        </div>
        <button class="text-sm underline" @click="addColor">+ add color</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useReportState } from '@/composables/useReportState'

const { appearance } = useReportState()

function addColor() {
  if (!appearance.value.palette) appearance.value.palette = []
  appearance.value.palette.push('#3366FF')
}
function removeColor(i: number) {
  appearance.value.palette?.splice(i, 1)
}
</script>

<style scoped>
</style>



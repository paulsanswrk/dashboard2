<template>
  <div>
    <div v-if="loading" class="text-gray-500">Loading preview...</div>
    <div v-else>
      <div v-if="!rows.length" class="text-gray-500">No data. Click "Test Preview" to fetch mock data.</div>
      <div v-else class="overflow-auto border rounded text-black">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th v-for="col in columns" :key="col.key" class="text-left px-3 py-2 border-b">{{ col.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in rows" :key="idx" class="odd:bg-white even:bg-gray-50">
              <td v-for="col in columns" :key="col.key" class="px-3 py-2 border-b">
                {{ row[col.key] as any }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  loading: boolean
  rows: Array<Record<string, unknown>>
  columns: Array<{ key: string; label: string }>
}>()
</script>

<style scoped>
</style>



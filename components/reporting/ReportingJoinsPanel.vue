<template>
  <div class="space-y-4">
    <div>
      <h3 class="font-medium mb-2">Available Relationships</h3>
      <div v-if="!relationships.length" class="text-sm text-gray-500">No relationships found for this dataset.</div>
      <div v-else class="space-y-2">
        <div v-for="(rel, idx) in relationships" :key="idx" class="border rounded p-2">
          <div class="text-sm">
            <div class="font-medium">{{ rel.sourceTable }} → {{ rel.targetTable }}</div>
            <div class="text-gray-600">{{ rel.constraintName }}</div>
            <div class="text-gray-600">Pairs: {{ formatPairs(rel.columnPairs) }}</div>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <label class="text-sm">Join</label>
            <select v-model="joinType[idx]" class="border rounded px-2 py-1 text-sm">
              <option value="inner">inner</option>
              <option value="left">left</option>
            </select>
            <button class="px-2 py-1 border rounded text-sm" @click="add(rel, joinType[idx] || 'inner')">Add</button>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h3 class="font-medium mb-2">Current Joins</h3>
      <div v-if="!joins.length" class="text-sm text-gray-500">No joins added.</div>
      <ul v-else class="space-y-2 text-sm">
        <li v-for="(j, i) in joins" :key="i" class="border rounded p-2 flex items-center justify-between">
          <div>
            <div class="font-medium">{{ j.joinType.toUpperCase() }}: {{ j.sourceTable }} → {{ j.targetTable }}</div>
            <div class="text-gray-600">{{ formatPairs(j.columnPairs) }}</div>
          </div>
          <button class="text-red-600 underline" @click="remove(i)">remove</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useReportState, type JoinRef } from '@/composables/useReportState'

const props = defineProps<{ relationships: Array<{ constraintName: string; sourceTable: string; targetTable: string; columnPairs: Array<{ position?: number; sourceColumn: string; targetColumn: string }> }> }>()

const { joins, addJoin, removeJoin } = useReportState()
const joinType = ref<Record<number, 'inner' | 'left'>>({})

function add(rel: any, type: 'inner' | 'left') {
  const toAdd: JoinRef = {
    constraintName: rel.constraintName,
    sourceTable: rel.sourceTable,
    targetTable: rel.targetTable,
    joinType: type,
    columnPairs: rel.columnPairs.map((p: any, idx: number) => ({ position: p.position ?? idx + 1, sourceColumn: p.sourceColumn, targetColumn: p.targetColumn }))
  }
  addJoin(toAdd)
}

function remove(index: number) {
  removeJoin(index)
}

function formatPairs(pairs: Array<{ sourceColumn: string; targetColumn: string }>) {
  return pairs.map((p: any) => `${p.sourceColumn} = ${p.targetColumn}`).join(' AND ')
}
</script>

<style scoped>
</style>



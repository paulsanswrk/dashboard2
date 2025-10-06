<template>
  <div class="space-y-3">
    <h3 class="font-medium">Joins</h3>
    <div v-if="!relationships.length" class="text-sm text-gray-500">No relationships detected for this table.</div>

    <div v-else>
      <div v-if="usedTables.size >= 2 && !relevantRels.length" class="mb-2 p-2 border border-amber-300 bg-amber-50 text-amber-800 text-sm rounded">
        No suitable join was found between the selected tables. The preview will include all tables using CROSS JOIN, which may multiply rows. Consider adding a join.
      </div>
      <div v-if="debugEnv && usedTables.size" class="text-xs p-2 border border-neutral-300 bg-neutral-50 rounded">
        <div class="font-medium mb-1">Debug (tables in use)</div>
        <div>Used: {{ Array.from(usedTables).join(', ') }}</div>
        <div>Relevant FKs: {{ relevantRels.length }}</div>
        <div v-if="appliedJoins.length">Applied: {{ appliedJoins.map(j => `${j.sourceTable}->${j.targetTable}`).join(', ') }}</div>
      </div>
      <div v-if="appliedJoins.length" class="text-sm">
        <div class="text-gray-200 mb-1">Applied:</div>
        <ul class="space-y-1">
          <li v-for="(j, i) in appliedJoins" :key="i" class="border rounded p-2">
            <div class="font-medium">{{ j.joinType.toUpperCase() }}: {{ j.sourceTable }} → {{ j.targetTable }}</div>
            <div class="text-gray-200">{{ formatPairs(j.columnPairs) }}</div>
          </li>
        </ul>
      </div>

      <div v-if="relevantRels.length > 1 && !appliedJoins.length" class="text-sm">
        <div class="text-gray-200 mb-1">Multiple possible joins detected. Select one:</div>
        <div class="space-y-2">
          <label v-for="(rel, idx) in relevantRels" :key="idx" class="flex items-start gap-2">
            <input type="radio" name="joinChoice" :value="idx" v-model.number="choiceIdx" />
            <div>
              <div class="font-medium">{{ rel.sourceTable }} → {{ rel.targetTable }}</div>
              <div class="text-gray-200">{{ rel.constraintName }} · {{ formatPairs(rel.columnPairs) }}</div>
            </div>
          </label>
        </div>
        <div class="mt-2">
          <button class="px-2 py-1 border rounded" @click="applyChoice" :disabled="choiceIdx===null">Apply join</button>
        </div>
      </div>

      <div v-if="relevantRels.length === 1 && !appliedJoins.length" class="text-sm">
        <button class="px-2 py-1 border rounded" @click="applySingle">Apply suggested join</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useReportState, type JoinRef } from '@/composables/useReportState'

const props = defineProps<{ relationships: Array<{ constraintName: string; sourceTable: string; targetTable: string; columnPairs: Array<{ position?: number; sourceColumn: string; targetColumn: string }> }> }>()

const { joins, addJoin, xDimensions, yMetrics, breakdowns } = useReportState()
const appliedJoins = joins
const choiceIdx = ref<number | null>(null)
const relevantRels = ref<any[]>([])
const usedTables = ref<Set<string>>(new Set())
const debugEnv = ref<boolean>(false)

function formatPairs(pairs: Array<{ sourceColumn: string; targetColumn: string }>) {
  return pairs.map((p: any) => `${p.sourceColumn} = ${p.targetColumn}`).join(' AND ')
}

function toJoinRef(rel: any): JoinRef {
  return {
    constraintName: rel.constraintName,
    sourceTable: rel.sourceTable,
    targetTable: rel.targetTable,
    joinType: 'inner',
    columnPairs: rel.columnPairs.map((p: any, idx: number) => ({ position: p.position ?? idx + 1, sourceColumn: p.sourceColumn, targetColumn: p.targetColumn }))
  }
}

function applyChoice() {
  if (choiceIdx.value === null) return
  const rel = relevantRels.value[choiceIdx.value]
  if (rel) addJoin(toJoinRef(rel))
}

function applySingle() {
  if (relevantRels.value.length === 1 && !joins.value.length) {
    addJoin(toJoinRef(relevantRels.value[0]))
  }
}

// Keep relationships filtered to tables used in zones
watchEffect(() => {
  const used = new Set<string>()
  ;[...xDimensions.value, ...yMetrics.value, ...breakdowns.value].forEach((f: any) => {
    if (f?.table) used.add(f.table)
    // Fallback heuristic: parse table from fieldId like 'table.column'
    if (!f?.table && typeof f?.fieldId === 'string' && f.fieldId.includes('.')) {
      used.add(f.fieldId.split('.')[0])
    }
  })
  usedTables.value = used
  if (used.size < 2) { relevantRels.value = []; return }
  // normalize comparison to be case-insensitive
  const usedLower = new Set(Array.from(used).map(t => String(t).toLowerCase()))
  relevantRels.value = (props.relationships || []).filter((r: any) => usedLower.has(String(r.sourceTable).toLowerCase()) && usedLower.has(String(r.targetTable).toLowerCase()))
})

watchEffect(() => {
  if (typeof window !== 'undefined') {
    debugEnv.value = (window as any).__DEBUG_ENV__ === true
  }
})
</script>

<style scoped>
</style>



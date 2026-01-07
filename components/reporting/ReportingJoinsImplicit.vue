<template>
  <div class="space-y-3 hidden">
    <h3 class="font-medium">Joins</h3>
    <div v-if="!relationships.length" class="text-sm text-gray-500">No relationships detected for this table.</div>

    <div v-else>
      <div v-if="props.serverError" class="mb-2 p-2 border border-red-300 bg-red-50 text-red-700 text-sm rounded">
        {{ props.serverError }}
      </div>
      <div v-if="props.serverWarnings?.length" class="mb-2 p-2 border border-amber-300 bg-amber-50 text-amber-800 text-sm rounded">
        <div v-for="(w, i) in props.serverWarnings" :key="i">{{ w }}</div>
      </div>
      
      <!-- Debug panel (dev only) -->
      <DebugJoinsPanel
          v-if="$nuxt.isDev && usedTables.size"
          :used-tables="usedTables"
          :relevant-rels-count="relevantRels.length"
          :applied-joins="appliedJoins"
      />
      <div v-if="appliedJoins.length" class="text-sm">
        <div class="text-gray-200 mb-1">Applied:</div>
        <ul class="space-y-1">
          <li v-for="(j, i) in appliedJoins" :key="i" class="border rounded p-2">
            <div class="font-medium flex items-center gap-2">
              <Icon name="i-heroicons-link" class="w-4 h-4 text-blue-400"/>
              <span>{{ j.joinType.toUpperCase() }}: {{ j.sourceTable }} → {{ j.targetTable }}</span>
            </div>
            <div class="text-gray-200 mt-0.5">{{ formatPairs(j.columnPairs) }}</div>
          </li>
        </ul>
      </div>

      <div v-if="relevantRels.length > 1 && !appliedJoins.length" class="text-sm">
        <div class="text-gray-200 mb-1">Multiple possible joins detected. Select one:</div>
        <div class="space-y-2">
          <label v-for="(rel, idx) in relevantRels" :key="idx" class="flex items-start gap-2">
            <input type="radio" name="joinChoice" :value="idx" v-model.number="choiceIdx" />
            <div>
              <div class="font-medium flex items-center gap-2">
                <Icon name="i-heroicons-link" class="w-4 h-4 text-blue-400"/>
                <span>{{ rel.sourceTable }} → {{ rel.targetTable }}</span>
              </div>
              <div class="text-gray-200 flex items-center gap-2">
                <span class="px-1 py-0.5 text-[10px] border border-blue-200 bg-blue-50 text-blue-700 rounded">FK</span>
                <span>{{ rel.constraintName }} · {{ formatPairs(rel.columnPairs) }}</span>
              </div>
            </div>
          </label>
        </div>
        <div class="mt-2">
          <button class="px-2 py-1 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" @click="applyChoice" :disabled="choiceIdx===null">Apply join</button>
        </div>
      </div>

      <div v-if="relevantRels.length === 1 && !appliedJoins.length" class="text-sm">
        <button class="px-2 py-1 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" @click="applySingle">Apply suggested join</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, watchEffect} from 'vue'
import {type JoinRef, useReportState} from '@/composables/useReportState'

const props = defineProps<{ relationships: Array<{ constraintName: string; sourceTable: string; targetTable: string; columnPairs: Array<{ position?: number; sourceColumn: string; targetColumn: string }> }> ; serverError?: string | null; serverWarnings?: string[] }>()

const { joins, addJoin, xDimensions, yMetrics, breakdowns } = useReportState()
const appliedJoins = joins
const choiceIdx = ref<number | null>(null)
const relevantRels = ref<any[]>([])
const usedTables = ref<Set<string>>(new Set())

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
</script>

<style scoped>
</style>



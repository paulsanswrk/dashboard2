<template>
  <div class="text-xs p-2 border border-neutral-300 bg-neutral-50 rounded">
    <div class="font-medium mb-1">Debug (tables in use)</div>
    <div>Used: {{ Array.from(usedTables).join(', ') }}</div>
    <div>Relevant FKs: {{ relevantRelsCount }}</div>
    <div v-if="appliedJoins.length">Applied: {{ appliedJoins.map(j => `${j.sourceTable}->${j.targetTable}`).join(', ') }}</div>
  </div>
</template>

<script setup lang="ts">
interface JoinRef {
  sourceTable: string
  targetTable: string
  joinType: string
  columnPairs: Array<{ position: number; sourceColumn: string; targetColumn: string }>
}

defineProps<{
  usedTables: Set<string>
  relevantRelsCount: number
  appliedJoins: JoinRef[]
}>()
</script>

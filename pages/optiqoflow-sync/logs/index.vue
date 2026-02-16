<script setup lang="ts">
import { DateTime } from 'luxon'

import { createColumnHelper } from '@tanstack/vue-table'

const columnHelper = createColumnHelper<any>()

const columns = [
  columnHelper.display({
    id: 'status',
    header: '',
    meta: { class: 'w-10' }
  }),
  columnHelper.accessor('created_at', {
    header: 'Time'
  }),
  columnHelper.accessor('tenant_name', {
    header: 'Tenant'
  }),
  columnHelper.accessor('operation', {
    header: 'Operation'
  }),
  columnHelper.accessor('table_name', {
    header: 'Table'
  }),
  columnHelper.accessor('duration_ms', {
    header: 'Duration'
  }),
  columnHelper.display({
    id: 'actions',
    header: ''
  })
]

const page = ref(1)
const pageCount = ref(50)
const selectedLog = ref(null)
const isSlideoverOpen = ref(false)

const { data: logs, pending, refresh } = await useFetch('/api/optiqoflow-sync/logs', {
  query: {
    page,
    limit: pageCount
  }
})

function openDetails(row: any) {
  // Check if row is wrapped (TanStack) or direct data
  const data = row.original || row
  selectedLog.value = data
  isSlideoverOpen.value = true
}

function formatDate(date: string | Date | null) {
  if (!date) return '-'
  const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date)
  if (!dt.isValid) return '-'
  return dt.toFormat('MMM d, HH:mm:ss')
}

// Auto-refresh every 10 seconds
useIntervalFn(() => {
  refresh()
}, 10000)
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">OptiqoFlow Sync Logs</h1>
      <UButton icon="i-heroicons-arrow-path" color="gray" variant="ghost" :loading="pending" @click="refresh" />
    </div>

    <UCard :ui="{ body: { padding: 'p-0' } }">
      <ClientOnly>
        <template #fallback>
          <div class="p-8 flex items-center justify-center">
            <Icon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </template>
        
        <UTable :columns="columns" :data="logs?.data || []" :loading="pending">
          <template #status-cell="{ row }">
            <UIcon 
              :name="row.original.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
              :class="row.original.success ? 'text-green-500' : 'text-red-500'" 
              class="w-5 h-5"
            />
          </template>

          <template #created_at-cell="{ row }">
            <span class="text-sm">{{ formatDate(row.original.created_at) }}</span>
          </template>
          
          <template #tenant_name-cell="{ row }">
            <div class="flex flex-col">
              <span class="font-medium">{{ row.original.tenant_name || 'Unknown' }}</span>
              <span class="text-xs text-gray-400 font-mono">{{ row.original.tenant_id?.split('-')[0] }}...</span>
            </div>
          </template>

          <template #duration_ms-cell="{ row }">
            <span class="text-xs font-mono">{{ row.original.duration_ms }}ms</span>
          </template>
          
          <template #actions-cell="{ row }">
            <UButton icon="i-heroicons-chevron-right" variant="ghost" color="gray" size="xs" @click.stop="openDetails(row)" />
          </template>
        </UTable>
      </ClientOnly>

      <div class="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
        <UPagination v-model="page" :page-count="pageCount" :total="logs?.meta?.total || 0" />
      </div>
    </UCard>


  <ClientOnly>
    <Teleport to="body">
      <div v-if="isSlideoverOpen" class="fixed inset-0 z-50 flex justify-end">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-gray-900/50 transition-opacity" @click="isSlideoverOpen = false"></div>
        
        <!-- Sidebar Panel -->
        <div class="relative w-screen max-w-2xl bg-white dark:bg-gray-900 shadow-xl h-full flex flex-col transform transition-transform duration-300 ease-in-out">
          <div class="p-6 flex flex-col h-full" v-if="selectedLog">
            <div class="flex justify-between items-start mb-6">
              <div>
                <h2 class="text-xl font-bold flex items-center gap-2">
                   <UIcon 
                    :name="selectedLog.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                    :class="selectedLog.success ? 'text-green-500' : 'text-red-500'" 
                  />
                  {{ selectedLog.operation }} {{ selectedLog.table_name }}
                </h2>
                <p class="text-sm text-gray-500 mt-1">{{ formatDate(selectedLog.created_at) }}</p>
              </div>
              <UButton icon="i-heroicons-x-mark" color="gray" variant="ghost" @click="isSlideoverOpen = false" />
            </div>
    
            <div class="space-y-6 flex-1 overflow-y-auto">
              <!-- Content unchanged -->
              <div class="grid grid-cols-2 gap-4">
                 <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                   <div class="text-xs text-gray-500 uppercase font-semibold mb-1">Tenant</div>
                   <div class="font-medium">{{ selectedLog.tenant_name || 'Unknown' }}</div>
                   <div class="text-xs text-gray-400 font-mono mt-1">{{ selectedLog.tenant_id }}</div>
                 </div>
                 
                 <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                   <div class="text-xs text-gray-500 uppercase font-semibold mb-1">Client Info</div>
                   <div class="text-sm">IP: {{ selectedLog.client_ip }}</div>
                   <div class="text-xs text-gray-400 truncate mt-1" :title="selectedLog.user_agent">{{ selectedLog.user_agent }}</div>
                 </div>
              </div>
              
              <div v-if="selectedLog.error_message" class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                <h3 class="font-bold mb-1">Error</h3>
                <pre class="whitespace-pre-wrap text-sm">{{ selectedLog.error_message }}</pre>
              </div>
    
              <!-- Record Counts Grid -->
              <div v-if="selectedLog.metadata?.record_counts" class="grid grid-cols-2 gap-4">
                <div v-for="(count, key) in selectedLog.metadata.record_counts" :key="key" class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div class="text-xs text-gray-500 uppercase font-semibold mb-1">{{ key.replace(/_/g, ' ') }}</div>
                  <div class="text-lg font-bold">{{ count }}</div>
                </div>
              </div>

              <!-- Affected Tables -->
               <div v-if="selectedLog.metadata?.affected_tables?.length">
                 <h3 class="font-bold mb-2 text-sm text-gray-700 dark:text-gray-300">Affected Tables</h3>
                 <div class="flex flex-wrap gap-2">
                   <UBadge v-for="table in selectedLog.metadata.affected_tables" :key="table" color="gray" variant="soft">
                     {{ table }}
                   </UBadge>
                 </div>
              </div>

              <!-- Raw Metadata (Collapsed) -->
              <details class="group bg-gray-50 dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-800">
                 <summary class="cursor-pointer font-bold text-sm text-gray-600 dark:text-gray-400 select-none flex items-center gap-2">
                   <UIcon name="i-heroicons-code-bracket" class="w-4 h-4" />
                   Raw Metadata
                   <UIcon name="i-heroicons-chevron-down" class="w-4 h-4 transition-transform group-open:rotate-180 ml-auto" />
                 </summary>
                 <div class="mt-2 bg-gray-900 text-gray-100 p-4 rounded text-xs font-mono overflow-x-auto">
                   <pre>{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
                 </div>
              </details>
              
               <div v-if="selectedLog.metadata?.error_stack">
                 <h3 class="font-bold mb-2">Stack Trace</h3>
                 <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg font-mono text-xs overflow-x-auto text-gray-600 dark:text-gray-400">
                   <pre>{{ selectedLog.metadata.error_stack }}</pre>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
  </div>
</template>

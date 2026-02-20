<template>
  <div class="h-full flex flex-col pt-8 lg:pt-0">
    <!-- Header section -->
    <div class="p-6 border-b border-gray-200 dark:border-[rgb(64,64,64)] bg-white dark:bg-[#1E1E1E]">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">OptiqoFlow Tenants</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Manage synchronized data tenants and view associated generated schemas.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <UButton
              color="white"
              variant="solid"
              icon="i-heroicons-arrow-path"
              :loading="pending"
              @click="refresh"
              class="shadow-sm hover:bg-gray-50 bg-white"
          >
            Refresh List
          </UButton>
        </div>
      </div>
    </div>

    <!-- Content section -->
    <div class="flex-1 overflow-auto bg-gray-50 dark:bg-[#121212] p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Error State -->
        <UAlert
            v-if="error"
            icon="i-heroicons-exclamation-triangle"
            color="red"
            variant="soft"
            title="Error Loading Tenants"
            :description="error.message"
            class="mb-6"
        />

        <!-- Loading State -->
        <div v-else-if="pending && !tenants.length" class="flex flex-col items-center justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400 mb-4"/>
          <p class="text-gray-500 dark:text-gray-400">Loading tenants...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="tenants.length === 0" class="text-center py-12 bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[rgb(64,64,64)]">
          <UIcon name="i-heroicons-server" class="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4 mx-auto"/>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No Tenants Found</h3>
          <p class="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            There are no synchronized tenants in the system yet. Tenants are automatically created when data is pushed from OptiqoFlow.
          </p>
        </div>

        <!-- Data Table -->
        <div v-else class="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[rgb(64,64,64)] shadow-sm overflow-hidden">
          <UTable
              :columns="columns"
              :data="tenants"
              :ui="{
                td: {
                  padding: 'py-4',
                  color: 'text-gray-700 dark:text-gray-300'
                },
                th: {
                  color: 'text-gray-700 dark:text-gray-300 font-semibold'
                }
              }"
          >
            <template #id-cell="{ row }">
              <div class="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[rgb(64,64,64)] px-2 py-1 rounded inline-block truncate max-w-[150px]" :title="row.original.id">
                {{ row.original.id }}
              </div>
            </template>
            
             <template #name-cell="{ row }">
               <span class="font-medium text-gray-900 dark:text-white">{{ row.original.name }}</span>
            </template>

            <template #shortName-cell="{ row }">
              <div class="flex items-center gap-2">
                 <span v-if="row.original.shortName" class="font-mono text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    {{ row.original.shortName }}
                  </span>
                  <span v-else class="text-gray-400 italic text-sm">
                    Pending first sync...
                  </span>
              </div>
            </template>

            <template #schema-cell="{ row }">
                <span v-if="row.original.shortName" class="font-mono text-xs text-gray-500 dark:text-gray-400">
                  tenant_{{ row.original.shortName }}
                </span>
                <span v-else class="text-gray-400 italic text-sm">
                  -
                </span>
            </template>

            <template #actions-cell="{ row }">
              <div class="flex justify-end gap-2">
                <UButton
                    color="red"
                    variant="outline"
                    icon="i-heroicons-trash"
                    size="sm"
                    label="Delete"
                    class="bg-white cursor-pointer"
                    @click="confirmDelete(row.original)"
                />
              </div>
            </template>
          </UTable>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen" :dismissible="false">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-500" />
            Delete Tenant
          </h3>
          <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1 cursor-pointer" @click="isDeleteModalOpen = false" />
        </div>
      </template>

      <template #body>
        <div v-if="tenantToDelete" class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Are you sure you want to delete the tenant <strong class="text-gray-900 dark:text-white">{{ tenantToDelete.name }}</strong>?
          </p>

          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 text-sm text-red-800 dark:text-red-200 space-y-2">
            <p class="font-semibold">This action is destructive and will delete:</p>
            <ul class="list-disc pl-5 space-y-1 mt-2">
              <li>All associated dashboard charts and cache entries</li>
              <li>Organizations will be unlinked (not deleted)</li>
              <li>The generated `tenant_{{ tenantToDelete.shortName }}` schema and views</li>
              <li v-if="deleteOptiqoflowData">External data in the `optiqoflow` schema tables</li>
            </ul>
          </div>

          <UCheckbox
            v-model="deleteOptiqoflowData"
            label="Also delete all external data in OptiqoFlow schema (DANGEROUS)"
            color="error"
            class="mt-4"
          />

          <UAlert
            v-if="deleteError"
            icon="i-heroicons-x-circle"
            color="error"
            variant="solid"
            :title="deleteError"
          />
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false" class="cursor-pointer">
            Cancel
          </UButton>
          <UButton
            color="error"
            variant="solid"
            :loading="isDeleting"
            @click="executeDelete"
            class="cursor-pointer"
          >
            Confirm Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
// Requires SuperAdmin
definePageMeta({
  layout: 'default',
  middleware: ['auth'] // Assuming an auth middleware handles base protection
})

import { createColumnHelper } from '@tanstack/vue-table'

// Setup Page Meta
useHead({
  title: 'Tenants - OptiqoFlow | Optiqo Dashboard',
})

const columnHelper = createColumnHelper<any>()

// The table columns
const columns = [
  columnHelper.accessor('id', { header: 'Tenant ID' }),
  columnHelper.accessor('name', { header: 'Organization Name', enableSorting: true }),
  columnHelper.accessor('shortName', { header: 'Short Name', enableSorting: true }),
  columnHelper.accessor('schema', { header: 'Generated Schema' }),
  columnHelper.display({ id: 'actions', header: '' })
]

// Modal State
const isDeleteModalOpen = ref(false)
const tenantToDelete = ref<any>(null)
const isDeleting = ref(false)
const deleteError = ref('')
const deleteOptiqoflowData = ref(false)

const toast = useToast()

// Fetch Tenants
const { data, pending, error, refresh } = await useFetch('/api/tenants')

const tenants = computed(() => {
  if (!data.value?.success || !data.value.tenants) return []
  return data.value.tenants
})

// Open modal to confirm delete
const confirmDelete = (tenant: any) => {
    tenantToDelete.value = tenant
    deleteError.value = ''
    deleteOptiqoflowData.value = false // reset for safety
    isDeleteModalOpen.value = true
}

// Execute the deletion
const executeDelete = async () => {
    if (!tenantToDelete.value) return

    isDeleting.value = true
    deleteError.value = ''

    try {
        const response = await $fetch(`/api/admin/tenants/${tenantToDelete.value.id}/delete`, {
            method: 'DELETE',
            query: {
                dry_run: false,
                confirm: true,
                unlink_organizations: true, // safe default
                delete_optiqoflow: deleteOptiqoflowData.value
            }
        })

        toast.add({
            title: 'Tenant Deleted',
            description: `Successfully deleted ${tenantToDelete.value.name}`,
            color: 'green'
        })
        
        isDeleteModalOpen.value = false
        await refresh() // Refresh the table
    } catch (err: any) {
        console.error('Delete error:', err)
        deleteError.value = err.data?.message || err.message || 'Failed to delete tenant'
    } finally {
        isDeleting.value = false
    }
}
</script>

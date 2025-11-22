<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-heading font-bold tracking-tight">Dashboards</h1>
      <UButton color="orange" class="bg-orange-500 hover:bg-orange-600 cursor-pointer text-white dark:text-black"
               @click="openCreate">Create dashboard
      </UButton>
    </div>

    <UTable :data="dashboards" :columns="columns" :loading="loading" class="mb-4">
      <template #actions-cell="{ row }">
        <div class="flex gap-2">
          <UButton size="xs" color="orange" variant="outline" class="hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 cursor-pointer" @click="edit(row.original)">
            <Icon name="i-heroicons-pencil" class="w-4 h-4"/>
          </UButton>
          <UButton size="xs" color="red" variant="outline" class="hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer" @click="remove(row.original)">
            <Icon name="i-heroicons-trash" class="w-4 h-4"/>
          </UButton>
        </div>
      </template>
    </UTable>

    <UModal v-model:open="isCreateOpen">
      <template #header>
        <div class="text-lg font-semibold">Create Dashboard</div>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="Name">
            <UInput v-model="newName" placeholder="My dashboard" class="w-full"/>
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="isCreateOpen = false">Cancel</UButton>
          <UButton color="orange" :loading="creating" @click="create">Create</UButton>
        </div>
      </template>
    </UModal>
  </div>
  
</template>

<script setup lang="ts">
import {createColumnHelper} from '@tanstack/vue-table'

const { listDashboards, createDashboard, deleteDashboard } = useDashboardsService()

const dashboards = ref<any[]>([])
const loading = ref(true)

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('name', {
    header: 'Name'
  }),
  columnHelper.accessor('created_at', {
    header: 'Created',
    cell: ({getValue}) => formatDate(getValue())
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions'
  })
]

async function load() {
  loading.value = true
  try {
    dashboards.value = await listDashboards()
  } finally {
    loading.value = false
  }
}

onMounted(load)

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

function edit(row: any) {
  navigateTo(`/dashboards/${row.id}`)
}

const isCreateOpen = ref(false)
const newName = ref('')
const creating = ref(false)

function openCreate() {
  newName.value = ''
  isCreateOpen.value = true
}

async function create() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const res = await createDashboard({ name: newName.value.trim() })
    isCreateOpen.value = false
    navigateTo(`/dashboards/${res.dashboardId}`)
  } finally {
    creating.value = false
  }
}

async function remove(row: any) {
  if (!confirm('Delete this dashboard?')) return
  await deleteDashboard(row.id)
  await load()
}
</script>



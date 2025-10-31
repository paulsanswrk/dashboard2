<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-heading font-bold tracking-tight">Dashboards</h1>
      <UButton color="orange" @click="openCreate">Create dashboard</UButton>
    </div>

    <UTable :rows="dashboards" :columns="columns" class="mb-4">
      <template #actions-data="{ row }">
        <div class="flex gap-2">
          <UButton size="xs" color="orange" variant="outline" @click="edit(row)">
            <Icon name="heroicons:pencil" class="w-4 h-4" />
          </UButton>
          <UButton size="xs" color="red" variant="outline" @click="remove(row)">
            <Icon name="heroicons:trash" class="w-4 h-4" />
          </UButton>
        </div>
      </template>

      <template #created_at-data="{ row }">
        {{ formatDate(row.created_at) }}
      </template>

    </UTable>

    <UModal v-model="isCreateOpen">
      <UCard>
        <template #header>
          <div class="text-lg font-semibold">Create Dashboard</div>
        </template>
        <div class="space-y-4">
          <UFormGroup label="Name">
            <UInput v-model="newName" placeholder="My dashboard" />
          </UFormGroup>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="isCreateOpen=false">Cancel</UButton>
            <UButton color="orange" :loading="creating" @click="create">Create</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
  
</template>

<script setup lang="ts">
const { listDashboards, createDashboard, deleteDashboard } = useDashboardsService()

const dashboards = ref<any[]>([])
const loading = ref(false)

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'created_at', label: 'Created' },
  { key: 'actions', label: 'Actions' }
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



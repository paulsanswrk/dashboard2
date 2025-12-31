<template>
  <div class="p-6">
    <div class="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-heading font-bold tracking-tight">Dashboards</h1>
        <div class="layout-toggle" role="group" aria-label="Dashboard layout">
          <button
              class="layout-btn"
              :class="{ active: viewMode === 'table' }"
              @click="viewMode = 'table'"
              title="List Layout"
          >
            <Icon name="i-heroicons-list-bullet" class="w-6 h-6"/>
          </button>
          <button
              class="layout-btn"
              :class="{ active: viewMode === 'grid' }"
              @click="viewMode = 'grid'"
              title="Grid Layout"
          >
            <Icon name="i-heroicons-squares-2x2" class="w-6 h-6"/>
          </button>
        </div>
      </div>
      <UButton color="orange" class="bg-orange-500 hover:bg-orange-600 cursor-pointer text-white dark:text-black"
               @click="openCreate">Create dashboard
      </UButton>
    </div>

    <div v-if="viewMode === 'table'">
      <UTable :data="dashboards" :columns="columns" :loading="loading" class="mb-4">
        <template #name-cell="{ row }">
          <a
              class="text-orange-600 dark:text-orange-300 hover:underline"
              :href="`/dashboards/${row.original.id}`"
              title="View dashboard"
          >
            {{ row.getValue('name') }}
          </a>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-2">
            <a
                :href="`/dashboards/${row.original.id}/edit`"
                class="inline-flex items-center justify-center rounded border border-orange-300 text-orange-700 px-2 py-1 text-xs hover:bg-orange-50 hover:border-orange-400 hover:text-orange-800 cursor-pointer"
                title="Edit dashboard"
            >
              <Icon name="i-heroicons-pencil" class="w-4 h-4"/>
            </a>
            <UButton size="xs" color="gray" variant="outline" class="hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 cursor-pointer" @click="openRename(row.original)" title="Rename dashboard">
              <Icon name="i-heroicons-pencil-square" class="w-4 h-4"/>
            </UButton>
            <UButton size="xs" color="red" variant="outline" class="hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer" @click="remove(row.original)" title="Delete dashboard">
              <Icon name="i-heroicons-trash" class="w-4 h-4"/>
            </UButton>
          </div>
        </template>
      </UTable>
    </div>

    <div v-else class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
      <div
          v-for="dash in dashboards"
          :key="dash.id"
          class="border rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition cursor-pointer max-w-xl w-full"
          @click="view(dash)"
      >
        <a class="block aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden" :href="`/dashboards/${dash.id}`" title="Open dashboard">
          <img
              v-if="dash.thumbnail_url"
              :src="dash.thumbnail_url"
              :alt="dash.name"
              class="object-cover w-full h-full"
              loading="lazy"
          />
          <div v-else class="text-sm text-gray-500 flex items-center gap-2">
            <Icon name="i-heroicons-photo" class="w-5 h-5"/>
            No thumbnail
          </div>
        </a>
        <div class="p-3 space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div>
              <a :href="`/dashboards/${dash.id}`" class="font-semibold text-gray-900 dark:text-gray-100 hover:underline" title="Open dashboard">{{ dash.name }}</a>
              <div class="text-xs text-gray-500">Created {{ formatDate(dash.created_at) }}</div>
            </div>
            <div class="flex gap-1">
              <a
                  :href="`/dashboards/${dash.id}/edit`"
                  class="inline-flex items-center justify-center rounded border   p-1 text-[11px] hover:bg-orange-50 hover:border-orange-400 hover:text-orange-800 cursor-pointer"
                  title="Edit dashboard"
              >
                <Icon name="i-heroicons-pencil" class="w-4 h-4"/>
              </a>
              <UButton size="2xs" color="gray" variant="outline" class="hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 cursor-pointer p-1" @click.stop="openRename(dash)" title="Rename dashboard">
                <Icon name="i-heroicons-pencil-square" class="w-4 h-4"/>
              </UButton>
              <UButton size="2xs" color="red" variant="outline" class="hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer p-1" @click.stop="remove(dash)" title="Delete dashboard">
                <Icon name="i-heroicons-trash" class="w-4 h-4"/>
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>

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

    <UModal v-model:open="isRenameOpen">
      <template #header>
        <div class="text-lg font-semibold">Rename Dashboard</div>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="Name">
            <UInput v-model="renameName" placeholder="Dashboard name" class="w-full"/>
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="isRenameOpen = false">Cancel</UButton>
          <UButton color="orange" :loading="renaming" @click="renameDashboard">Save</UButton>
        </div>
      </template>
    </UModal>
  </div>
  
</template>

<script setup lang="ts">
import {createColumnHelper} from '@tanstack/vue-table'

const {listDashboards, createDashboard, deleteDashboard, updateDashboard} = useDashboardsService()

const dashboards = ref<any[]>([])
const loading = ref(true)
const viewMode = ref<'table' | 'grid'>('grid')
const isCreateOpen = ref(false)
const newName = ref('')
const creating = ref(false)
const isRenameOpen = ref(false)
const renameName = ref('')
const renameTargetId = ref<string | null>(null)
const renaming = ref(false)

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

onMounted(() => {
  try {
    const stored = localStorage.getItem('dashboardViewMode')
    if (stored === 'table' || stored === 'grid') {
      viewMode.value = stored as any
    }
  } catch (e) {
    console.warn('Unable to read dashboard view preference:', e)
  }
  load()
})

watch(viewMode, (val) => {
  try {
    localStorage.setItem('dashboardViewMode', val)
  } catch (e) {
    console.warn('Unable to store dashboard view preference:', e)
  }
})

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
  navigateTo(`/dashboards/${row.id}/edit`)
}

function view(row: any) {
  navigateTo(`/dashboards/${row.id}`)
}

function openCreate() {
  newName.value = ''
  isCreateOpen.value = true
}

function openRename(row: any) {
  renameTargetId.value = row.id
  renameName.value = row.name
  isRenameOpen.value = true
}

async function create() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const res = await createDashboard({ name: newName.value.trim() })
    isCreateOpen.value = false
    navigateTo(`/dashboards/${res.dashboardId}/edit`)
  } finally {
    creating.value = false
  }
}

async function remove(row: any) {
  if (!confirm('Delete this dashboard?')) return
  await deleteDashboard(row.id)
  await load()
}

async function renameDashboard() {
  if (!renameTargetId.value || !renameName.value.trim()) return
  renaming.value = true
  try {
    await updateDashboard({id: renameTargetId.value, name: renameName.value.trim()})
    isRenameOpen.value = false
    renameTargetId.value = null
    await load()
  } finally {
    renaming.value = false
  }
}
</script>
<style scoped>
.layout-toggle {
  display: inline-flex;
  border: 1px solid #d1d5db;
  border-radius: 9999px;
  overflow: hidden;
  background: #f3f4f6;
}

.dark .layout-toggle {
  border-color: #6b7280;
  background: #111827;
}

.layout-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 44px;
  height: 30px;
  color: #374151;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.layout-btn:hover {
  background: #e5e7eb;
}

.dark .layout-btn {
  color: #e5e7eb;
}

.dark .layout-btn:hover {
  background: #1f2937;
}

.layout-btn.active {
  background: #0f4b75;
  color: #ffffff;
}
</style>

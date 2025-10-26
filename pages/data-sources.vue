<template>
  <div class="p-6">
    <div class="mb-6">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <UButton color="orange" @click="navigateTo('/integration-wizard')" class="w-fit">
          <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
          add data source
        </UButton>
        <div class="text-sm text-gray-600 text-center sm:text-right">{{ connections.length }} / 20 DATA SOURCES USED</div>
      </div>
    </div>

    <div class="max-w-2xl mx-auto">
      <!-- Search -->
      <div class="mb-6">
        <div class="relative">
          <Icon name="heroicons:magnifying-glass" class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <UInput 
            placeholder="Search" 
            class="pl-10 w-full"
            v-model="searchQuery"
          />
        </div>
      </div>

      <div class="space-y-6">
        <!-- Databases Section (from DB) -->
        <div>
          <h3 class="text-lg font-medium mb-4 text-primary">DATABASES</h3>
          <div v-if="loadingConnections" class="text-sm text-gray-500">Loading connections...</div>
          <template v-else>
            <UCard
              v-for="c in filteredConnections"
              :key="c.id"
              class="hover:shadow-md transition-shadow mb-4 cursor-pointer"
              @click="goToBuilder(c.id)"
            >
              <div class="flex items-start justify-between p-4">
                <div class="flex items-center gap-4">
                  <Icon name="heroicons:circle-stack" class="w-8 h-8 text-gray-400" />
                  <div class="min-w-0">
                    <h4 class="font-medium truncate">{{ c.internal_name }}</h4>
                    <p class="text-sm text-gray-600 truncate">{{ c.database_type?.toUpperCase?.() }} • {{ c.host }}:{{ c.port }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2" @click.stop>
                  <UButton size="xs" variant="outline" @click="editConnection(c.id)">
                    <Icon name="heroicons:pencil-square" class="w-4 h-4 mr-1" /> Edit
                  </UButton>
                  <UButton size="xs" variant="outline" color="gray" @click="renameConnection(c)">
                    <Icon name="heroicons:squares-2x2" class="w-4 h-4 mr-1" /> Rename
                  </UButton>
                  <UButton size="xs" color="red" variant="outline" @click="deleteConnection(c.id)">
                    <Icon name="heroicons:trash" class="w-4 h-4 mr-1" /> Delete
                  </UButton>
                  <UButton size="xs" color="primary" @click="goToBuilder(c.id)">
                    Open
                  </UButton>
                </div>
              </div>
            </UCard>
            <div v-if="!filteredConnections.length" class="text-sm text-gray-500">No data sources found.</div>
          </template>
        </div>

        <!-- Demo Data Sources Section -->
        <div v-if="false">
          <h3 class="text-lg font-medium mb-4 text-primary">DEMO DATA SOURCES</h3>
          <div v-if="loadingDemos" class="text-sm text-gray-500">Loading demos...</div>
          <template v-else>
            <UCard 
              v-for="d in filteredDemos" 
              :key="d.id"
              class="hover:shadow-md transition-shadow cursor-pointer mb-4"
              @click="importDemo(d)"
            >
              <div class="flex items-center gap-4 p-4">
                <Icon name="heroicons:bookmark" class="w-8 h-8 text-gray-400" />
                <div>
                  <h4 class="font-medium">{{ d.label }}</h4>
                  <p class="text-sm text-gray-600">{{ d.description }}</p>
                </div>
              </div>
            </UCard>
            <div v-if="!filteredDemos.length" class="text-sm text-gray-500">No demos available.</div>
          </template>
        </div>

        <!-- Flat Files Section (hidden temporarily) -->
        <div v-if="false"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const searchQuery = ref('')

const connections = ref<Array<{ id: number; internal_name: string; database_type?: string; host?: string; port?: number }>>([])
const demos = ref<Array<{ id: string; label: string; description?: string }>>([])

const loadingConnections = ref(true)
const loadingDemos = ref(true)

const filteredConnections = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return connections.value
  return connections.value.filter(c =>
    c.internal_name.toLowerCase().includes(q) ||
    (c.host || '').toLowerCase().includes(q)
  )
})

const filteredDemos = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return demos.value
  return demos.value.filter(d =>
    (d.label || '').toLowerCase().includes(q) ||
    (d.description || '').toLowerCase().includes(q)
  )
})

async function loadConnections() {
  try {
    connections.value = await $fetch('/api/reporting/connections')
  } finally {
    loadingConnections.value = false
  }
}

async function loadDemos() {
  try {
    demos.value = await $fetch('/api/data-sources/demos')
  } finally {
    loadingDemos.value = false
  }
}

function goToBuilder(connectionId) {
  navigateTo(`/reporting/builder?data_connection_id=${connectionId}`)
}

function editConnection(connectionId: number) {
  navigateTo(`/integration-wizard?id=${connectionId}`)
}

async function deleteConnection(connectionId: number) {
  if (!confirm('Delete this data source? This cannot be undone.')) return
  try {
    await $fetch('/api/reporting/connections', { method: 'DELETE', params: { id: connectionId } })
    await loadConnections()
  } catch (e) {
    console.error('Failed to delete connection', e)
  }
}

async function renameConnection(c: { id: number; internal_name: string }) {
  const next = prompt('New name', c.internal_name)
  if (!next || next.trim() === c.internal_name) return
  try {
    await $fetch('/api/reporting/connections', { method: 'PUT', params: { id: c.id }, body: { internal_name: next.trim() } })
    await loadConnections()
  } catch (e) {
    console.error('Failed to rename connection', e)
  }
}

async function importDemo(demo) {
  try {
    const res = await $fetch('/api/data-sources/import', { method: 'POST', body: { id: demo.id } })
    if (res?.connectionId) {
      await loadConnections()
      goToBuilder(res.connectionId)
    }
  } catch (e) {
    console.error('Failed to import demo:', e)
  }
}

onMounted(() => {
  loadConnections()
  loadDemos()
})
</script>

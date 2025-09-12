<template>
  <div class="p-6">
    <div class="mb-6">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <UButton color="orange" @click="navigateTo('/integration-wizard')" class="w-fit">
          <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
          add data source
        </UButton>
        <div class="text-sm text-gray-600 text-center sm:text-right">2 / 20 DATA SOURCES USED</div>
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
        <!-- Databases Section -->
        <div>
          <h3 class="text-lg font-medium mb-4 text-primary">DATABASES</h3>
          <UCard 
            v-for="db in databases" 
            :key="db.id"
            class="hover:shadow-md transition-shadow cursor-pointer mb-4"
            @click="selectDataSource(db)"
          >
            <div class="flex items-center gap-4 p-4">
              <Icon name="heroicons:circle-stack" class="w-8 h-8 text-gray-400" />
              <div>
                <h4 class="font-medium">{{ db.name }}</h4>
                <p class="text-sm text-gray-600">{{ db.description }}</p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Flat Files Section -->
        <div>
          <h3 class="text-lg font-medium mb-4" style="color: rgb(194, 65, 12);">FLAT FILES</h3>
          <UCard 
            v-for="file in flatFiles" 
            :key="file.id"
            class="hover:shadow-md transition-shadow cursor-pointer mb-4"
            @click="selectDataSource(file)"
          >
            <div class="flex items-center gap-4 p-4">
              <Icon name="heroicons:document-text" class="w-8 h-8 text-gray-400" />
              <div>
                <h4 class="font-medium">{{ file.name }}</h4>
                <p class="text-sm text-gray-600">{{ file.description }}</p>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const searchQuery = ref('')

const databases = ref([
  {
    id: 1,
    name: 'insta800.net',
    description: 'Database connection',
    type: 'database'
  }
])

const flatFiles = ref([
  {
    id: 2,
    name: 'BoK1',
    description: 'Last updated: 28.02.2024 12:40',
    type: 'flat-file'
  }
])

const selectDataSource = (dataSource) => {
  // Handle data source selection
  console.log('Selected data source:', dataSource)
}
</script>

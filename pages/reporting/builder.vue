 <template>
  <ReportingLayout>
    <template #left>
      <div class="p-4">
        <h2 class="font-medium mb-2">Datasets</h2>
        <div class="space-y-2">
          <button
            v-for="ds in datasets"
            :key="ds.id"
            class="w-full text-left px-3 py-2 rounded border hover:bg-gray-50"
            :class="{ 'border-blue-500 bg-blue-50': ds.id === selectedDatasetId }"
            @click="selectDataset(ds.id)"
          >
            {{ ds.label || ds.name }}
          </button>
        </div>
      </div>
    </template>

    <template #center>
      <ReportingBuilder />
    </template>

    <template #right>
      <div class="p-4">
        <h2 class="font-medium mb-2">Settings</h2>
        <p class="text-gray-600">More settings coming soon.</p>
      </div>
    </template>
  </ReportingLayout>
</template>

<script setup lang="ts">
import ReportingLayout from '../../components/reporting/ReportingLayout.vue'
import ReportingBuilder from '../../components/reporting/ReportingBuilder.vue'
import { useReportingService } from '../../composables/useReportingService'
import { onMounted, ref } from 'vue'

const { listDatasets, setSelectedDatasetId, selectedDatasetId } = useReportingService()
const datasets = ref<Array<{ id: string; name: string; label?: string }>>([])

function selectDataset(id: string) {
  setSelectedDatasetId(id)
}

onMounted(async () => {
  datasets.value = await listDatasets()
})
</script>

<style scoped>
</style>



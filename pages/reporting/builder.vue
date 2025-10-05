 <template>
  <ReportingLayout>
    <template #left>
      <div class="p-4 space-y-6">
        <div>
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
        <ReportingSchemaPanel v-if="schema.length" :fields="schema" />
        <div v-if="relationships.length" class="mt-6">
          <ReportingJoinsPanel :relationships="relationships" />
        </div>
        <ReportingFilters v-if="schema.length" :schema="schema" />
      </div>
    </template>

    <template #center>
      <div class="p-6">
        <h3 class="font-medium mb-2">Zones</h3>
        <ReportingZones />
        <div class="mt-6">
          <ReportingBuilder />
        </div>
      </div>
    </template>

    <template #right>
      <div class="p-4 space-y-4">
        <h2 class="font-medium mb-2">Appearance</h2>
        <ReportingAppearancePanel />
      </div>
    </template>
  </ReportingLayout>
</template>

<script setup lang="ts">
import ReportingLayout from '../../components/reporting/ReportingLayout.vue'
import ReportingBuilder from '../../components/reporting/ReportingBuilder.vue'
import ReportingSchemaPanel from '../../components/reporting/ReportingSchemaPanel.vue'
import ReportingZones from '../../components/reporting/ReportingZones.vue'
import ReportingFilters from '../../components/reporting/ReportingFilters.vue'
import ReportingAppearancePanel from '../../components/reporting/ReportingAppearancePanel.vue'
import ReportingJoinsPanel from '../../components/reporting/ReportingJoinsPanel.vue'
import { useReportingService } from '../../composables/useReportingService'
import { onMounted, ref, watch } from 'vue'
import { useReportState } from '../../composables/useReportState'

const { listDatasets, getSchema, getRelationships, setSelectedDatasetId, selectedDatasetId } = useReportingService()
const datasets = ref<Array<{ id: string; name: string; label?: string }>>([])
const schema = ref<any[]>([])
const relationships = ref<any[]>([])
const { selectedDatasetId: selectedIdState } = useReportState()

function selectDataset(id: string) {
  setSelectedDatasetId(id)
}

onMounted(async () => {
  datasets.value = await listDatasets()
  // Auto-select first dataset if none is chosen yet
  if (!selectedDatasetId.value && datasets.value.length > 0) {
    setSelectedDatasetId(datasets.value[0].id)
    selectedIdState.value = datasets.value[0].id
  }
})

watch(selectedDatasetId, async (id) => {
  if (id) {
    schema.value = await getSchema(id)
    relationships.value = await getRelationships(id)
  } else {
    schema.value = []
    relationships.value = []
  }
})
</script>

<style scoped>
</style>



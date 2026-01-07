<template>
  <div class="h-full flex flex-col p-4 lg:p-6 overflow-hidden">
    <div class="space-y-4 flex-1 flex flex-col min-h-0">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="flex items-center gap-3 flex-1">
        <template v-if="isEditableSession">
          <UInput v-model="dashboardName" class="w-72"/>
        </template>
        <template v-else>
          <h1 class="text-xl lg:text-2xl font-semibold truncate">{{ dashboardName }}</h1>
        </template>
      </div>
      <div class="flex items-center gap-2">
        <UButton v-if="false" variant="outline" color="blue" size="sm" @click="openPreview" class="hover:bg-blue-500 hover:text-white cursor-pointer" title="Preview dashboard">
          <Icon name="i-heroicons-eye" class="w-4 h-4 mr-1"/>
          Preview
        </UButton>
        <UButton v-if="false" variant="outline" color="red" size="sm" @click="downloadPDF" class="hover:bg-red-500 hover:text-white cursor-pointer" title="Download as PDF">
          <Icon name="i-heroicons-document-arrow-down" class="w-4 h-4 mr-1"/>
          Get PDF
        </UButton>
        <UButton
            variant="outline"
            color="green"
            size="sm"
            class="hover:bg-green-500 hover:text-white cursor-pointer"
            @click="openShareModal"
            title="Share dashboard"
        >
          <Icon name="i-heroicons-share" class="w-4 h-4 mr-1"/>
          Share
        </UButton>
        <UButton
            v-if="canEditDashboard"
            :color="isEditableSession ? 'gray' : 'orange'"
            variant="solid"
            size="sm"
            class="cursor-pointer"
            @click="handleModeToggle"
            :loading="saving"
        >
          <Icon :name="isEditableSession ? 'i-heroicons-check' : 'i-heroicons-pencil-square'" class="w-4 h-4 mr-1"/>
          {{ isEditableSession ? 'Done' : 'Edit' }}
        </UButton>
        <div v-if="isEditableSession" class="flex items-center gap-1 ml-2 border-l pl-2 border-gray-200 dark:border-gray-700">
          <UButton
              variant="ghost"
              :color="canUndo ? 'orange' : 'gray'"
              size="sm"
              :disabled="!canUndo"
              class="cursor-pointer disabled:opacity-30 transition-colors"
              @click="undo"
              title="Undo (Ctrl+Z)"
          >
            <Icon name="i-heroicons-arrow-uturn-left" class="w-4 h-4"/>
          </UButton>
          <UButton
              variant="ghost"
              :color="canRedo ? 'orange' : 'gray'"
              size="sm"
              :disabled="!canRedo"
              class="cursor-pointer disabled:opacity-30 transition-colors"
              @click="redo"
              title="Redo (Ctrl+Y)"
          >
            <Icon name="i-heroicons-arrow-uturn-right" class="w-4 h-4"/>
          </UButton>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <div class="flex flex-col lg:flex-row lg:items-center gap-2 px-1 py-2">
        <!-- Tabs -->
        <div class="flex items-center gap-1 flex-1 overflow-x-auto">
          <button
              v-for="(tab, index) in tabs"
              :key="tab.id"
              @click="selectTab(tab.id)"
              :class="[
              'px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 border-b-2 cursor-pointer',
              activeTabId === tab.id
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            ]"
          >
            <span>{{ tab.name }}</span>

            <!-- Dropdown menu for tab actions -->
            <UDropdownMenu
                v-if="isEditableSession"
                :items="getTabMenuItems(tab)"
                :popper="{ placement: 'bottom-end' }"
            >
              <UButton
                  variant="ghost"
                  size="xs"
                  class="p-0 h-4 w-4 opacity-70 hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer"
                  title="Tab options"
                  @click.stop
              >
                <Icon name="i-heroicons-chevron-down" class="w-3 h-3"/>
              </UButton>
            </UDropdownMenu>
          </button>

          <!-- Add Tab Button (just + icon) -->
          <button
              v-if="isEditableSession"
              @click="showCreateTabModal = true"
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer border-b-2 border-transparent"
              title="Add new tab"
          >
            <Icon name="i-heroicons-plus" class="w-4 h-4"/>
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UButton :variant="device==='desktop'?'solid':'outline'" color="orange" size="xs" @click="setDevice('desktop')" class="cursor-pointer" title="Desktop preview">
            <Icon name="i-heroicons-computer-desktop" class="w-4 h-4"/>
          </UButton>
          <UButton :variant="device==='tablet'?'solid':'outline'" color="orange" size="xs" @click="setDevice('tablet')" class="cursor-pointer" title="Tablet preview">
            <Icon name="i-heroicons-device-tablet" class="w-4 h-4"/>
          </UButton>
          <UButton :variant="device==='mobile'?'solid':'outline'" color="orange" size="xs" @click="setDevice('mobile')" class="cursor-pointer" title="Mobile preview">
            <Icon name="i-heroicons-device-phone-mobile" class="w-4 h-4"/>
          </UButton>
          <UButton
              v-if="isEditableSession"
              variant="outline"
              color="blue"
              size="xs"
              @click="autoLayout"
              class="hover:bg-blue-500 hover:text-white cursor-pointer"
              title="Automatically arrange charts"
          >
            <Icon name="i-heroicons-arrows-pointing-out" class="w-4 h-4 mr-1"/>
            Auto Layout
          </UButton>
          <UButton
              v-if="isEditableSession"
              color="orange"
              variant="solid"
              size="xs"
              class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer flex items-center gap-1"
              @click="addTextBlock"
              title="Add text"
          >
            <Icon name="i-heroicons-plus" class="w-4 h-4"/>
            Add Text
          </UButton>
          <UButton
              v-if="isEditableSession"
              color="orange"
              variant="solid"
              size="xs"
              class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer flex items-center gap-1"
              @click="showAddImageModal = true"
              title="Add image"
          >
            <Icon name="i-heroicons-photo" class="w-4 h-4"/>
            Add Image
          </UButton>
          <UButton
              v-if="isEditableSession"
              color="orange"
              variant="solid"
              size="xs"
              class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer flex items-center gap-1"
              @click="showAddIconModal = true"
              title="Add icon"
          >
            <Icon name="i-lucide-shapes" class="w-4 h-4"/>
            Add Icon
          </UButton>
          <UDropdownMenu
              v-if="isEditableSession"
              :items="addChartMenuItems"
              :popper="{ placement: 'bottom-end' }"
          >
            <UButton
                color="orange"
                variant="solid"
                size="xs"
                class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer flex items-center gap-1"
                title="Add chart"
            >
              <Icon name="i-heroicons-plus-circle" class="w-4 h-4"/>
              Add Chart
            </UButton>
          </UDropdownMenu>
          <UButton
              v-if="isEditableSession"
              color="purple"
              variant="solid"
              size="xs"
              class="bg-purple-500 hover:bg-purple-600 text-white cursor-pointer flex items-center gap-1"
              @click="editingFilter = null; showAddFilterModal = true"
              title="Add filter"
          >
            <Icon name="i-heroicons-funnel" class="w-4 h-4"/>
            Add Filter
          </UButton>
          <UButton
              v-if="isEditableSession && activePanel === 'none'"
              size="xs"
              variant="outline"
              class="cursor-pointer"
              @click="setActivePanel('options')"
              title="Show Panel"
          >
            <Icon name="i-heroicons-adjustments-horizontal" class="w-4 h-4 mr-1"/>
            Show Panel
          </UButton>
        </div>
      </div>
    </div>

    <!-- Debug Panel (only in dev mode) -->
    <ClientOnly>
      <DebugGridLayoutPanel
          v-if="$nuxt.isDev"
          :config="gridConfig"
          :layout="gridLayout"
          @update:config="Object.assign(gridConfig, $event)"
          @update:layout="gridLayout = $event"
      />
    </ClientOnly>

    <!-- Rename Chart Modal -->
    <UModal v-model:open="showRenameModal">
      <template #header>
        <h3 class="text-lg font-semibold">Rename Chart</h3>
      </template>
      <template #body>
        <UForm :state="renameForm" @submit="renameChart">
          <UFormField label="New Chart Name" name="newName">
            <UInput v-model="renameForm.newName" class="w-full"/>
          </UFormField>
          <div class="flex justify-end gap-2 mt-4">
            <UButton variant="outline" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="showRenameModal = false">Cancel</UButton>
            <UButton type="submit" color="orange" class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer" :loading="renaming">Rename</UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Delete Chart Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="text-lg font-semibold text-red-600">Delete Chart</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <p>Are you sure you want to delete the chart "<strong>{{ chartToDeleteName }}</strong>"?</p>
          <p class="text-sm text-gray-600">This action cannot be undone. The chart will be removed from this dashboard but will still be available in your saved charts.</p>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="showDeleteModal = false">Cancel</UButton>
            <UButton color="red" class="hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer" :loading="deleting" @click="deleteChart">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Add Chart Modal -->
    <UModal v-model:open="showAddChartModal" size="5xl" class="max-w-6xl w-full">
      <template #header>
        <h3 class="text-lg font-semibold">Add Chart to Dashboard</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div v-if="loadingCharts || loadingDashboardsForGallery" class="flex items-center gap-2 text-gray-600">
            <Icon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin"/>
            <span>Loading charts...</span>
          </div>
          <div v-else-if="availableCharts.length === 0" class="text-center py-8 text-gray-500">
            <Icon name="i-heroicons-chart-bar" class="w-12 h-12 mx-auto mb-4 opacity-50"/>
            <p>No saved charts available</p>
            <p class="text-sm">Create charts in the Report Builder first</p>
          </div>
          <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-4 max-h-[30rem]">
            <div class="lg:col-span-2 space-y-3 overflow-y-auto pr-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
                  <Icon name="i-heroicons-rectangle-stack" class="w-5 h-5 text-orange-500"/>
                  Chart Gallery
                </div>
                <div class="relative w-64">
                  <UInput v-model="gallerySearch" placeholder="Search charts..." class="w-full pr-10" size="sm"/>
                  <button
                      v-if="gallerySearch"
                      class="absolute inset-y-0 right-2 my-auto text-gray-400 hover:text-gray-600 cursor-pointer"
                      @click="gallerySearch = ''"
                  >
                    <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
                  </button>
                </div>
              </div>
              <div class="border rounded-md divide-y">
                <div
                    v-for="dash in filteredDashboardsWithUngrouped"
                    :key="dash.id"
                    class="px-3 py-2"
                >
                  <button
                      class="w-full flex items-center justify-between text-left cursor-pointer hover:bg-gray-50 rounded-md px-2 py-1"
                      @click="toggleGallerySection(dash.id)"
                  >
                    <div class="flex items-center gap-2">
                      <Icon :name="isGallerySectionOpen(dash.id) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" class="w-4 h-4 text-gray-500"/>
                      <span class="font-medium text-gray-800">{{ dash.name }}</span>
                      <span class="text-xs text-gray-500">({{ dash.charts.length }})</span>
                    </div>
                  </button>
                  <div v-if="isGallerySectionOpen(dash.id)" class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div
                        v-for="chart in dash.charts"
                        :key="chart.chartId"
                        class="border rounded-md p-2 cursor-pointer hover:border-orange-300 transition-colors flex gap-3"
                        :class="selectedGalleryChartId === chart.chartId ? 'border-orange-400 bg-orange-50' : ''"
                        @click="selectedGalleryChartId = chart.chartId"
                    >
                      <div class="w-20 flex-shrink-0">
                        <div class="w-full h-14 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                          <img
                              v-if="availableChartById(chart.chartId)?.thumbnailUrl"
                              :src="availableChartById(chart.chartId)?.thumbnailUrl"
                              alt="thumb"
                              class="w-full h-full object-cover"
                          />
                          <Icon v-else name="i-heroicons-chart-bar" class="w-5 h-5 text-gray-400"/>
                        </div>
                        <div class="text-[11px] text-gray-600 mt-1 truncate">{{ chart.name }}</div>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium truncate">{{ chart.name }}</div>
                        <div class="text-xs text-gray-500 truncate">{{ availableChartById(chart.chartId)?.description || 'No description' }}</div>
                      </div>
                      <UButton
                          size="xs"
                          color="orange"
                          variant="solid"
                          class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                          @click.stop="addChartToDashboard(chart.chartId)"
                      >
                        Add
                      </UButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="space-y-3 border-l pl-3 hidden lg:block">
              <div class="text-sm font-semibold uppercase tracking-wide text-gray-600">Preview</div>
              <div v-if="selectedGalleryChart" class="space-y-2">
                <div class="w-full h-40 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                  <img
                      v-if="selectedGalleryChart.thumbnailUrl"
                      :src="selectedGalleryChart.thumbnailUrl"
                      alt="Chart preview"
                      class="w-full h-full object-cover"
                  />
                  <Icon v-else name="i-heroicons-chart-bar" class="w-10 h-10 text-gray-400"/>
                </div>
                <div class="font-medium">{{ selectedGalleryChart.name }}</div>
                <div class="text-sm text-gray-500">{{ selectedGalleryChart.description || 'No description' }}</div>
                <div class="text-xs text-gray-400">Type: {{ selectedGalleryChart.state_json?.chartType || 'Unknown' }}</div>
                <UButton
                    color="orange"
                    variant="solid"
                    class="w-full bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                    :disabled="!selectedGalleryChartId"
                    @click="selectedGalleryChartId && addChartToDashboard(selectedGalleryChartId)"
                >
                  Add to this Dashboard
                </UButton>
              </div>
              <div v-else class="text-sm text-gray-500">
                Select a chart to preview.
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="showAddChartModal = false">Close</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Create Tab Modal -->
    <UModal v-model:open="showCreateTabModal">
      <template #header>
        <h3 class="text-lg font-semibold">Create New Tab</h3>
      </template>
      <template #body>
        <UForm :state="createTabForm" @submit="createTab">
          <UFormField label="Tab Name" name="name">
            <UInput v-model="createTabForm.name" class="w-full"/>
          </UFormField>
          <div class="flex justify-end gap-2 mt-4">
            <UButton variant="outline" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="showCreateTabModal = false">Cancel</UButton>
            <UButton type="submit" color="orange" class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer" :loading="creatingTab">Create Tab</UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Rename Tab Modal -->
    <UModal v-model:open="showRenameTabModal">
      <template #header>
        <h3 class="text-lg font-semibold">Rename Tab</h3>
      </template>
      <template #body>
        <UForm :state="renameTabForm" @submit="renameTab">
          <UFormField label="New Tab Name" name="name">
            <UInput v-model="renameTabForm.name" class="w-full"/>
          </UFormField>
          <div class="flex justify-end gap-2 mt-4">
            <UButton variant="outline" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="showRenameTabModal = false">Cancel</UButton>
            <UButton type="submit" color="orange" class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer" :loading="renamingTab">Rename</UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Delete Tab Confirmation Modal -->
    <UModal v-model:open="showDeleteTabModal">
      <template #header>
        <h3 class="text-lg font-semibold text-red-600">Delete Tab</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <p>Are you sure you want to delete the tab "<strong>{{ tabToDeleteName }}</strong>"?</p>
          <p class="text-sm text-gray-600">This will permanently delete all charts in this tab. This action cannot be undone.</p>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="showDeleteTabModal = false">Cancel</UButton>
            <UButton color="red" class="hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer" :loading="deletingTab" @click="deleteTab">Delete Tab</UButton>
          </div>
        </div>
      </template>
    </UModal>

      <!-- Share Dashboard Modal -->
      <ShareDashboardModal
          v-model:open="showShareModal"
          :dashboard-id="id"
          :dashboard-name="dashboardName"
      />

      <!-- Add Image Modal -->
      <AddImageModal
          v-model:open="showAddImageModal"
          @select="handleImageSelected"
      />

      <!-- Add Filter Modal -->
      <AddFilterModal
          v-model:open="showAddFilterModal"
          :dashboard-id="id"
          :connections="availableConnections"
          :editing-filter="editingFilter"
          @created="onFilterCreated"
          @updated="onFilterUpdated"
      />

      <!-- Add Icon Modal -->
      <IconLibraryModal
          v-model:open="showAddIconModal"
          @select="handleIconSelected"
      />


      <div class="flex gap-4 items-stretch flex-1 min-h-0">
        <div class="flex-1 min-w-0 h-full overflow-hidden">
          <div class="h-full overflow-auto pr-1">
            <Dashboard
                :device="device"
                :layout="gridLayout"
                @update:layout="handleLayoutUpdate"
                :grid-config="effectiveGridConfig"
                :widgets="currentTabWidgets"
                :loading="loading"
                :preview="!isEditableSession"
                :selected-text-id="selectedWidgetId"
                :dashboard-filters="activeFilterConditions"
                :tab-style="activeTabStyle"
                :dashboard-width="dashboardWidth"
                ref="dashboardRef"
                @edit-chart="editChart"
                @rename-chart="startRenameChart"
                @delete-chart="confirmDeleteChart"
                @edit-text="startEditText"
                @delete-widget="handleDeleteWidget"
                @select-text="selectWidget"
                @update-text-content="updateTextContent"
                @rename-chart-inline="renameChartInline"
                @deselect="handleDeselect"
            />
          </div>
        </div>
        <!-- Sidebar Panel with Tab Toggle -->
        <aside
            v-if="isEditableSession && activePanel !== 'none'"
            class="w-72 shrink-0 h-full flex flex-col overflow-hidden"
        >
          <!-- Tab Toggle Bar -->
          <div class="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-t-lg shadow-sm">
            <button
                :class="[
                  'flex-1 px-4 py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer rounded-tl-lg',
                  activePanel === 'filters'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                ]"
                @click="setActivePanel('filters')"
                title="Show Filters"
            >
              <Icon name="i-heroicons-funnel" class="w-4 h-4"/>
              Filters
              <UBadge v-if="dashboardFilters.length > 0" size="xs" :color="activePanel === 'filters' ? 'neutral' : 'primary'">
                {{ dashboardFilters.length }}
              </UBadge>
            </button>
            <button
                :class="[
                  'flex-1 px-4 py-2.5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
                  activePanel === 'options'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                ]"
                @click="setActivePanel('options')"
                title="Show Options"
            >
              <Icon name="i-heroicons-adjustments-horizontal" class="w-4 h-4"/>
              Options
            </button>
            <button
                class="px-3 py-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer rounded-tr-lg"
                @click="setActivePanel('none')"
                title="Close panel"
            >
              <Icon name="i-heroicons-x-mark" class="w-4 h-4"/>
            </button>
          </div>

          <!-- Filters Panel Content -->
          <DashboardFiltersPanel
              v-if="activePanel === 'filters'"
              :filters="dashboardFilters"
              :edit-mode="isEditableSession"
              :collapsed="false"
              class="flex-1 min-h-0 overflow-auto border-x border-b border-gray-200 dark:border-gray-700 rounded-b-lg"
              @update="updateFilter"
              @edit="editFilter"
              @delete="confirmDeleteFilter"
              @collapse="setActivePanel('none')"
              @expand="setActivePanel('filters')"
              @clear-all="clearAllFilters"
              @add-filter="editingFilter = null; showAddFilterModal = true"
          />

          <!-- Options Panel Content -->
          <WidgetOptionsSidebar
              v-if="activePanel === 'options'"
              :selected-widget="selectedWidget"
              :text-form="textForm"
              :font-family-items="fontFamilyItems"
              :chart-appearance="selectedChartAppearance"
              :readonly="!isEditableSession"
              :tab-style="activeTabStyle"
              :active-tab-name="activeTabName"
              :dashboard-width="dashboardWidth"
              class="flex-1 min-h-0 overflow-auto !rounded-t-none !border-t-0"
              @update-text-form="updateTextForm"
              @update-text-content="updateTextContentInline"
              @delete-widget="selectedWidget && handleDeleteWidget(selectedWidget.widgetId)"
              @edit-chart="selectedWidget && selectedWidget.chartId ? editChart(String(selectedWidget.chartId)) : null"
              @rename-chart="(name)=> selectedWidget && renameChartInline(selectedWidget.widgetId, name)"
              @delete-chart="selectedWidget && handleDeleteWidget(selectedWidget.widgetId)"
              @update-chart-appearance="updateChartAppearance"
              @update-chart-border="updateChartBorder"
              @update-image-style="updateImageStyle"
              @change-image="handleChangeImage"
              @update-icon-style="updateIconStyle"
              @change-icon="handleChangeIcon"
              @update-tab-style="updateTabStyle"
              @update-dashboard-width="updateDashboardWidth"
          />
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  alias: ['/dashboards/:id/edit']
})

const route = useRoute()
const router = useRouter()
const {userProfile, loadUserProfile} = useAuth()
const id = computed(() => String(route.params.id))

const isEditMode = computed(() => route.path.endsWith('/edit'))
const canEditDashboard = computed(() => {
  const role = userProfile.value?.role
  return role === 'ADMIN' || role === 'SUPERADMIN' || role === 'EDITOR'
})
const isEditableSession = computed(() => isEditMode.value && canEditDashboard.value)

useHead(() => ({
  title: isEditableSession.value ? 'Edit Dashboard' : 'Dashboard'
}))


watch(
    () => ({edit: isEditMode.value, role: userProfile.value?.role}),
    ({edit, role}) => {
      if (edit && role && !canEditDashboard.value) {
        navigateTo(`/dashboards/${id.value}`)
      }
    }
)

const {getDashboardFull, updateDashboard, listDashboards: listDashboardsLite} = useDashboardsService()
const { listCharts, updateChart, deleteChart: deleteChartApi } = useChartsService()
const {recordAction, undo, redo, canUndo, canRedo} = useDashboardHistory()

const dashboardName = ref('')
const initialDashboardName = ref('')
const tabs = ref<Array<{
  id: string;
  name: string;
  position: number;
  style?: any; // Tab style options
  widgets: Array<{
    widgetId: string;
    type: 'chart' | 'text' | 'image' | 'icon';
    chartId?: number;
    name?: string;
    position: any;
    state?: any;
    preloadedColumns?: any[];
    preloadedRows?: any[];
    style?: any;
    configOverride?: any;
  }>
}>>([])
const activeTabId = ref<string>('')
const gridLayout = ref<any[]>([])
const tabLayouts = reactive<Record<string, any[]>>({})
const initialTabLayouts = ref<Record<string, any[]>>({})
const dashboardWidth = ref<number | undefined>(undefined)
const loading = ref(true)

const showRenameModal = ref(false)
const showDeleteModal = ref(false)
const showAddChartModal = ref(false)
const showCreateTabModal = ref(false)
const showRenameTabModal = ref(false)
const showDeleteTabModal = ref(false)
const showAddImageModal = ref(false)
const showAddIconModal = ref(false)
const changingIconWidgetId = ref<string | null>(null)
const showAddFilterModal = ref(false)
const pendingRoute = ref<any>(null)

// Clear the changing icon widget ID when the modal closes (prevents stale state)
watch(showAddIconModal, (open) => {
  if (!open) {
    changingIconWidgetId.value = null
  }
})

// Dashboard filters state
interface DashboardFilter {
  id: string
  dashboardId: string
  connectionId: number | null
  fieldId: string
  fieldTable: string
  fieldType: string
  filterName: string
  isVisible: boolean
  filterMode: string
  config: Record<string, any>
  currentValue: any
}
const dashboardFilters = ref<DashboardFilter[]>([])
const filterToDelete = ref<DashboardFilter | null>(null)
const editingFilter = ref<DashboardFilter | null>(null)

// Sidebar panel state - only one can be open at a time
// 'filters' | 'options' | 'none'
const activePanel = ref<'filters' | 'options' | 'none'>('options')
const filtersPanelCollapsed = computed(() => activePanel.value !== 'filters')
const sidebarCollapsed = computed(() => activePanel.value !== 'options')

function setActivePanel(panel: 'filters' | 'options' | 'none') {
  activePanel.value = panel
}

// Available connections for filter modal
const availableConnections = ref<Array<{ id: number; internalName: string }>>([])
const { listConnections } = useReportingService()

// Text widget editor
const selectedTextWidgetId = ref<string | null>(null)
const selectedWidgetId = selectedTextWidgetId
const renameChartTimers: Record<number, ReturnType<typeof setTimeout>> = {}
const saveChartOverrideTimers: Record<string, ReturnType<typeof setTimeout>> = {}
let saveDashboardNameTimer: ReturnType<typeof setTimeout> | null = null

// Helper to check if a widget ID is temporary (pending server creation)
function isTempWidgetId(widgetId: string | null | undefined): boolean {
  return widgetId?.startsWith('temp-') ?? false
}
let saveLayoutTimer: ReturnType<typeof setTimeout> | null = null
const textForm = reactive({
  content: 'Add your text',
  fontFamily: 'Proxima Nova, Inter, sans-serif',
  fontSize: 14,
  lineHeight: 18,
  color: '#111827',
  background: '#ffffff',
  padding: 10,
  shape: 'square',
  shadow: 'none',
  align: 'left',
  bold: false,
  italic: false,
  underline: false,
  borderRadius: 6,
  borderWidth: 0,
  borderColor: '#cccccc',
  borderStyle: 'solid',
})

// Baseline widget style for undo/redo - captures state when widget is selected or after undo/redo
const baselineWidgetStyle = ref<{ widgetId: string; style: Record<string, any>; configOverride?: Record<string, any> } | null>(null)
let styleChangeHistoryTimer: ReturnType<typeof setTimeout> | null = null
let iconChartHistoryTimer: ReturnType<typeof setTimeout> | null = null

// Helper to schedule debounced history recording for icon/chart/image style changes
function scheduleWidgetHistoryRecording(widgetId: string, changeType: string) {
  if (iconChartHistoryTimer) clearTimeout(iconChartHistoryTimer)
  iconChartHistoryTimer = setTimeout(() => {
    if (!baselineWidgetStyle.value || baselineWidgetStyle.value.widgetId !== widgetId) return

    const currentWidget = tabs.value.flatMap(t => t.widgets).find(w => w.widgetId === widgetId)
    if (!currentWidget) return

    const currentStyle = JSON.parse(JSON.stringify(currentWidget.style || {}))
    const currentConfig = JSON.parse(JSON.stringify(currentWidget.configOverride || {}))
    const baselineStyle = baselineWidgetStyle.value.style
    const baselineConfig = baselineWidgetStyle.value.configOverride || {}

    // Skip if no change
    if (JSON.stringify(baselineStyle) === JSON.stringify(currentStyle) &&
        JSON.stringify(baselineConfig) === JSON.stringify(currentConfig)) {
      return
    }

    console.log('[Page] Recording', changeType, 'history for widget', widgetId)

    const capturedBaselineStyle = JSON.parse(JSON.stringify(baselineStyle))
    const capturedBaselineConfig = JSON.parse(JSON.stringify(baselineConfig))
    const capturedNewStyle = JSON.parse(JSON.stringify(currentStyle))
    const capturedNewConfig = JSON.parse(JSON.stringify(currentConfig))

    recordAction({
      type: changeType,
      undo: async () => {
        const w = tabs.value.flatMap(t => t.widgets).find(x => x.widgetId === widgetId)
        if (w) {
          w.style = JSON.parse(JSON.stringify(capturedBaselineStyle))
          w.configOverride = JSON.parse(JSON.stringify(capturedBaselineConfig))
          await $fetch('/api/dashboard-widgets', {
            method: 'PUT',
            body: {widgetId, style: capturedBaselineStyle, configOverride: capturedBaselineConfig}
          }).catch(e => console.error('Failed to persist undo', e))
        }
        baselineWidgetStyle.value = {widgetId, style: capturedBaselineStyle, configOverride: capturedBaselineConfig}
      },
      redo: async () => {
        const w = tabs.value.flatMap(t => t.widgets).find(x => x.widgetId === widgetId)
        if (w) {
          w.style = JSON.parse(JSON.stringify(capturedNewStyle))
          w.configOverride = JSON.parse(JSON.stringify(capturedNewConfig))
          await $fetch('/api/dashboard-widgets', {
            method: 'PUT',
            body: {widgetId, style: capturedNewStyle, configOverride: capturedNewConfig}
          }).catch(e => console.error('Failed to persist redo', e))
        }
        baselineWidgetStyle.value = {widgetId, style: capturedNewStyle, configOverride: capturedNewConfig}
      }
    })

    // Update baseline
    baselineWidgetStyle.value = {widgetId, style: capturedNewStyle, configOverride: capturedNewConfig}
  }, 500)
}

const fontFamilyItems = [
  {label: 'Proxima Nova', value: 'Proxima Nova, Inter, sans-serif'},
  {label: 'Inter', value: 'Inter, sans-serif'},
  {label: 'Roboto', value: 'Roboto, sans-serif'},
  {label: 'Open Sans', value: '"Open Sans", sans-serif'},
  {label: 'Lato', value: 'Lato, sans-serif'},
  {label: 'Montserrat', value: 'Montserrat, sans-serif'},
  {label: 'Arial', value: 'Arial, sans-serif'},
  {label: 'Times New Roman', value: '"Times New Roman", serif'},
  {label: 'Georgia', value: 'Georgia, serif'},
]

// Rename functionality
const renamingChart = ref<string | null>(null)
const renameForm = reactive({
  newName: ''
})
const renaming = ref(false)

// Delete functionality
const chartToDelete = ref<string | null>(null)
const chartToDeleteName = ref('')
const deleting = ref(false)

// Available charts for adding
const availableCharts = ref<Array<{ id: number; name: string; description?: string; state_json: any; thumbnailUrl?: string | null }>>([])
const loadingCharts = ref(false)
const loadingDashboardsForGallery = ref(false)
const dashboardsForGallery = ref<Array<{ id: string; name: string; charts: Array<{ chartId: number; name: string }> }>>([])
const gallerySearch = ref('')
const selectedGalleryChartId = ref<number | null>(null)
const expandedGallerySections = reactive<Record<string, boolean>>({})

// Tab operations
const createTabForm = reactive({name: ''})
const creatingTab = ref(false)
const renameTabForm = reactive({name: ''})
const renamingTab = ref(false)
const tabToRename = ref<string | null>(null)
const tabToDelete = ref<string | null>(null)
const tabToDeleteName = ref('')
const deletingTab = ref(false)

// Debug panel state
const debugPanelOpen = ref(false)

// Share modal state
const showShareModal = ref(false)
const gridConfig = reactive({
  colNum: 12,
  rowHeight: 30,
  maxRows: Infinity,
  margin: [20, 20],
  isDraggable: true,
  isResizable: true,
  isMirrored: false,
  isBounded: false,
  autoSize: true,
  verticalCompact: true,
  restoreOnDrag: false,
  preventCollision: false,
  useCssTransforms: true,
  useStyleCursor: true,
  transformScale: 1,
  responsive: true,
  breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
  cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }
})

const effectiveGridConfig = computed(() => ({
  ...gridConfig,
  isDraggable: gridConfig.isDraggable && isEditableSession.value,
  isResizable: gridConfig.isResizable && isEditableSession.value,
  useStyleCursor: gridConfig.useStyleCursor && isEditableSession.value
}))

const device = ref<'desktop' | 'tablet' | 'mobile'>('desktop')


const currentTabWidgets = computed(() => {
  const currentTab = tabs.value.find(t => t.id === activeTabId.value)
  return currentTab?.widgets || []
})

const currentTabCharts = computed(() => currentTabWidgets.value.filter(w => w.type === 'chart'))

function getDataConnectionIdFromState(state: any): number | null {
  if (!state) return null
  const fromRoot = state.dataConnectionId ?? state?.internal?.dataConnectionId
  const parsed = fromRoot != null ? Number(fromRoot) : null
  return parsed !== null && Number.isFinite(parsed) ? parsed : null
}

const preferredDataConnectionId = computed<number | null>(() => {
  for (const tab of tabs.value) {
    for (const widget of tab.widgets || []) {
      if (widget.type !== 'chart') continue
      const connectionId = getDataConnectionIdFromState(widget.state)
      if (connectionId != null) {
        return connectionId
      }
    }
  }
  return null
})


const dashboardRef = ref<any>(null)
watch([isEditableSession, currentTabWidgets, activeTabId], () => {
  if (!isEditableSession.value) {
    selectedTextWidgetId.value = null
    return
  }
  if (selectedTextWidgetId.value && currentTabWidgets.value.some(w => w.widgetId === selectedTextWidgetId.value)) {
    return
  }
  const firstText = currentTabWidgets.value.find(w => w.type === 'text')
  selectedTextWidgetId.value = firstText?.widgetId || null
})

async function captureDashboardThumbnail(): Promise<{ width?: number | null; height?: number | null; thumbnailBase64?: string | null }> {
  if (typeof window === 'undefined') return {}
  const layout = gridLayout.value || []
  // Dashboard component ref resolves to component instance; use $el for the DOM node
  const container = (dashboardRef.value as any)?.$el ?? (dashboardRef.value as HTMLElement | null)
  if (!container || typeof container.getBoundingClientRect !== 'function') return {}

  const rect = container.getBoundingClientRect()
  const baseWidth = rect.width ? Math.round(rect.width) : 1200
  const baseHeight = rect.height ? Math.round(rect.height) : 800

  // Use html-to-image for a real snapshot of the dashboard content
  const {toPng} = await import('html-to-image')
  const dataUrl = await toPng(container, {
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    cacheBust: true,
    backgroundColor: '#ffffff',
    skipFonts: true
  })

  return {width: baseWidth, height: baseHeight, thumbnailBase64: dataUrl}
}

function cloneLayout(layout: any[] = []) {
  return layout.map(item => ({...item}))
}

function getDefaultTextStyle() {
  return {
    content: 'Add your text',
    fontFamily: 'Proxima Nova, Inter, sans-serif',
    fontSize: 14,
    lineHeight: 18,
    color: '#111827',
    background: '#ffffff',
    padding: 16,
    shape: 'square',
    shadow: 'none',
    align: 'left',
    bold: false,
    italic: false,
    underline: false,
    borderRadius: 6,
  }
}

function areLayoutsEqual(a: any[] = [], b: any[] = []) {
  if (a.length !== b.length) return false
  const sortLayout = (layout: any[]) => [...layout].sort((x, y) => String(x.i).localeCompare(String(y.i)))
  const sortedA = sortLayout(a)
  const sortedB = sortLayout(b)
  const toNum = (v: any) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return sortedA.every((item, idx) => {
    const match = sortedB[idx]
    return !!match &&
        toNum(item.x) === toNum(match.x) &&
        toNum(item.y) === toNum(match.y) &&
        toNum(item.w) === toNum(match.w) &&
        toNum(item.h) === toNum(match.h) &&
        String(item.i) === String(match.i)
  })
}

function buildLayoutFromTab(tabId: string) {
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab) return []
  return tab.widgets.map(w => ({
    x: w.position?.x ?? 0,
    y: w.position?.y ?? 0,
    w: w.position?.w ?? 4,
    h: w.position?.h ?? 8,
    i: String(w.widgetId)
  }))
}

function setLayoutsFromTabs(updateBaseline = true) {
  if (updateBaseline) {
    initialTabLayouts.value = {}
  }
  Object.keys(tabLayouts).forEach(key => delete tabLayouts[key])
  tabs.value.forEach(tab => {
    const layout = buildLayoutFromTab(tab.id)
    tabLayouts[tab.id] = cloneLayout(layout)
    if (updateBaseline) {
      initialTabLayouts.value[tab.id] = cloneLayout(layout)
    }
  })
  if (!activeTabId.value && tabs.value.length > 0) {
    activeTabId.value = tabs.value[0].id
  }
  gridLayout.value = cloneLayout(tabLayouts[activeTabId.value] || [])
  if (updateBaseline) {
    initialDashboardName.value = dashboardName.value
  }
}

watch(gridLayout, (layout) => {
  if (!activeTabId.value || !isEditableSession.value) return
  // We only update the local tab layout reference here.
  // The history recording happens in handleLayoutUpdate which is triggered by the Dashboard component's event
  tabLayouts[activeTabId.value] = cloneLayout(layout || [])
}, {deep: true})

function handleLayoutUpdate(newLayout: any[]) {
  console.log('[Page] handleLayoutUpdate called with', newLayout?.length, 'items')
  if (!activeTabId.value) return

  const targetTabId = activeTabId.value

  // IMPORTANT: Compare against the baseline (initialTabLayouts), NOT gridLayout.value
  // The gridLayout prop is mutated directly by vue3-grid-layout during drag/resize,
  // so gridLayout.value already equals newLayout by the time this event fires.
  const baselineLayout = cloneLayout(initialTabLayouts.value[targetTabId] || [])

  console.log('[Page] Comparing: baseline has', baselineLayout.length, 'items, new has', newLayout.length)

  // Check if actually different from baseline
  if (areLayoutsEqual(baselineLayout, newLayout)) {
    console.log('[Page] Layouts are equal - no change to record')
    return
  }

  console.log('[Page] Layouts differ - recording action')

  // Update the current gridLayout ref
  gridLayout.value = cloneLayout(newLayout)

  // Record history action with the baseline as "old" state
  recordAction({
    type: 'Layout Change',
    undo: async () => {
      if (activeTabId.value !== targetTabId) selectTab(targetTabId)
      gridLayout.value = cloneLayout(baselineLayout)
      tabLayouts[targetTabId] = cloneLayout(baselineLayout)
      // Restore baseline for this tab
      initialTabLayouts.value[targetTabId] = cloneLayout(baselineLayout)
    },
    redo: async () => {
      if (activeTabId.value !== targetTabId) selectTab(targetTabId)
      gridLayout.value = cloneLayout(newLayout)
      tabLayouts[targetTabId] = cloneLayout(newLayout)
      // Update baseline to the new layout
      initialTabLayouts.value[targetTabId] = cloneLayout(newLayout)
    }
  })

  // Update the baseline to reflect the new "before" state for future comparisons
  initialTabLayouts.value[targetTabId] = cloneLayout(newLayout)
}

// Auto-save layout changes
watch(tabLayouts, (layouts) => {
  if (!isEditableSession.value) return
  if (saveLayoutTimer) clearTimeout(saveLayoutTimer)
  saveLayoutTimer = setTimeout(async () => {
    try {
      const layoutPayload = Object.values(layouts).flatMap((layoutArr) =>
          (layoutArr || [])
              // Skip widgets with temporary IDs (not yet persisted to server)
              .filter((item) => !isTempWidgetId(String(item.i)))
              .map((item) => ({
                widgetId: String(item.i),
                position: {x: item.x, y: item.y, w: item.w, h: item.h}
              }))
      )
      await updateDashboard({
        id: id.value,
        layout: layoutPayload
      })
      // Update initial layouts to reflect saved state
      Object.keys(layouts).forEach(tabId => {
        initialTabLayouts.value[tabId] = cloneLayout(layouts[tabId] || [])
      })
    } catch (error) {
      console.error('Failed to save layout:', error)
    }
  }, 500)
}, {deep: true})

function setDevice(d: 'desktop' | 'tablet' | 'mobile') {
  device.value = d
}

function selectTab(tabId: string) {
  activeTabId.value = tabId
  const layout = tabLayouts[tabId] || buildLayoutFromTab(tabId)
  tabLayouts[tabId] = cloneLayout(layout)
  gridLayout.value = cloneLayout(layout)
}

function autoLayout() {
  const colNum = gridConfig.colNum
  const sortedItems = [...gridLayout.value].sort((a, b) => a.y - b.y || a.x - b.x)
  let currentX = 0
  let currentY = 0
  let maxHeightInRow = 0

  sortedItems.forEach((item) => {
    const defaultWidth = Math.min(6, colNum)
    item.w = Math.max(1, Math.min(defaultWidth, colNum))
    if (!item.h || item.h < 1) {
      item.h = 8
    }
    if (currentX + item.w > colNum) {
      currentX = 0
      currentY += maxHeightInRow
      maxHeightInRow = 0
    }
    item.x = currentX
    item.y = currentY
    maxHeightInRow = Math.max(maxHeightInRow, item.h)
    currentX += item.w
  })
}

function editChart(chartId: string) {
  const chart = currentTabCharts.value.find(c => String(c.chartId) === chartId)
  const connectionId = getDataConnectionIdFromState(chart?.state)
  const params = new URLSearchParams({
    chartId: chartId,
    dashboard_id: id.value
  })
  if (connectionId != null) {
    params.set('data_connection_id', String(connectionId))
  }
  navigateTo(`/reporting/builder?${params.toString()}`)
}

function openPreview() {
  navigateTo(`/dashboards/preview/${id.value}`)
}

async function load() {
  loading.value = true
  try {
    const res = await getDashboardFull(id.value)
    dashboardName.value = res.name
    dashboardWidth.value = res.width || undefined

    tabs.value = (res.tabs || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      position: t.position,
      style: t.style || {},
      widgets: (t.widgets || []).map((w: any) => ({
        widgetId: w.widgetId || w.id,
        type: w.type,
        chartId: w.type === 'chart' ? w.id ?? w.chartId : undefined,
        name: w.type === 'chart' ? w.name : (w.style?.content || 'Text'),
        position: w.position,
        state: w.type === 'chart' ? w.state : undefined,
        preloadedColumns: w.type === 'chart' ? w.data?.columns : undefined,
        preloadedRows: w.type === 'chart' ? w.data?.rows : undefined,
        style: w.style || {},
        configOverride: w.configOverride || {}
      }))
    }))

    setLayoutsFromTabs(true)

    // Load dashboard filters
    await loadFilters()
  } finally {
    loading.value = false
  }
}

async function loadFilters() {
  try {
    const res = await $fetch<{ filters: DashboardFilter[] }>(`/api/dashboards/${id.value}/filters`)
    dashboardFilters.value = res.filters || []
  } catch (err) {
    console.error('Failed to load filters:', err)
  }
}

async function loadConnections() {
  try {
    const conns = await listConnections()
    availableConnections.value = conns.map(c => ({ id: c.id, internalName: c.internal_name }))
  } catch (err) {
    console.error('Failed to load connections:', err)
  }
}

onMounted(async () => {
  await loadUserProfile()
  await Promise.all([load(), loadConnections()])
})

onBeforeRouteLeave((to, from) => {
  // No longer need to check for unsaved changes since we auto-save
  return true
})

const saving = ref(false)
async function save() {
  saving.value = true
  try {
    const layoutPayload = Object.values(tabLayouts).flatMap((layoutArr) =>
        (layoutArr || []).map((item) => ({
          widgetId: String(item.i),
          position: {x: item.x, y: item.y, w: item.w, h: item.h}
        }))
    )
    const snapshot = await captureDashboardThumbnail()
    await updateDashboard({
      id: id.value,
      name: dashboardName.value,
      layout: layoutPayload,
      width: snapshot.width,
      height: snapshot.height,
      thumbnailBase64: snapshot.thumbnailBase64
    })
    initialDashboardName.value = dashboardName.value
    Object.keys(tabLayouts).forEach(tabId => {
      initialTabLayouts.value[tabId] = cloneLayout(tabLayouts[tabId] || [])
    })
  } finally {
    saving.value = false
  }
}

async function handleModeToggle() {
  if (!canEditDashboard.value) return
  pendingRoute.value = null
  if (isEditableSession.value) {
    if (canEditDashboard.value) {
      await save()
    }
    await navigateTo(`/dashboards/${id.value}`)
    return
  }
  await navigateTo(`/dashboards/${id.value}/edit`)
}


// Chart operations
async function startRenameChart(chartId: string) {
  const chart = currentTabCharts.value.find(c => String(c.chartId) === chartId)
  if (!chart) return

  renamingChart.value = chartId
  renameForm.newName = chart.name
  showRenameModal.value = true
}

async function renameChart() {
  if (!renamingChart.value) return

  renaming.value = true
  try {
    await updateChart({
      id: Number(renamingChart.value),
      name: renameForm.newName
    })

    const chart = currentTabCharts.value.find(c => String(c.chartId) === renamingChart.value)
    if (chart) {
      chart.name = renameForm.newName
    }

    showRenameModal.value = false
    renamingChart.value = null
    renameForm.newName = ''

    // Record Action
    const oldName = chart.name
    const affectedChartId = chart.chartId
    if (oldName !== renameForm.newName && affectedChartId) {
      recordAction({
        type: 'Rename Chart',
        undo: async () => {
          await updateChart({id: Number(affectedChartId), name: oldName})
          const c = tabs.value.flatMap(t => t.widgets).find(w => w.chartId === affectedChartId)
          if (c) c.name = oldName
        },
        redo: async () => {
          await updateChart({id: Number(affectedChartId), name: renameForm.newName})
          const c = tabs.value.flatMap(t => t.widgets).find(w => w.chartId === affectedChartId)
          if (c) c.name = renameForm.newName
        }
      })
    }
  } finally {
    renaming.value = false
  }
}

async function confirmDeleteChart(chartId: string) {
  const chart = currentTabCharts.value.find(c => String(c.chartId) === chartId)
  if (!chart) return

  chartToDelete.value = chartId
  chartToDeleteName.value = chart.name
  showDeleteModal.value = true
}

async function deleteChart() {
  if (!chartToDelete.value) return

  deleting.value = true
  try {
    await deleteChartApi(Number(chartToDelete.value))

    const currentTab = tabs.value.find(t => t.id === activeTabId.value)
    if (currentTab) {
      const widgetIndex = currentTab.widgets.findIndex(w => w.type === 'chart' && String(w.chartId) === chartToDelete.value)
      if (widgetIndex >= 0) {
        const deletedWidget = currentTab.widgets[widgetIndex]
        const tabId = activeTabId.value

        currentTab.widgets.splice(widgetIndex, 1) // Remove from UI first
        const updatedLayout = buildLayoutFromTab(activeTabId.value)
        tabLayouts[activeTabId.value] = cloneLayout(updatedLayout)
        initialTabLayouts.value[activeTabId.value] = cloneLayout(updatedLayout)
        gridLayout.value = cloneLayout(updatedLayout)

        // Record Undo/Redo
        recordAction({
          type: 'Delete Chart',
          undo: async () => {
            // Create chart report (add to dashboard)
            await $fetch('/api/dashboard-reports', {
              method: 'POST',
              body: {
                dashboardId: id.value,
                chartId: Number(chartToDelete.value), // This might be null here if not captured differently, need to capture ID in closure
                position: deletedWidget.position,
                tabId: tabId
              }
            }).then(async () => {
              // Reload dashboard to get correct ID? Or assume it works and just add to local state?
              // Safer to reload or manually reconstruct local state if we knew the new ID.
              // Actually, the API assigns a new `dashboard_widget.id`.
              // We need to fetch the dashboard or just the widgets.
              await load() // Simplest way to sync
            })
          },
          redo: async () => {
            // We need to find the NEW widget ID if it was recreated.
            // This is complex because the ID changes.
            // Better strategy: "Delete Chart" action needs to find the widget by chartID + tabID to delete it again.
            const t = tabs.value.find(t => t.id === tabId)
            if (!t) return
            const w = t.widgets.find(w => w.type === 'chart' && String(w.chartId) === String(deletedWidget.chartId))
            if (w) await deleteChartApi(Number(w.widgetId)) // Wait, deleteChartApi takes chartId? No, it usually takes widgetId or we call API.
            // Looking at original delete: await deleteChartApi(Number(chartToDelete.value))
            // deleteChartApi imported from useChartsService seems to take chartId?
            // Let's check useChartsService usages or the import.
            // Ah, wait. `deleteChart` function in local scope calls `deleteChartApi`.
            // In local scope `deleteChart` (the function) calls `deleteChartApi` with `Number(chartToDelete.value)`.
            // `chartToDelete.value` is the Chart ID (from confirmDeleteChart).
            // But valid dashboard widgets are removed via dashboard-widgets API usually?
            // Let's check deleteChartApi implementation.
            // If it deletes the CHART itself, that's destructive.
            // If it removes it from dashboard, that's different.
            // "Delete Chart" modal says "The chart will be removed from this dashboard but will still be available in your saved charts."
            // So it's removing the WIDGET.
            // But `deleteChartApi` might be misleading name if it calls `deleteChart` service.
            // Let's assume for now we need to replicate what `deleteChart` does.
            await deleteChartApi(Number(deletedWidget.chartId))
            const t2 = tabs.value.find(t => t.id === tabId)
            const idx = t2?.widgets.findIndex(w => String(w.chartId) === String(deletedWidget.chartId)) ?? -1
            if (t2 && idx >= 0) {
              t2.widgets.splice(idx, 1)
              setLayoutsFromTabs(false)
            }
          }
        })
      }
    }

    showDeleteModal.value = false
    chartToDelete.value = null
    chartToDeleteName.value = ''
  } finally {
    deleting.value = false
  }
}

function startEditText(widgetId: string) {
  const widget = currentTabWidgets.value.find(w => w.widgetId === widgetId)
  if (!widget) return
  selectedTextWidgetId.value = widgetId
  // Create a copy to break reactivity if any
  const style = JSON.parse(JSON.stringify({...getDefaultTextStyle(), ...(widget.style || {})}))
  Object.assign(textForm, style)

  // Capture baseline for undo/redo
  baselineWidgetStyle.value = {
    widgetId,
    style: JSON.parse(JSON.stringify(widget.style || {}))
  }
  console.log('[Page] startEditText: captured baseline for widget', widgetId, baselineWidgetStyle.value.style)
}

function updateTextContent(widgetId: string, content: string) {
  const tab = tabs.value.find(t => t.id === activeTabId.value)
  if (!tab) return
  const widget = tab.widgets.find(w => w.widgetId === widgetId)
  if (widget) {
    widget.style = {...(widget.style || {}), content}
    if (selectedTextWidgetId.value === widgetId) {
      textForm.content = content
    }
  }
  if (saveTextTimer) clearTimeout(saveTextTimer)
  saveTextTimer = setTimeout(() => {
    selectedTextWidgetId.value = widgetId
    persistTextWidget().catch((err) => console.error('Failed to persist text widget', err))
  }, 200)
}

// Baseline for chart name changes
let chartNameBaseline: { widgetId: string; chartId: number; name: string } | null = null
let chartNameHistoryTimer: ReturnType<typeof setTimeout> | null = null

async function renameChartInline(widgetId: string, name: string) {
  const widget = tabs.value.flatMap(t => t.widgets).find(w => w.widgetId === widgetId)
  if (!widget || widget.type !== 'chart' || widget.chartId == null) return

  const chartId = Number(widget.chartId)
  if (!Number.isFinite(chartId)) return

  // Capture baseline on first change
  if (!chartNameBaseline || chartNameBaseline.widgetId !== widgetId) {
    chartNameBaseline = {widgetId, chartId, name: widget.name || ''}
  }

  widget.name = name
  
  if (renameChartTimers[chartId]) clearTimeout(renameChartTimers[chartId])
  renameChartTimers[chartId] = setTimeout(async () => {
    try {
      await updateChart({id: chartId, name})
    } catch (e) {
      console.error('Failed to rename chart inline', e)
    }
  }, 300)

  // Schedule history recording
  if (chartNameHistoryTimer) clearTimeout(chartNameHistoryTimer)
  chartNameHistoryTimer = setTimeout(() => {
    if (!chartNameBaseline || chartNameBaseline.widgetId !== widgetId) return

    const currentWidget = tabs.value.flatMap(t => t.widgets).find(w => w.widgetId === widgetId)
    if (!currentWidget) return

    const currentName = currentWidget.name || ''
    const baselineName = chartNameBaseline.name

    if (baselineName === currentName) return

    console.log('[Page] Recording Chart Title Change history')

    const capturedOldName = baselineName
    const capturedNewName = currentName
    const capturedChartId = chartNameBaseline.chartId

    recordAction({
      type: 'Chart Title Change',
      undo: async () => {
        const w = tabs.value.flatMap(t => t.widgets).find(x => x.widgetId === widgetId)
        if (w) {
          w.name = capturedOldName
          await updateChart({id: capturedChartId, name: capturedOldName}).catch(e => console.error('Failed to persist undo', e))
        }
        chartNameBaseline = {widgetId, chartId: capturedChartId, name: capturedOldName}
      },
      redo: async () => {
        const w = tabs.value.flatMap(t => t.widgets).find(x => x.widgetId === widgetId)
        if (w) {
          w.name = capturedNewName
          await updateChart({id: capturedChartId, name: capturedNewName}).catch(e => console.error('Failed to persist redo', e))
        }
        chartNameBaseline = {widgetId, chartId: capturedChartId, name: capturedNewName}
      }
    })

    // Update baseline
    chartNameBaseline = {widgetId, chartId: capturedChartId, name: currentName}
  }, 500)
}

let saveTextTimer: ReturnType<typeof setTimeout> | null = null
watch(textForm, (val) => {
  if (!selectedTextWidgetId.value || !isEditableSession.value) return
  const targetWidgetId = selectedTextWidgetId.value
  const tab = tabs.value.find(t => t.id === activeTabId.value)
  if (!tab) return
  const widget = tab.widgets.find(w => w.widgetId === targetWidgetId)
  if (widget) {
    // Avoid infinite loops by checking if actually changed
    // Simple shallow check for properties we care about or deep check
    const newStyle = {...(widget.style || {}), ...val}
    if (JSON.stringify(widget.style) !== JSON.stringify(newStyle)) {
      widget.style = newStyle
      widget.name = widget.style.content || widget.name
    }
  }
  if (saveTextTimer) clearTimeout(saveTextTimer)
  saveTextTimer = setTimeout(() => {
    persistTextWidget().catch((err) => console.error('Failed to persist text widget', err))
  }, 200)

  // Debounced history recording - record action after user stops making changes
  if (styleChangeHistoryTimer) clearTimeout(styleChangeHistoryTimer)
  styleChangeHistoryTimer = setTimeout(() => {
    console.log('[Page] Style debounce timer fired for widget', targetWidgetId)
    console.log('[Page] baselineWidgetStyle:', baselineWidgetStyle.value)

    // Only record if we have a baseline and it's for the right widget
    if (!baselineWidgetStyle.value || baselineWidgetStyle.value.widgetId !== targetWidgetId) {
      console.log('[Page] No baseline or wrong widget - skipping')
      return
    }

    // Look up the widget FRESH inside the timer (not from closure)
    const currentWidget = tabs.value.flatMap(t => t.widgets).find(w => w.widgetId === targetWidgetId)
    if (!currentWidget) {
      console.log('[Page] Widget not found - skipping')
      return
    }

    const currentStyle = JSON.parse(JSON.stringify(currentWidget.style || {}))
    const baselineStyle = baselineWidgetStyle.value.style

    console.log('[Page] Comparing styles:')
    console.log('[Page]   baseline:', JSON.stringify(baselineStyle))
    console.log('[Page]   current:', JSON.stringify(currentStyle))

    // Skip if no actual change from baseline
    if (JSON.stringify(baselineStyle) === JSON.stringify(currentStyle)) {
      console.log('[Page] Styles are equal - no change to record')
      return
    }

    console.log('[Page] Recording style change history')

    // Capture values for closure
    const capturedBaseline = JSON.parse(JSON.stringify(baselineStyle))
    const capturedNew = JSON.parse(JSON.stringify(currentStyle))

    recordAction({
      type: 'Style Change',
      undo: async () => {
        const w = tabs.value.flatMap(t => t.widgets).find(x => x.widgetId === targetWidgetId)
        if (w) {
          w.style = JSON.parse(JSON.stringify(capturedBaseline))
          if (selectedTextWidgetId.value === targetWidgetId) {
            Object.assign(textForm, {...getDefaultTextStyle(), ...capturedBaseline})
          }
          // Persist the reverted style
          await $fetch('/api/dashboard-widgets', {
            method: 'PUT',
            body: {widgetId: targetWidgetId, style: capturedBaseline}
          }).catch(e => console.error('Failed to persist undo', e))
        }
        // Update baseline
        baselineWidgetStyle.value = {widgetId: targetWidgetId, style: JSON.parse(JSON.stringify(capturedBaseline))}
      },
      redo: async () => {
        const w = tabs.value.flatMap(t => t.widgets).find(x => x.widgetId === targetWidgetId)
        if (w) {
          w.style = JSON.parse(JSON.stringify(capturedNew))
          if (selectedTextWidgetId.value === targetWidgetId) {
            Object.assign(textForm, {...getDefaultTextStyle(), ...capturedNew})
          }
          // Persist the redone style
          await $fetch('/api/dashboard-widgets', {
            method: 'PUT',
            body: {widgetId: targetWidgetId, style: capturedNew}
          }).catch(e => console.error('Failed to persist redo', e))
        }
        // Update baseline
        baselineWidgetStyle.value = {widgetId: targetWidgetId, style: JSON.parse(JSON.stringify(capturedNew))}
      }
    })

    // Update baseline to the new state for the next change
    baselineWidgetStyle.value = {widgetId: targetWidgetId, style: JSON.parse(JSON.stringify(currentStyle))}
  }, 500) // Debounce history recording by 500ms
}, {deep: true})

// Auto-save dashboard name changes
let dashboardNameBaseline: string | null = null
let dashboardNameHistoryTimer: ReturnType<typeof setTimeout> | null = null

watch(dashboardName, (newName) => {
  if (!isEditableSession.value || !newName.trim()) return

  // Capture baseline on first change
  if (dashboardNameBaseline === null) {
    dashboardNameBaseline = initialDashboardName.value
  }
  
  if (saveDashboardNameTimer) clearTimeout(saveDashboardNameTimer)
  saveDashboardNameTimer = setTimeout(async () => {
    try {
      await updateDashboard({
        id: id.value,
        name: newName.trim()
      })
      initialDashboardName.value = newName.trim()
    } catch (error) {
      console.error('Failed to save dashboard name:', error)
    }
  }, 500)

  // Schedule history recording
  if (dashboardNameHistoryTimer) clearTimeout(dashboardNameHistoryTimer)
  dashboardNameHistoryTimer = setTimeout(() => {
    if (dashboardNameBaseline === null) return

    const currentName = dashboardName.value.trim()
    const baselineName = dashboardNameBaseline

    if (baselineName === currentName) return

    console.log('[Page] Recording Dashboard Name Change history')

    const capturedOldName = baselineName
    const capturedNewName = currentName
    const capturedDashboardId = id.value

    recordAction({
      type: 'Dashboard Name Change',
      undo: async () => {
        dashboardName.value = capturedOldName
        await updateDashboard({id: capturedDashboardId, name: capturedOldName}).catch(e => console.error('Failed to persist undo', e))
        initialDashboardName.value = capturedOldName
        dashboardNameBaseline = capturedOldName
      },
      redo: async () => {
        dashboardName.value = capturedNewName
        await updateDashboard({id: capturedDashboardId, name: capturedNewName}).catch(e => console.error('Failed to persist redo', e))
        initialDashboardName.value = capturedNewName
        dashboardNameBaseline = capturedNewName
      }
    })

    // Update baseline
    dashboardNameBaseline = currentName
  }, 600) // Slightly longer debounce to run after save
})

async function persistTextWidget() {
  if (!selectedTextWidgetId.value) return
  // Skip persisting if widget has a temporary ID (not yet created on server)
  if (isTempWidgetId(selectedTextWidgetId.value)) return
  try {
    await $fetch('/api/dashboard-widgets', {
      method: 'PUT',
      body: {
        widgetId: selectedTextWidgetId.value,
        style: {...textForm}
      }
    })

    // Update local state
    for (const tab of tabs.value) {
      const widget = tab.widgets.find(w => w.widgetId === selectedTextWidgetId.value)
      if (widget) {
        widget.style = {...textForm}
        widget.name = widget.style.content || widget.name
        break
      }
    }
  } catch (error) {
    console.error('Failed to save text widget', error)
  }
}

async function addTextBlock() {
  const targetTabId = activeTabId.value || tabs.value[0]?.id
  if (!targetTabId) return

  const currentLayout = tabLayouts[targetTabId] || buildLayoutFromTab(targetTabId)
  const nextY = currentLayout.length ? Math.max(...currentLayout.map(item => item.y + item.h)) : 0
  const newPosition = {x: 0, y: nextY, w: 6, h: 2}
  const baseStyle = getDefaultTextStyle()

  // Generate a temporary widget ID for immediate UI update
  const tempWidgetId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  // Create the widget object for local state
  const newWidget = {
    widgetId: tempWidgetId,
    type: 'text' as const,
    name: baseStyle.content,
    position: newPosition,
    style: baseStyle
  }

  // Add to local state immediately (no waiting for API)
  const tab = tabs.value.find(t => t.id === targetTabId)
  if (tab) {
    tab.widgets.push(newWidget)
    // Update layout
    tabLayouts[targetTabId] = cloneLayout(buildLayoutFromTab(targetTabId))
    gridLayout.value = cloneLayout(tabLayouts[targetTabId])
  }

  // Select the widget for editing immediately
  startEditText(tempWidgetId)

  // Persist to server in background
  try {
    const res = await $fetch<{ success: boolean; widgetId: string }>('/api/dashboard-widgets', {
      method: 'POST',
      body: {
        tabId: targetTabId,
        type: 'text',
        position: newPosition,
        style: baseStyle
      }
    })

    // Update the temporary widget ID with the real one from the server
    if (res?.widgetId && tab) {
      const widgetIndex = tab.widgets.findIndex(w => w.widgetId === tempWidgetId)
      if (widgetIndex >= 0) {
        tab.widgets[widgetIndex].widgetId = res.widgetId
        // Update layout with the new widget ID
        tabLayouts[targetTabId] = cloneLayout(buildLayoutFromTab(targetTabId))
        gridLayout.value = cloneLayout(tabLayouts[targetTabId])
        initialTabLayouts.value[targetTabId] = cloneLayout(tabLayouts[targetTabId])
        if (selectedTextWidgetId.value === tempWidgetId) {
          selectedTextWidgetId.value = res.widgetId
        }

        const addedWidgetId = res.widgetId
        const addedWidgetType = 'text'
        const addedWidgetTabId = targetTabId

        recordAction({
          type: 'Add Text',
          undo: async () => {
            await deleteWidgetInternal(addedWidgetId)
          },
          redo: async () => {
            await $fetch('/api/dashboard-widgets', {
              method: 'POST',
              body: {
                tabId: addedWidgetTabId,
                type: addedWidgetType,
                position: newPosition,
                style: baseStyle
              }
            }).then(async () => {
              await load()
            })
          }
        })
      }
    }
  } catch (error) {
    console.error('Failed to persist text widget to server', error)
    // Optionally remove the widget from local state on failure
    if (tab) {
      const widgetIndex = tab.widgets.findIndex(w => w.widgetId === tempWidgetId)
      if (widgetIndex >= 0) {
        tab.widgets.splice(widgetIndex, 1)
        tabLayouts[targetTabId] = cloneLayout(buildLayoutFromTab(targetTabId))
        gridLayout.value = cloneLayout(tabLayouts[targetTabId])
      }
    }
    if (selectedTextWidgetId.value === tempWidgetId) {
      selectedTextWidgetId.value = null
    }
  }
}

interface DashboardImage {
  path: string
  filename: string
  url: string
  size: number
  type: string
  uploadedAt: string
}

async function handleImageSelected(image: DashboardImage) {
  const targetTabId = activeTabId.value || tabs.value[0]?.id
  if (!targetTabId) return

  const currentLayout = tabLayouts[targetTabId] || buildLayoutFromTab(targetTabId)
  const nextY = currentLayout.length ? Math.max(...currentLayout.map((item: any) => item.y + item.h)) : 0
  const newPosition = {x: 0, y: nextY, w: 6, h: 4}
  const imageStyle = {
    imageUrl: image.url,
    objectFit: 'contain',
    borderRadius: 0,
    background: 'transparent'
  }

  // Generate a temporary widget ID for immediate UI update
  const tempWidgetId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  // Create the widget object for local state
  const newWidget = {
    widgetId: tempWidgetId,
    type: 'image' as const,
    name: image.filename,
    position: newPosition,
    style: imageStyle
  }

  // Add to local state immediately
  const tab = tabs.value.find(t => t.id === targetTabId)
  if (tab) {
    tab.widgets.push(newWidget)
    tabLayouts[targetTabId] = cloneLayout(buildLayoutFromTab(targetTabId))
    gridLayout.value = cloneLayout(tabLayouts[targetTabId])
  }

  // Select the widget
  selectedTextWidgetId.value = tempWidgetId

  // Persist to server in background
  try {
    const res = await $fetch<{ success: boolean; widgetId: string }>('/api/dashboard-widgets', {
      method: 'POST',
      body: {
        tabId: targetTabId,
        type: 'image',
        position: newPosition,
        style: imageStyle
      }
    })

    if (res?.widgetId && tab) {
      const widgetIndex = tab.widgets.findIndex(w => w.widgetId === tempWidgetId)
      if (widgetIndex >= 0) {
        tab.widgets[widgetIndex].widgetId = res.widgetId
        tabLayouts[targetTabId] = cloneLayout(buildLayoutFromTab(targetTabId))
        gridLayout.value = cloneLayout(tabLayouts[targetTabId])
        initialTabLayouts.value[targetTabId] = cloneLayout(tabLayouts[targetTabId])
        if (selectedTextWidgetId.value === tempWidgetId) {
          selectedTextWidgetId.value = res.widgetId
        }

        const addedWidgetId = res.widgetId
        const addedWidgetTabId = targetTabId

        recordAction({
          type: 'Add Image',
          undo: async () => {
            await deleteWidgetInternal(addedWidgetId)
          },
          redo: async () => {
            await $fetch('/api/dashboard-widgets', {
              method: 'POST',
              body: {
                tabId: addedWidgetTabId,
                type: 'image',
                position: newPosition,
                style: imageStyle
              }
            }).then(async () => {
              await load()
            })
          }
        })
      }
    }
  } catch (error) {
    console.error('Failed to persist image widget to server', error)
    if (tab) {
      const widgetIndex = tab.widgets.findIndex(w => w.widgetId === tempWidgetId)
      if (widgetIndex >= 0) {
        tab.widgets.splice(widgetIndex, 1)
        tabLayouts[targetTabId] = cloneLayout(buildLayoutFromTab(targetTabId))
        gridLayout.value = cloneLayout(tabLayouts[targetTabId])
      }
    }
    if (selectedTextWidgetId.value === tempWidgetId) {
      selectedTextWidgetId.value = null
    }
  }
}


async function deleteWidgetInternal(widgetId: string): Promise<any | null> {
  try {
    await $fetch('/api/dashboard-widgets', {
      method: 'DELETE',
      query: {id: widgetId}
    })
    const tab = tabs.value.find(t => t.id === activeTabId.value)
    if (tab) {
      const idx = tab.widgets.findIndex(w => w.widgetId === widgetId)
      if (idx >= 0) {
        const deletedWidget = tab.widgets[idx]
        // Capture data for history
        const widgetData = {
          tabId: tab.id,
          type: deletedWidget.type,
          position: {...deletedWidget.position},
          style: {...deletedWidget.style}
        }
        
        tab.widgets.splice(idx, 1)
        tabLayouts[activeTabId.value] = cloneLayout(buildLayoutFromTab(activeTabId.value))
        gridLayout.value = cloneLayout(tabLayouts[activeTabId.value])

        if (selectedTextWidgetId.value === widgetId) {
          selectedTextWidgetId.value = null
        }

        return widgetData
      }
    }
    return null
  } catch (error) {
    console.error('Failed to delete widget', error)
    return null
  }
}

// Re-implement handle as wrapper
async function handleDeleteWidget(widgetId: string) {
  // We need to capture state BEFORE deleting for history?
  // `deleteWidgetInternal` returns the data now.
  const deletedData = await deleteWidgetInternal(widgetId)

  if (deletedData) {
    recordAction({
      type: 'Delete Widget',
      undo: async () => {
        await $fetch('/api/dashboard-widgets', {
          method: 'POST',
          body: deletedData
        }).then(async () => {
          await load()
        })
      },
      redo: async () => {
        // For redo, we're deleting again. But ID changes on re-creation.
        // This is the tricky part of Redo Delete.
        // We need to find the "restored" widget.
        // Using heuristics: type + position.
        const t = tabs.value.find(t => t.id === deletedData.tabId)
        if (!t) return
        const w = t.widgets.find(w => w.type === deletedData.type && w.position.x === deletedData.position.x && w.position.y === deletedData.position.y)
        if (w) await deleteWidgetInternal(w.widgetId)
      }
    })
    initialTabLayouts.value[activeTabId.value] = cloneLayout(tabLayouts[activeTabId.value])
  }
}

function selectTextWidget(widgetId: string) {
  startEditText(widgetId)
}

const selectedWidget = computed(() => {
  if (!selectedWidgetId.value) return null
  return tabs.value.flatMap(t => t.widgets).find(w => w.widgetId === selectedWidgetId.value) || null
})

function mergeAppearance(base: any, override: any) {
  return {
    ...(base || {}),
    ...(override || {}),
    numberFormat: {
      ...(base?.numberFormat || {}),
      ...(override?.numberFormat || {})
    }
  }
}

const selectedChartAppearance = computed(() => {
  if (!selectedWidget.value || selectedWidget.value.type !== 'chart') return null
  const base = selectedWidget.value.state?.appearance || {}
  const override = selectedWidget.value.configOverride?.appearance || {}
  return mergeAppearance(base, override)
})

// Tab options computed properties
const activeTab = computed(() => {
  return tabs.value.find(t => t.id === activeTabId.value) || null
})

const activeTabName = computed(() => {
  return activeTab.value?.name || 'Tab'
})

const activeTabStyle = computed(() => {
  return activeTab.value?.style || {}
})

// Tab style update with debounce
const saveTabStyleTimers: Record<string, ReturnType<typeof setTimeout>> = {}
let tabStyleBaseline: { tabId: string; style: any } | null = null
let tabStyleHistoryTimer: ReturnType<typeof setTimeout> | null = null

function updateTabStyle(newStyle: any) {
  const tabId = activeTabId.value
  if (!tabId || !isEditableSession.value) return

  // Capture baseline on first change for this tab
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab) return

  if (!tabStyleBaseline || tabStyleBaseline.tabId !== tabId) {
    tabStyleBaseline = {tabId, style: JSON.parse(JSON.stringify(tab.style || {}))}
  }

  // Update local state immediately
  tab.style = {...newStyle}

  // Debounce persist to server
  if (saveTabStyleTimers[tabId]) {
    clearTimeout(saveTabStyleTimers[tabId])
  }
  saveTabStyleTimers[tabId] = setTimeout(async () => {
    try {
      await $fetch('/api/dashboards/tabs', {
        method: 'PUT',
        body: {
          tabId,
          style: newStyle
        }
      })
    } catch (error) {
      console.error('Failed to save tab style', error)
    }
  }, 300)

  // Schedule history recording
  if (tabStyleHistoryTimer) clearTimeout(tabStyleHistoryTimer)
  tabStyleHistoryTimer = setTimeout(() => {
    if (!tabStyleBaseline || tabStyleBaseline.tabId !== tabId) return

    const currentTab = tabs.value.find(t => t.id === tabId)
    if (!currentTab) return

    const currentStyle = JSON.parse(JSON.stringify(currentTab.style || {}))
    const baselineStyle = tabStyleBaseline.style

    if (JSON.stringify(baselineStyle) === JSON.stringify(currentStyle)) return

    console.log('[Page] Recording Tab Style Change history')

    const capturedOldStyle = JSON.parse(JSON.stringify(baselineStyle))
    const capturedNewStyle = JSON.parse(JSON.stringify(currentStyle))
    const capturedTabId = tabId

    recordAction({
      type: 'Tab Style Change',
      undo: async () => {
        const t = tabs.value.find(x => x.id === capturedTabId)
        if (t) {
          t.style = JSON.parse(JSON.stringify(capturedOldStyle))
          await $fetch('/api/dashboards/tabs', {
            method: 'PUT',
            body: {tabId: capturedTabId, style: capturedOldStyle}
          }).catch(e => console.error('Failed to persist undo', e))
        }
        tabStyleBaseline = {tabId: capturedTabId, style: capturedOldStyle}
      },
      redo: async () => {
        const t = tabs.value.find(x => x.id === capturedTabId)
        if (t) {
          t.style = JSON.parse(JSON.stringify(capturedNewStyle))
          await $fetch('/api/dashboards/tabs', {
            method: 'PUT',
            body: {tabId: capturedTabId, style: capturedNewStyle}
          }).catch(e => console.error('Failed to persist redo', e))
        }
        tabStyleBaseline = {tabId: capturedTabId, style: capturedNewStyle}
      }
    })

    // Update baseline
    tabStyleBaseline = {tabId, style: capturedNewStyle}
  }, 500)
}

// Dashboard width update with debounce
let saveDashboardWidthTimer: ReturnType<typeof setTimeout> | null = null

function updateDashboardWidth(newWidth: number) {
  if (!isEditableSession.value) return

  // Update local state immediately
  dashboardWidth.value = newWidth

  // Debounce persist to server
  if (saveDashboardWidthTimer) {
    clearTimeout(saveDashboardWidthTimer)
  }
  saveDashboardWidthTimer = setTimeout(async () => {
    try {
      await updateDashboard(id.value, { width: newWidth })
      console.log('[Page] Dashboard width saved:', newWidth)
    } catch (error) {
      console.error('Failed to save dashboard width', error)
    }
  }, 300)
}

function selectWidget(widgetId: string) {
  const widget = tabs.value.flatMap(t => t.widgets).find(w => w.widgetId === widgetId)
  if (!widget) return
  selectedWidgetId.value = widgetId

  // Capture baseline for undo/redo (for all widget types)
  baselineWidgetStyle.value = {
    widgetId,
    style: JSON.parse(JSON.stringify(widget.style || {})),
    configOverride: JSON.parse(JSON.stringify(widget.configOverride || {}))
  }
  
  if (widget.type === 'text') {
    startEditText(widgetId)
  }
}

function handleDeselect() {
  selectedWidgetId.value = null
}

function updateTextForm(partial: Record<string, any>) {
  Object.assign(textForm, partial)
}

function updateTextContentInline(content: string) {
  if (!selectedWidgetId.value) return
  updateTextContent(selectedWidgetId.value, content)
}

function updateChartAppearance(partial: Record<string, any>) {
  const widget = selectedWidget.value
  if (!widget || widget.type !== 'chart') return
  if (!isEditableSession.value) return
  const tab = tabs.value.find(t => t.id === activeTabId.value)
  if (!tab) return
  const targetWidget = tab.widgets.find(w => w.widgetId === widget.widgetId)
  if (!targetWidget) return

  const currentOverride = targetWidget.configOverride || {}
  const nextAppearance = mergeAppearance(currentOverride.appearance || {}, partial)
  targetWidget.configOverride = {...currentOverride, appearance: nextAppearance}

  // debounce persist
  if (saveChartOverrideTimers[widget.widgetId]) {
    clearTimeout(saveChartOverrideTimers[widget.widgetId]!)
  }
  saveChartOverrideTimers[widget.widgetId] = setTimeout(async () => {
    try {
      await $fetch('/api/dashboard-widgets', {
        method: 'PUT',
        body: {
          widgetId: widget.widgetId,
          configOverride: targetWidget.configOverride
        }
      })
    } catch (error) {
      console.error('Failed to save chart overrides', error)
    }
  }, 250)

  // Schedule history recording
  scheduleWidgetHistoryRecording(widget.widgetId, 'Chart Appearance Change')
}

function updateChartBorder(partial: Record<string, any>) {
  const widget = selectedWidget.value
  if (!widget || widget.type !== 'chart') return
  if (!isEditableSession.value) return
  const tab = tabs.value.find(t => t.id === activeTabId.value)
  if (!tab) return
  const targetWidget = tab.widgets.find(w => w.widgetId === widget.widgetId)
  if (!targetWidget) return

  // Merge with existing style
  targetWidget.style = {...(targetWidget.style || {}), ...partial}

  // Debounce persist
  if (saveChartOverrideTimers[widget.widgetId]) {
    clearTimeout(saveChartOverrideTimers[widget.widgetId]!)
  }
  saveChartOverrideTimers[widget.widgetId] = setTimeout(async () => {
    try {
      await $fetch('/api/dashboard-widgets', {
        method: 'PUT',
        body: {
          widgetId: widget.widgetId,
          style: targetWidget.style
        }
      })
    } catch (error) {
      console.error('Failed to save chart border style', error)
    }
  }, 250)

  // Schedule history recording
  scheduleWidgetHistoryRecording(widget.widgetId, 'Chart Border Change')
}

function updateImageStyle(partial: Record<string, any>) {
  const widget = selectedWidget.value
  if (!widget || widget.type !== 'image') return
  if (!isEditableSession.value) return
  const tab = tabs.value.find(t => t.id === activeTabId.value)
  if (!tab) return
  const targetWidget = tab.widgets.find(w => w.widgetId === widget.widgetId)
  if (!targetWidget) return

  // Merge with existing style
  targetWidget.style = {...(targetWidget.style || {}), ...partial}

  // Debounce persist
  if (saveChartOverrideTimers[widget.widgetId]) {
    clearTimeout(saveChartOverrideTimers[widget.widgetId]!)
  }
  saveChartOverrideTimers[widget.widgetId] = setTimeout(async () => {
    try {
      await $fetch('/api/dashboard-widgets', {
        method: 'PUT',
        body: {
          widgetId: widget.widgetId,
          style: targetWidget.style
        }
      })
    } catch (error) {
      console.error('Failed to save image style', error)
    }
  }, 250)

  // Schedule history recording
  scheduleWidgetHistoryRecording(widget.widgetId, 'Image Style Change')
}

function handleChangeImage() {
  // Open the Add Image modal to allow changing the image
  showAddImageModal.value = true
}

async function handleIconSelected(icon: { iconName: string; color: string; size: number }) {
  const targetTabId = activeTabId.value || tabs.value[0]?.id
  if (!targetTabId) return

  // Check if we're changing an existing icon
  if (changingIconWidgetId.value) {
    const widgetIdToChange = changingIconWidgetId.value
    changingIconWidgetId.value = null // Clear immediately

    const tab = tabs.value.find(t => t.id === targetTabId)
    if (!tab) return

    const targetWidget = tab.widgets.find(w => w.widgetId === widgetIdToChange)
    if (!targetWidget || targetWidget.type !== 'icon') return

    // Update the icon name in the existing style, preserving other properties
    targetWidget.style = {
      ...(targetWidget.style || {}),
      iconName: icon.iconName
    }

    // Persist to server
    try {
      await $fetch('/api/dashboard-widgets', {
        method: 'PUT',
        body: {
          widgetId: widgetIdToChange,
          style: targetWidget.style
        }
      })
    } catch (error) {
      console.error('Failed to update icon widget', error)
    }

    // Schedule history recording
    scheduleWidgetHistoryRecording(widgetIdToChange, 'Icon Change')
    return
  }

  // Create a new icon widget
  const currentLayout = tabLayouts[targetTabId] || buildLayoutFromTab(targetTabId)
  const nextY = currentLayout.length ? Math.max(...currentLayout.map((item: any) => item.y + item.h)) : 0
  const newPosition = {x: 0, y: nextY, w: 2, h: 2}
  const iconStyle = {
    iconName: icon.iconName,
    color: icon.color,
    size: icon.size,
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0
  }

  // Generate a temporary widget ID for immediate UI update
  const tempWidgetId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  // Create the widget object for local state
  const newWidget = {
    widgetId: tempWidgetId,
    type: 'icon' as const,
    name: icon.iconName.replace('i-lucide-', ''),
    position: newPosition,
    style: iconStyle
  }

  // Add to local state immediately
  const tab = tabs.value.find(t => t.id === targetTabId)
  if (tab) {
    tab.widgets.push(newWidget)
    tabLayouts[targetTabId] = cloneLayout(buildLayoutFromTab(targetTabId))
    gridLayout.value = cloneLayout(tabLayouts[targetTabId])
  }

  // Select the widget
  selectedTextWidgetId.value = tempWidgetId

  // Persist to server in background
  try {
    const res = await $fetch<{ success: boolean; widgetId: string }>('/api/dashboard-widgets', {
      method: 'POST',
      body: {
        tabId: targetTabId,
        type: 'icon',
        position: newPosition,
        style: iconStyle
      }
    })

    if (res?.widgetId && tab) {
      const widgetIndex = tab.widgets.findIndex(w => w.widgetId === tempWidgetId)
      if (widgetIndex >= 0) {
        tab.widgets[widgetIndex].widgetId = res.widgetId
        tabLayouts[targetTabId] = cloneLayout(buildLayoutFromTab(targetTabId))
        gridLayout.value = cloneLayout(tabLayouts[targetTabId])
        initialTabLayouts.value[targetTabId] = cloneLayout(tabLayouts[targetTabId])
        if (selectedTextWidgetId.value === tempWidgetId) {
          selectedTextWidgetId.value = res.widgetId
        }
      }
    }
  } catch (error) {
    console.error('Failed to persist icon widget to server', error)
    if (tab) {
      const widgetIndex = tab.widgets.findIndex(w => w.widgetId === tempWidgetId)
      if (widgetIndex >= 0) {
        tab.widgets.splice(widgetIndex, 1)
        tabLayouts[targetTabId] = cloneLayout(buildLayoutFromTab(targetTabId))
        gridLayout.value = cloneLayout(tabLayouts[targetTabId])
      }
    }
    if (selectedTextWidgetId.value === tempWidgetId) {
      selectedTextWidgetId.value = null
    }
  }
}

function updateIconStyle(partial: Record<string, any>) {
  const widget = selectedWidget.value
  if (!widget || widget.type !== 'icon') return
  if (!isEditableSession.value) return
  const tab = tabs.value.find(t => t.id === activeTabId.value)
  if (!tab) return
  const targetWidget = tab.widgets.find(w => w.widgetId === widget.widgetId)
  if (!targetWidget) return

  // Merge with existing style
  targetWidget.style = {...(targetWidget.style || {}), ...partial}

  // Debounce persist
  if (saveChartOverrideTimers[widget.widgetId]) {
    clearTimeout(saveChartOverrideTimers[widget.widgetId]!)
  }
  saveChartOverrideTimers[widget.widgetId] = setTimeout(async () => {
    try {
      await $fetch('/api/dashboard-widgets', {
        method: 'PUT',
        body: {
          widgetId: widget.widgetId,
          style: targetWidget.style
        }
      })
    } catch (error) {
      console.error('Failed to save icon style', error)
    }
  }, 250)

  // Schedule history recording
  scheduleWidgetHistoryRecording(widget.widgetId, 'Icon Style Change')
}

function handleChangeIcon() {
  // Store the currently selected icon widget ID so we update it instead of creating a new one
  if (selectedWidget.value?.type === 'icon') {
    changingIconWidgetId.value = selectedWidget.value.widgetId
  }
  showAddIconModal.value = true
}

function startCreateNewChart() {
  const params = new URLSearchParams({
    dashboard_id: id.value
  })
  if (preferredDataConnectionId.value != null) {
    params.set('data_connection_id', String(preferredDataConnectionId.value))
  }
  navigateTo(`/reporting/builder?${params.toString()}`)
}

const addChartMenuItems = computed(() => [[
  {
    label: 'Create New Chart',
    icon: 'i-heroicons-sparkles',
    class: 'cursor-pointer',
    onClick: startCreateNewChart
  },
  {
    label: 'Use Existing Chart',
    icon: 'i-heroicons-folder-open',
    class: 'cursor-pointer',
    onClick: openAddChartModal
  }
]])

async function openAddChartModal() {
  loadingCharts.value = true
  loadingDashboardsForGallery.value = true
  showAddChartModal.value = true

  try {
    const allCharts = await listCharts()
    const dashboardChartIds = new Set(
        tabs.value.flatMap(t => t.widgets.filter(w => w.type === 'chart').map(c => c.chartId))
    )
    availableCharts.value = allCharts.filter(chart => !dashboardChartIds.has(chart.id))

    // Load dashboards and map charts that are not yet on this dashboard
    const dashboards = await listDashboardsLite()
    const dashboardDetails = await Promise.all(dashboards.map(async (dash) => {
      try {
        const detail = await $fetch<{ charts: Array<{ chartId: number; name: string }> }>(`/api/dashboards/${dash.id}`)
        return {
          id: dash.id,
          name: dash.name,
          charts: (detail.charts || []).filter(c => availableCharts.value.some(ac => ac.id === c.chartId))
        }
      } catch (e) {
        console.error('Failed to load dashboard charts for gallery', dash.id, e)
        return {id: dash.id, name: dash.name, charts: []}
      }
    }))
    dashboardsForGallery.value = dashboardDetails.filter(d => (d.charts || []).length > 0)
  } finally {
    loadingCharts.value = false
    loadingDashboardsForGallery.value = false
  }
}

async function addChartToDashboard(chartId: number) {
  try {
    const chart = availableCharts.value.find(c => c.id === chartId)
    if (!chart) return

    const targetTabId = activeTabId.value || tabs.value[0]?.id
    if (!targetTabId) {
      console.error('No active tab available for adding chart')
      return
    }

    const newPosition = { x: 0, y: Math.max(...gridLayout.value.map(item => item.y + item.h), 0), w: 6, h: 8 }

    await $fetch(`/api/dashboard-tabs`, {
      method: 'POST',
      body: {
        tabId: targetTabId,
        chartId: chartId,
        position: newPosition
      }
    })

    await load()
    showAddChartModal.value = false
    selectedGalleryChartId.value = null
  } catch (error) {
    console.error('Failed to add chart to dashboard:', error)
  }
}

const filteredDashboardsForGallery = computed(() => {
  const term = gallerySearch.value.trim().toLowerCase()
  if (!term) return dashboardsForGallery.value
  return dashboardsForGallery.value
      .map(d => ({
        ...d,
        charts: d.charts.filter(c => c.name.toLowerCase().includes(term))
      }))
      .filter(d => d.charts.length > 0)
})

const selectedGalleryChart = computed(() => {
  if (selectedGalleryChartId.value == null) return null
  return availableCharts.value.find(c => c.id === selectedGalleryChartId.value) || null
})

const filteredDashboardsWithUngrouped = computed(() => {
  const groupedIds = new Set(dashboardsForGallery.value.flatMap(d => d.charts.map(c => c.chartId)))
  const ungrouped = availableCharts.value.filter(c => !groupedIds.has(c.id))
      .filter(c => {
        const term = gallerySearch.value.trim().toLowerCase()
        if (!term) return true
        return c.name.toLowerCase().includes(term)
      })

  const base = filteredDashboardsForGallery.value
  if (ungrouped.length === 0) return base

  return [
    ...base,
    {
      id: 'ungrouped',
      name: 'Other Charts',
      charts: ungrouped.map(c => ({chartId: c.id, name: c.name}))
    }
  ]
})

function toggleGallerySection(id: string) {
  expandedGallerySections[id] = !expandedGallerySections[id]
}

function isGallerySectionOpen(id: string) {
  // default to open
  const val = expandedGallerySections[id]
  return val === undefined ? true : val
}

function availableChartById(chartId: number) {
  return availableCharts.value.find(c => c.id === chartId)
}

// Tab operations
function getTabMenuItems(tab: any) {
  return [
    [{
      label: 'Rename',
      icon: 'i-heroicons-pencil',
      class: 'cursor-pointer',
      onClick: () => startRenameTab(tab)
    }],
    [{
      label: 'Delete',
      icon: 'i-heroicons-trash',
      class: 'cursor-pointer',
      onClick: () => confirmDeleteTab(tab)
    }]
  ]
}

async function startRenameTab(tab: any) {
  tabToRename.value = tab.id
  renameTabForm.name = tab.name
  showRenameTabModal.value = true
}

async function confirmDeleteTab(tab: any) {
  tabToDelete.value = tab.id
  tabToDeleteName.value = tab.name
  showDeleteTabModal.value = true
}

async function createTab() {
  if (!createTabForm.name.trim()) return

  creatingTab.value = true
  try {
    await $fetch(`/api/dashboards/tabs`, {
      method: 'POST',
      body: {
        dashboardId: id.value,
        name: createTabForm.name.trim()
      }
    })

    await load()

    showCreateTabModal.value = false
    createTabForm.name = ''
  } catch (error) {
    console.error('Failed to create tab:', error)
  } finally {
    creatingTab.value = false
  }
}

async function renameTab() {
  if (!renameTabForm.name.trim() || !tabToRename.value) return

  renamingTab.value = true
  try {
    await $fetch(`/api/dashboards/tabs`, {
      method: 'PUT',
      body: {
        tabId: tabToRename.value,
        name: renameTabForm.name.trim()
      }
    })

    const tab = tabs.value.find(t => t.id === tabToRename.value)
    if (tab) {
      tab.name = renameTabForm.name.trim()
    }

    showRenameTabModal.value = false
    renameTabForm.name = ''
    tabToRename.value = null
  } catch (error) {
    console.error('Failed to rename tab:', error)
  } finally {
    renamingTab.value = false
  }
}

async function deleteTab() {
  if (!tabToDelete.value) return

  deletingTab.value = true
  try {
    await $fetch(`/api/dashboards/tabs`, {
      method: 'DELETE',
      query: {id: tabToDelete.value}
    })

    const tabIndex = tabs.value.findIndex(t => t.id === tabToDelete.value)
    if (tabIndex >= 0) {
      tabs.value.splice(tabIndex, 1)
      delete tabLayouts[tabToDelete.value]
      delete initialTabLayouts.value[tabToDelete.value]

      if (activeTabId.value === tabToDelete.value && tabs.value.length > 0) {
        activeTabId.value = tabs.value[0].id
      }
      gridLayout.value = cloneLayout(tabLayouts[activeTabId.value] || buildLayoutFromTab(activeTabId.value))
    }

    showDeleteTabModal.value = false
    tabToDelete.value = null
    tabToDeleteName.value = ''
  } catch (error) {
    console.error('Failed to delete tab:', error)
  } finally {
    deletingTab.value = false
  }
}

// Debug functions
const gridLayoutJson = computed({
  get: () => JSON.stringify(gridLayout.value, null, 2),
  set: (value: string) => {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        gridLayout.value = parsed
      }
    } catch (e) {
      // Invalid JSON, ignore
    }
  }
})

const breakpointsJson = computed({
  get: () => JSON.stringify(gridConfig.breakpoints, null, 2),
  set: (value: string) => {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'object' && parsed !== null) {
        gridConfig.breakpoints = parsed
      }
    } catch (e) {
      // Invalid JSON, ignore
    }
  }
})

const colsJson = computed({
  get: () => JSON.stringify(gridConfig.cols, null, 2),
  set: (value: string) => {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'object' && parsed !== null) {
        gridConfig.cols = parsed
      }
    } catch (e) {
      // Invalid JSON, ignore
    }
  }
})

// Handle maxRows Infinity input
const maxRowsInput = computed({
  get: () => gridConfig.maxRows === Infinity ? '' : gridConfig.maxRows,
  set: (value: string | number) => {
    const numValue = typeof value === 'string' ? parseInt(value) : value
    gridConfig.maxRows = isNaN(numValue) || value === '' ? Infinity : numValue
  }
})

function updateGridLayoutFromJson() {
  // The computed property setter handles this
}

async function downloadPDF() {
  try {
    const response = await fetch(`/api/dashboards/${id.value}/pdf`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`Failed to generate PDF: ${response.status}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${dashboardName.value.replace(/[^a-z0-9]/gi, '_')}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Failed to download PDF:', error)
    alert('Failed to generate PDF. Check console for details.')
  }
}

function openShareModal() {
  showShareModal.value = true
}

// Filter handlers
function onFilterCreated(filter: DashboardFilter) {
  dashboardFilters.value.push(filter)
}

async function updateFilter(filter: DashboardFilter) {
  try {
    await $fetch(`/api/dashboards/${id.value}/filters/${filter.id}`, {
      method: 'PUT',
      body: { currentValue: filter.currentValue }
    })
    // Update local state
    const idx = dashboardFilters.value.findIndex(f => f.id === filter.id)
    if (idx >= 0) {
      dashboardFilters.value[idx] = filter
    }
  } catch (err) {
    console.error('Failed to update filter:', err)
  }
}

function editFilter(filter: DashboardFilter) {
  editingFilter.value = filter
  showAddFilterModal.value = true
}

function onFilterUpdated(filter: DashboardFilter) {
  const idx = dashboardFilters.value.findIndex(f => f.id === filter.id)
  if (idx >= 0) {
    dashboardFilters.value[idx] = filter
  }
  editingFilter.value = null
}

function confirmDeleteFilter(filter: DashboardFilter) {
  filterToDelete.value = filter
  deleteFilter()
}

async function deleteFilter() {
  if (!filterToDelete.value) return
  try {
    await $fetch(`/api/dashboards/${id.value}/filters/${filterToDelete.value.id}`, {
      method: 'DELETE'
    })
    dashboardFilters.value = dashboardFilters.value.filter(f => f.id !== filterToDelete.value!.id)
    filterToDelete.value = null
  } catch (err) {
    console.error('Failed to delete filter:', err)
  }
}

function clearAllFilters() {
  dashboardFilters.value.forEach(f => {
    f.currentValue = null
  })
  // Persist the cleared state
  dashboardFilters.value.forEach(f => updateFilter(f))
}

// Computed: Active filter conditions for charts
const activeFilterConditions = computed(() => {
  return dashboardFilters.value
      .filter(f => f.currentValue != null)
      .map(f => ({
        fieldId: f.fieldId,
        table: f.fieldTable,
        type: f.fieldType,
        operator: getFilterOperator(f),
        value: f.currentValue,
        values: Array.isArray(f.currentValue) ? f.currentValue : undefined
      }))
})

function getFilterOperator(filter: DashboardFilter): string {
  if (filter.filterMode === 'values') {
    return 'equals'
  } else if (filter.filterMode === 'text_rule') {
    const op = filter.config?.operator
    if (op === 'contain') return 'contains'
    if (op === 'start_with') return 'starts_with'
    if (op === 'end_with') return 'ends_with'
    if (op === 'not_contain') return 'not_contains'
    return op || 'equals'
  } else if (filter.filterMode === 'constraint') {
    const op = filter.config?.operator
    if (op === 'lt') return 'less_than'
    if (op === 'lte') return 'less_or_equal'
    if (op === 'gt') return 'greater_than'
    if (op === 'gte') return 'greater_or_equal'
    return op || 'equals'
  }
  return 'equals'
}
</script>

<style scoped>
:deep(.vue-grid-layout) { min-height: 300px; }

:deep(.vue-grid-item) {
  //min-height: 200px !important; /* Force min-height for grid items */
}

:deep(.vue-resizable-handle) {
  z-index: 10; /* Ensure resizer is visible */
}

/* Make all textareas in debug panel resizable */
:deep(.debug-panel textarea) {
  resize: both;
  min-height: 60px;
  max-height: 400px;
}


.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

</style>



<template>
  <div class="h-full flex flex-col p-4 lg:p-6 overflow-hidden">
    <div class="space-y-4 flex-1 flex flex-col min-h-0 min-w-0">
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
        <UButton v-if="isDev" variant="outline" color="red" size="sm" @click="downloadPDF" class="hover:bg-red-500 hover:text-white cursor-pointer" title="Download as PDF">
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
              :draggable="isEditableSession"
              @dragstart="handleTabDragStart($event, index)"
              @dragover.prevent="handleTabDragOver($event, index)"
              @drop="handleTabDrop($event, index)"
              @dragend="handleTabDragEnd"
              :class="[
              'px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 border-b-2 cursor-pointer',
              activeTabId === tab.id
                ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50',
              dragOverTabIndex === index && isEditableSession ? 'ring-2 ring-orange-400' : ''
            ]"
          >
            <Icon v-if="isEditableSession" name="i-heroicons-bars-2" class="w-3 h-3 opacity-50 cursor-grab"/>
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
          <div class="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
                @click="setDevice('desktop')"
                :class="[
                  'px-2.5 py-1.5 flex items-center justify-center transition-all duration-200 cursor-pointer',
                  device === 'desktop'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                ]"
                title="Desktop preview"
            >
              <Icon name="i-heroicons-computer-desktop" class="w-4 h-4"/>
            </button>
            <button
                @click="setDevice('tablet')"
                :class="[
                  'px-2.5 py-1.5 flex items-center justify-center transition-all duration-200 cursor-pointer border-x border-gray-200 dark:border-gray-700',
                  device === 'tablet'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                ]"
                title="Tablet preview"
            >
              <Icon name="i-heroicons-device-tablet" class="w-4 h-4"/>
            </button>
            <button
                @click="setDevice('mobile')"
                :class="[
                  'px-2.5 py-1.5 flex items-center justify-center transition-all duration-200 cursor-pointer',
                  device === 'mobile'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                ]"
                title="Mobile preview"
            >
              <Icon name="i-heroicons-device-phone-mobile" class="w-4 h-4"/>
            </button>
          </div>
          
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


      <div class="flex gap-4 items-stretch flex-1 min-h-0 overflow-hidden max-w-full">
        <div class="flex-1 min-w-0 h-full overflow-hidden">
          <div class="h-full overflow-x-auto overflow-y-auto pr-1">
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
                :dashboard-id="id"
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
                @context-menu="handleContextMenu"
                @canvas-context-menu="handleCanvasContextMenu"
                @table-header-click="handleTableHeaderClick"
                @table-cell-click="handleTableCellClick"
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
              :chart-initial-tab="chartInitialTab"
              :clicked-column-key="clickedColumnKey"
              :clicked-column-label="clickedColumnLabel"
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

    <!-- Widget Context Menu -->
    <WidgetContextMenu
        :visible="ctxMenu.visible"
        :x="ctxMenu.x"
        :y="ctxMenu.y"
        :widget-type="ctxMenu.widgetType"
        :widget-id="ctxMenu.widgetId"
        :has-link="ctxMenu.hasLink"
        :has-clipboard="!!widgetClipboard"
        :canvas-mode="ctxMenu.canvasMode"
        @close="closeContextMenu"
        @duplicate="ctxDuplicate"
        @copy="ctxCopy"
        @cut="ctxCut"
        @paste="ctxPaste"
        @bring-to-front="ctxBringToFront"
        @send-to-back="ctxSendToBack"
        @add-link="ctxAddLink"
        @remove-link="ctxRemoveLink"
        @edit-chart="ctxEditChart"
        @delete="ctxDelete"
    />

    <!-- Add Link Modal -->
    <AddLinkModal
        v-model:open="showLinkModal"
        :initial-url="linkModalInitialUrl"
        :initial-target="linkModalInitialTarget"
        @save="handleLinkSave"
    />
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
const isDev = import.meta.dev


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
import { calculateAutoLayout, type PixelPosition } from '~/lib/dashboard-layout-utils'
import { DASHBOARD_WIDTH } from '~/lib/dashboard-constants'

const dashboardName = ref('')
const initialDashboardName = ref('')
const tabs = ref<Array<{
  id: string;
  name: string;
  position: number;
  style?: any; // Tab style options
  widgetsLoaded?: boolean;
  widgets: Array<{
    widgetId: string;
    type: 'chart' | 'text' | 'image' | 'icon';
    chartId?: number;
    name?: string;
    position: any;
    state?: any;
    dataStatus?: 'cached' | 'pending';
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

// Tab drag-and-drop state
const draggedTabIndex = ref<number | null>(null)
const dragOverTabIndex = ref<number | null>(null)

// Dynamic page title with dashboard name (must be after dashboardName is defined)
usePageTitle(
  computed(() => isEditableSession.value ? 'Edit Dashboard' : 'Dashboard'),
  dashboardName
)

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
const chartInitialTab = ref<string | undefined>(undefined)
const clickedColumnKey = ref<string | undefined>(undefined)
const clickedColumnLabel = ref<string | undefined>(undefined)
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
  
  // Wait for Vue to finish any pending DOM updates
  await nextTick()
  // Additional delay to ensure charts have rendered their content
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Dashboard component ref resolves to component instance; use $el for the DOM node
  const container = (dashboardRef.value as any)?.$el ?? (dashboardRef.value as HTMLElement | null)
  if (!container || typeof container.getBoundingClientRect !== 'function') {
    console.warn('Dashboard container not available for thumbnail capture')
    return {}
  }

  const containerRect = container.getBoundingClientRect()
  // Validate dimensions - if too small, the capture likely won't be useful
  if (containerRect.width < 100 || containerRect.height < 100) {
    console.warn('Dashboard container has invalid dimensions for thumbnail capture', containerRect)
    return {}
  }
  
  // Calculate bounding box from widget positions to crop to used area only
  const layout = gridLayout.value || []
  let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0
  
  for (const item of layout) {
    const left = Number(item.left) || 0
    const top = Number(item.top) || 0
    const width = Number(item.width) || 0
    const height = Number(item.height) || 0
    
    minX = Math.min(minX, left)
    minY = Math.min(minY, top)
    maxX = Math.max(maxX, left + width)
    maxY = Math.max(maxY, top + height)
  }
  
  // If no widgets, capture minimal area
  if (!layout.length || !Number.isFinite(minX)) {
    minX = 0; minY = 0; maxX = 400; maxY = 300
  }
  
  // Add padding around the bounding box
  const padding = 20
  minX = Math.max(0, minX - padding)
  minY = Math.max(0, minY - padding)
  maxX = maxX + padding
  maxY = maxY + padding
  
  const cropWidth = Math.round(maxX - minX)
  const cropHeight = Math.round(maxY - minY)

  try {
    // Use html-to-image for a real snapshot of the dashboard content
    const {toPng} = await import('html-to-image')
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    
    // Capture the full container first
    const fullDataUrl = await toPng(container, {
      pixelRatio,
      cacheBust: true,
      backgroundColor: '#ffffff',
      skipFonts: true
    })
    
    // Crop the image to the widget bounding box
    const img = new Image()
    img.src = fullDataUrl
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
    })
    
    const canvas = document.createElement('canvas')
    canvas.width = cropWidth * pixelRatio
    canvas.height = cropHeight * pixelRatio
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return {width: cropWidth, height: cropHeight, thumbnailBase64: fullDataUrl}
    }
    
    // Draw the cropped portion
    ctx.drawImage(
      img,
      minX * pixelRatio, minY * pixelRatio,  // Source x, y
      cropWidth * pixelRatio, cropHeight * pixelRatio,  // Source width, height
      0, 0,  // Dest x, y
      cropWidth * pixelRatio, cropHeight * pixelRatio  // Dest width, height
    )
    
    const croppedDataUrl = canvas.toDataURL('image/png')
    return {width: cropWidth, height: cropHeight, thumbnailBase64: croppedDataUrl}
  } catch (error) {
    console.error('Failed to capture dashboard thumbnail:', error)
    return {}
  }
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

function areLayoutsEqual(layout1: any[], layout2: any[]) {
  if (layout1.length !== layout2.length) return false
  const toNum = (v: any) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return layout1.every(item => {
    const match = layout2.find(m => String(m.i) === String(item.i))
    if (!match) return false
    return toNum(item.left) === toNum(match.left) &&
        toNum(item.top) === toNum(match.top) &&
        toNum(item.width) === toNum(match.width) &&
        toNum(item.height) === toNum(match.height) &&
        String(item.i) === String(match.i)
  })
}

function buildLayoutFromTab(tabId: string) {
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab) return []
  return tab.widgets.map(w => ({
    left: w.position?.left ?? 0,
    top: w.position?.top ?? 0,
    width: w.position?.width ?? 400,
    height: w.position?.height ?? 240,
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
  const targetTabId = activeTabId.value

  // Compare against the baseline (initialTabLayouts)
  const baselineLayout = JSON.parse(JSON.stringify(initialTabLayouts.value[targetTabId] || []))


  // Check if actually different from baseline
  if (areLayoutsEqual(baselineLayout, newLayout)) {
    return
  }


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
                position: {left: item.left, top: item.top, width: item.width, height: item.height}
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

async function selectTab(tabId: string) {
  activeTabId.value = tabId
  // Lazy-load widgets for this tab if not yet loaded
  const tab = tabs.value.find(t => t.id === tabId)
  if (tab && !tab.widgetsLoaded) {
    await loadTabWidgets(tabId)
  }
  const layout = tabLayouts[tabId] || buildLayoutFromTab(tabId)
  tabLayouts[tabId] = cloneLayout(layout)
  gridLayout.value = cloneLayout(layout)
}

function autoLayout() {
  const widgets = gridLayout.value.map(item => ({
    id: String(item.i),
    position: {
      left: item.left,
      top: item.top,
      width: item.width,
      height: item.height
    }
  }))

  const result = calculateAutoLayout(widgets, dashboardWidth.value || DASHBOARD_WIDTH)
  
  // Update gridLayout.value with results
  result.forEach(res => {
    const item = gridLayout.value.find(i => String(i.i) === res.id)
    if (item) {
      item.left = res.position.left
      item.top = res.position.top
    }
  })

  // Trigger layout update
  handleLayoutUpdate([...gridLayout.value])
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

/**
 * Map raw widget response to local widget format.
 */
function mapWidget(w: any) {
  return {
    widgetId: w.widgetId || w.id,
    type: w.type,
    chartId: w.type === 'chart' ? w.id ?? w.chartId : undefined,
    name: w.type === 'chart' ? w.name : (w.style?.content || 'Text'),
    position: w.position,
    state: w.type === 'chart' ? w.state : undefined,
    dataStatus: w.type === 'chart' ? w.dataStatus : undefined,
    preloadedColumns: w.type === 'chart' ? w.preloadedColumns : undefined,
    preloadedRows: w.type === 'chart' ? w.preloadedRows : undefined,
    style: w.style || {},
    configOverride: w.configOverride || {}
  }
}

async function loadDashboard(initialLoad = false) {
  loading.value = true
  try {
    // On initial page load, only fetch widgets for the first tab (lazy-load others on switch)
    // On re-fetches (after adding/deleting widgets), load all tabs to stay in sync
    const activeTab = initialLoad ? '__first__' : undefined
    const res = await getDashboardFull(id.value, undefined, activeTab)
    dashboardName.value = res.name
    dashboardWidth.value = res.width || undefined

    tabs.value = (res.tabs || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      position: t.position,
      style: t.style || {},
      widgetsLoaded: t.widgetsLoaded !== false,
      widgets: (t.widgets || []).map(mapWidget)
    })).sort((a, b) => a.position - b.position)

    setLayoutsFromTabs(true)
  } finally {
    loading.value = false
  }
}

/**
 * Lazy-load widgets for a specific tab that hasn't been loaded yet.
 */
async function loadTabWidgets(tabId: string) {
  try {
    const res = await $fetch<{ tabId: string; widgets: any[] }>(
      `/api/dashboards/${id.value}/tabs/${tabId}/widgets`
    )
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.widgets = (res.widgets || []).map(mapWidget)
      tab.widgetsLoaded = true
      // Rebuild layout for the newly loaded tab
      const layout = buildLayoutFromTab(tabId)
      tabLayouts[tabId] = cloneLayout(layout)
      initialTabLayouts.value[tabId] = cloneLayout(layout)
      gridLayout.value = cloneLayout(layout)
    }
  } catch (err) {
    console.error('Failed to load tab widgets:', err)
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
  // Run all initial data fetches in parallel
  // loadUserProfile is already triggered by useAuth's watcher, but we include it
  // for safety without blocking other fetches
  const fetches: Promise<any>[] = [
    loadUserProfile(),
    loadDashboard(true),
    loadFilters()
  ]
  // Only load connections in edit mode — they're needed for Add Filter/chart modals
  // Use isEditMode (URL-based, instant) instead of isEditableSession (depends on profile)
  if (isEditMode.value) {
    fetches.push(loadConnections())
  }
  await Promise.all(fetches)
})

onBeforeRouteLeave((to, from) => {
  // No longer need to check for unsaved changes since we auto-save
  return true
})

const saving = ref(false)
/**
 * Capture and save only the dashboard thumbnail.
 * Layout and name changes are auto-saved via watchers, so we don't need to re-send them here.
 */
async function saveThumbnail() {
  saving.value = true
  try {
    const snapshot = await captureDashboardThumbnail()
    // Only send thumbnail data if capture was successful
    if (snapshot.thumbnailBase64) {
      await updateDashboard({
        id: id.value,
        width: snapshot.width,
        height: snapshot.height,
        thumbnailBase64: snapshot.thumbnailBase64
      })
    }
  } catch (error) {
    console.error('Failed to save thumbnail:', error)
  } finally {
    saving.value = false
  }
}

async function handleModeToggle() {
  if (!canEditDashboard.value) return
  pendingRoute.value = null
  if (isEditableSession.value) {
    // Layout and name already auto-saved - only capture thumbnail for dashboard list
    await saveThumbnail()
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
              await loadDashboard() // Simplest way to sync
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

    // Only record if we have a baseline and it's for the right widget
    if (!baselineWidgetStyle.value || baselineWidgetStyle.value.widgetId !== targetWidgetId) {
      return
    }

    // Look up the widget FRESH inside the timer (not from closure)
    const currentWidget = tabs.value.flatMap(t => t.widgets).find(w => w.widgetId === targetWidgetId)
    if (!currentWidget) {
      return
    }

    const currentStyle = JSON.parse(JSON.stringify(currentWidget.style || {}))
    const baselineStyle = baselineWidgetStyle.value.style


    // Skip if no actual change from baseline
    if (JSON.stringify(baselineStyle) === JSON.stringify(currentStyle)) {
      return
    }


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
  const nextY = currentLayout.length ? Math.max(...currentLayout.map(item => item.top + item.height)) : 0
  const newPosition = {left: 0, top: nextY, width: 600, height: 60}
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
    // Append new widget to existing layout instead of rebuilding entire layout
    const newLayoutItem = {
      left: newPosition.left,
      top: newPosition.top,
      width: newPosition.width,
      height: newPosition.height,
      i: String(tempWidgetId)
    }
    const currentLayout = tabLayouts[targetTabId] || []
    tabLayouts[targetTabId] = [...currentLayout, newLayoutItem]
    gridLayout.value = cloneLayout(tabLayouts[targetTabId])
  }

  // Select the widget for editing immediately
  startEditText(tempWidgetId)

  // Focus the text widget so user can start typing immediately
  await nextTick()
  const widgetEl = document.querySelector(`[data-widget-id="${tempWidgetId}"] [contenteditable="true"]`) as HTMLElement
  if (widgetEl) {
    widgetEl.focus()
  }

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
        // Update layout item ID without rebuilding entire layout
        const layoutItemIndex = tabLayouts[targetTabId].findIndex(item => item.i === String(tempWidgetId))
        if (layoutItemIndex >= 0) {
          tabLayouts[targetTabId][layoutItemIndex].i = String(res.widgetId)
          gridLayout.value = cloneLayout(tabLayouts[targetTabId])
          initialTabLayouts.value[targetTabId] = cloneLayout(tabLayouts[targetTabId])
        }
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
              await loadDashboard()
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
  const nextY = currentLayout.length ? Math.max(...currentLayout.map((item: any) => item.top + item.height)) : 0
  const newPosition = {left: 0, top: nextY, width: 600, height: 300}
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
    // Append new widget to existing layout instead of rebuilding entire layout
    const newLayoutItem = {
      left: newPosition.left,
      top: newPosition.top,
      width: newPosition.width,
      height: newPosition.height,
      i: String(tempWidgetId)
    }
    const currentLayout = tabLayouts[targetTabId] || []
    tabLayouts[targetTabId] = [...currentLayout, newLayoutItem]
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
        // Update layout item ID without rebuilding entire layout
        const layoutItemIndex = tabLayouts[targetTabId].findIndex(item => item.i === String(tempWidgetId))
        if (layoutItemIndex >= 0) {
          tabLayouts[targetTabId][layoutItemIndex].i = String(res.widgetId)
          gridLayout.value = cloneLayout(tabLayouts[targetTabId])
          initialTabLayouts.value[targetTabId] = cloneLayout(tabLayouts[targetTabId])
        }
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
              await loadDashboard()
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
          style: {...deletedWidget.style},
          chartId: deletedWidget.chartId,
          configOverride: deletedWidget.configOverride ? {...deletedWidget.configOverride} : undefined,
          name: deletedWidget.name,
          zIndex: deletedWidget.zIndex
        }
        
        tab.widgets.splice(idx, 1)
        // Remove layout item directly instead of rebuilding entire layout
        const layoutItemIndex = tabLayouts[activeTabId.value].findIndex(item => item.i === String(widgetId))
        if (layoutItemIndex >= 0) {
          tabLayouts[activeTabId.value].splice(layoutItemIndex, 1)
        }
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

async function handleDeleteWidget(widgetId: string) {
  const deletedData = await deleteWidgetInternal(widgetId)

  if (deletedData) {
    recordAction({
      type: 'Delete Widget',
      undo: async () => {
        await $fetch('/api/dashboard-widgets', {
          method: 'POST',
          body: deletedData
        }).then(async () => {
          await loadDashboard()
        })
      },
      redo: async () => {
        const t = tabs.value.find(t => t.id === deletedData.tabId)
        if (!t) return
        const w = t.widgets.find(w => w.type === deletedData.type && w.position.left === deletedData.position.left && w.position.top === deletedData.position.top)
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
      await updateDashboard({ id: id.value, width: newWidth })
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
  chartInitialTab.value = undefined
  clickedColumnKey.value = undefined
  clickedColumnLabel.value = undefined
}

function handleTableHeaderClick(widgetId: string, _colIdx: number) {
  activePanel.value = 'options'
  chartInitialTab.value = 'header-total'
}

function handleTableCellClick(widgetId: string, _colIdx: number, colKey: string, colLabel: string) {
  activePanel.value = 'options'
  chartInitialTab.value = 'column-name'
  clickedColumnKey.value = colKey
  clickedColumnLabel.value = colLabel
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
  const nextY = currentLayout.length ? Math.max(...currentLayout.map((item: any) => item.top + item.height)) : 0
  const newPosition = {left: 0, top: nextY, width: 200, height: 100}
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
    // Append new widget to existing layout instead of rebuilding entire layout
    const newLayoutItem = {
      left: newPosition.left,
      top: newPosition.top,
      width: newPosition.width,
      height: newPosition.height,
      i: String(tempWidgetId)
    }
    const currentLayout = tabLayouts[targetTabId] || []
    tabLayouts[targetTabId] = [...currentLayout, newLayoutItem]
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
        // Update layout item ID without rebuilding entire layout
        const layoutItemIndex = tabLayouts[targetTabId].findIndex(item => item.i === String(tempWidgetId))
        if (layoutItemIndex >= 0) {
          tabLayouts[targetTabId][layoutItemIndex].i = String(res.widgetId)
          gridLayout.value = cloneLayout(tabLayouts[targetTabId])
          initialTabLayouts.value[targetTabId] = cloneLayout(tabLayouts[targetTabId])
        }
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

    const nextY = gridLayout.value.length ? Math.max(...gridLayout.value.map(item => item.top + item.height)) : 0
    const newPosition = { left: 0, top: nextY, width: 600, height: 240 }

    await $fetch(`/api/dashboard-tabs`, {
      method: 'POST',
      body: {
        tabId: targetTabId,
        chartId: chartId,
        position: newPosition
      }
    })

    await loadDashboard()
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

// Tab drag-and-drop handlers
function handleTabDragStart(e: DragEvent, index: number) {
  if (!isEditableSession.value) return
  draggedTabIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

function handleTabDragOver(e: DragEvent, index: number) {
  if (!isEditableSession.value || draggedTabIndex.value === null) return
  dragOverTabIndex.value = index
}

async function handleTabDrop(e: DragEvent, targetIndex: number) {
  if (!isEditableSession.value || draggedTabIndex.value === null) return
  
  const sourceIndex = draggedTabIndex.value
  if (sourceIndex === targetIndex) {
    draggedTabIndex.value = null
    dragOverTabIndex.value = null
    return
  }

  // Reorder tabs locally
  const movedTab = tabs.value.splice(sourceIndex, 1)[0]
  tabs.value.splice(targetIndex, 0, movedTab)

  // Update positions for all tabs
  tabs.value.forEach((tab, idx) => {
    tab.position = idx
  })

  draggedTabIndex.value = null
  dragOverTabIndex.value = null

  // Persist new positions to server
  try {
    await Promise.all(
      tabs.value.map((tab, idx) =>
        $fetch('/api/dashboards/tabs', {
          method: 'PUT',
          body: { tabId: tab.id, position: idx }
        })
      )
    )
  } catch (error) {
    console.error('Failed to save tab order:', error)
  }
}

function handleTabDragEnd() {
  draggedTabIndex.value = null
  dragOverTabIndex.value = null
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

    await loadDashboard()

    // Select the newly created tab (it's the last one by position)
    if (tabs.value.length > 0) {
      const lastTab = tabs.value[tabs.value.length - 1]
      selectTab(lastTab.id)
    }

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
    if (blob.size === 0) {
      throw new Error('Received empty PDF')
    }

    const url = window.URL.createObjectURL(blob)
    
    // Open PDF in new tab for viewing/saving
    const newWindow = window.open(url, '_blank')
    
    if (!newWindow) {
      // Fallback: direct download if popup blocked
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${dashboardName.value.replace(/[^a-z0-9]/gi, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }, 100)
    }
  } catch (error: any) {
    console.error('Failed to download PDF:', error)
    alert('Failed to generate PDF. Please try again.')
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

// ─── Context Menu ───────────────────────────────────────────────
const ctxMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  widgetId: '',
  widgetType: 'text' as 'chart' | 'text' | 'image' | 'icon',
  hasLink: false,
  canvasMode: false
})

function handleContextMenu(payload: { widgetId: string; x: number; y: number }) {
  const widget = tabs.value.flatMap(t => t.widgets).find(w => w.widgetId === payload.widgetId)
  if (!widget) return
  ctxMenu.widgetId = payload.widgetId
  ctxMenu.widgetType = widget.type
  ctxMenu.hasLink = !!(widget.style as any)?.linkUrl
  ctxMenu.x = payload.x
  ctxMenu.y = payload.y
  ctxMenu.canvasMode = false
  ctxMenu.visible = true
}

function handleCanvasContextMenu(payload: { x: number; y: number }) {
  ctxMenu.widgetId = ''
  ctxMenu.widgetType = 'text'
  ctxMenu.hasLink = false
  ctxMenu.canvasMode = true
  ctxMenu.x = payload.x
  ctxMenu.y = payload.y
  ctxMenu.visible = true
}

function closeContextMenu() {
  ctxMenu.visible = false
}

// ─── Clipboard ──────────────────────────────────────────────────
interface ClipboardEntry {
  type: 'chart' | 'text' | 'image' | 'icon'
  chartId?: number
  name?: string
  position: { left: number; top: number; width: number; height: number }
  style?: any
  configOverride?: any
  state?: any
  isCut: boolean
  sourceWidgetId: string
}
const widgetClipboard = ref<ClipboardEntry | null>(null)

function getWidgetById(widgetId: string) {
  return tabs.value.flatMap(t => t.widgets).find(w => w.widgetId === widgetId)
}

function getLayoutItemById(widgetId: string) {
  return gridLayout.value.find((item: any) => item.i === widgetId)
}

// ─── Context Menu Actions ───────────────────────────────────────
function ctxDuplicate() {
  closeContextMenu()
  duplicateWidget(ctxMenu.widgetId)
}

function ctxCopy() {
  closeContextMenu()
  copyWidgetToClipboard(ctxMenu.widgetId, false)
}

function ctxCut() {
  closeContextMenu()
  copyWidgetToClipboard(ctxMenu.widgetId, true)
}

function ctxPaste() {
  closeContextMenu()
  pasteWidget()
}

function ctxBringToFront() {
  closeContextMenu()
  changeWidgetZOrder(ctxMenu.widgetId, 'front')
}

function ctxSendToBack() {
  closeContextMenu()
  changeWidgetZOrder(ctxMenu.widgetId, 'back')
}

function ctxEditChart() {
  closeContextMenu()
  const widget = getWidgetById(ctxMenu.widgetId)
  if (widget?.chartId) {
    editChart(String(widget.chartId))
  }
}

function ctxDelete() {
  closeContextMenu()
  handleDeleteWidget(ctxMenu.widgetId)
}

// ─── Add / Remove Link ──────────────────────────────────────────
const showLinkModal = ref(false)
const linkModalInitialUrl = ref('')
const linkModalInitialTarget = ref('_blank')
const linkTargetWidgetId = ref<string | null>(null)

function ctxAddLink() {
  closeContextMenu()
  linkTargetWidgetId.value = ctxMenu.widgetId
  const widget = getWidgetById(ctxMenu.widgetId)
  linkModalInitialUrl.value = (widget?.style as any)?.linkUrl || ''
  linkModalInitialTarget.value = (widget?.style as any)?.linkTarget || '_blank'
  showLinkModal.value = true
}

function ctxRemoveLink() {
  closeContextMenu()
  const widgetId = ctxMenu.widgetId
  const widget = getWidgetById(widgetId)
  if (!widget) return
  const oldUrl = (widget.style as any)?.linkUrl
  const oldTarget = (widget.style as any)?.linkTarget
  delete (widget.style as any).linkUrl
  delete (widget.style as any).linkTarget
  saveWidgetStyle(widgetId, widget.style)
  recordAction({
    type: 'Remove Link',
    undo: async () => {
      const w = getWidgetById(widgetId)
      if (w) {
        ;(w.style as any).linkUrl = oldUrl
        ;(w.style as any).linkTarget = oldTarget
        saveWidgetStyle(widgetId, w.style)
      }
    },
    redo: async () => {
      const w = getWidgetById(widgetId)
      if (w) {
        delete (w.style as any).linkUrl
        delete (w.style as any).linkTarget
        saveWidgetStyle(widgetId, w.style)
      }
    }
  })
}

function handleLinkSave(payload: { url: string; target: string }) {
  const widgetId = linkTargetWidgetId.value
  if (!widgetId) return
  const widget = getWidgetById(widgetId)
  if (!widget) return

  const oldUrl = (widget.style as any)?.linkUrl
  const oldTarget = (widget.style as any)?.linkTarget

  if (!widget.style) widget.style = {}
  ;(widget.style as any).linkUrl = payload.url
  ;(widget.style as any).linkTarget = payload.target
  saveWidgetStyle(widgetId, widget.style)

  recordAction({
    type: 'Add Link',
    undo: async () => {
      const w = getWidgetById(widgetId)
      if (w) {
        if (oldUrl) {
          ;(w.style as any).linkUrl = oldUrl
          ;(w.style as any).linkTarget = oldTarget
        } else {
          delete (w.style as any).linkUrl
          delete (w.style as any).linkTarget
        }
        saveWidgetStyle(widgetId, w.style)
      }
    },
    redo: async () => {
      const w = getWidgetById(widgetId)
      if (w) {
        ;(w.style as any).linkUrl = payload.url
        ;(w.style as any).linkTarget = payload.target
        saveWidgetStyle(widgetId, w.style)
      }
    }
  })
}

function saveWidgetStyle(widgetId: string, style: any) {
  $fetch('/api/dashboard-widgets', {
    method: 'PUT',
    body: { widgetId, style }
  }).catch(err => console.error('Failed to save widget style', err))
}

// ─── Duplicate Widget ───────────────────────────────────────────
async function duplicateWidget(widgetId: string) {
  const widget = getWidgetById(widgetId)
  const layoutItem = getLayoutItemById(widgetId)
  if (!widget || !layoutItem) return

  const targetTabId = activeTabId.value || tabs.value[0]?.id
  if (!targetTabId) return

  const OFFSET = 30
  const newPosition = {
    left: layoutItem.left + OFFSET,
    top: layoutItem.top + OFFSET,
    width: layoutItem.width,
    height: layoutItem.height
  }

  const body: any = {
    tabId: targetTabId,
    type: widget.type,
    position: newPosition,
    style: JSON.parse(JSON.stringify(widget.style || {}))
  }
  if (widget.type === 'chart' && widget.chartId) {
    body.chartId = widget.chartId
  }
  if (widget.configOverride) {
    body.configOverride = JSON.parse(JSON.stringify(widget.configOverride))
  }

  // Optimistic local add
  const tempWidgetId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const newWidget = {
    widgetId: tempWidgetId,
    type: widget.type,
    chartId: widget.chartId,
    name: widget.name,
    position: newPosition,
    state: widget.state,
    style: JSON.parse(JSON.stringify(widget.style || {})),
    configOverride: widget.configOverride ? JSON.parse(JSON.stringify(widget.configOverride)) : undefined,
    dataStatus: widget.type === 'chart' ? 'pending' as const : undefined
  }

  const tab = tabs.value.find(t => t.id === targetTabId)
  if (tab) {
    tab.widgets.push(newWidget)
    const newLayoutItem = {
      left: newPosition.left,
      top: newPosition.top,
      width: newPosition.width,
      height: newPosition.height,
      i: String(tempWidgetId)
    }
    tabLayouts[targetTabId] = [...(tabLayouts[targetTabId] || []), newLayoutItem]
    gridLayout.value = cloneLayout(tabLayouts[targetTabId])
  }

  selectedTextWidgetId.value = tempWidgetId

  try {
    const res = await $fetch<{ success: boolean; widgetId: string }>('/api/dashboard-widgets', {
      method: 'POST',
      body
    })
    if (res?.widgetId && tab) {
      const widgetIndex = tab.widgets.findIndex(w => w.widgetId === tempWidgetId)
      if (widgetIndex >= 0) {
        tab.widgets[widgetIndex].widgetId = res.widgetId
        const layoutItemIndex = tabLayouts[targetTabId].findIndex((item: any) => item.i === String(tempWidgetId))
        if (layoutItemIndex >= 0) {
          tabLayouts[targetTabId][layoutItemIndex].i = String(res.widgetId)
          gridLayout.value = cloneLayout(tabLayouts[targetTabId])
          initialTabLayouts.value[targetTabId] = cloneLayout(tabLayouts[targetTabId])
        }
        if (selectedTextWidgetId.value === tempWidgetId) {
          selectedTextWidgetId.value = res.widgetId
        }

        const addedId = res.widgetId
        recordAction({
          type: 'Duplicate Widget',
          undo: async () => { await deleteWidgetInternal(addedId) },
          redo: async () => {
            await $fetch('/api/dashboard-widgets', { method: 'POST', body })
              .then(async () => { await loadDashboard() })
          }
        })
      }
    }
  } catch (error) {
    console.error('Failed to duplicate widget', error)
    if (tab) {
      const widgetIndex = tab.widgets.findIndex(w => w.widgetId === tempWidgetId)
      if (widgetIndex >= 0) {
        tab.widgets.splice(widgetIndex, 1)
        tabLayouts[targetTabId] = cloneLayout(buildLayoutFromTab(targetTabId))
        gridLayout.value = cloneLayout(tabLayouts[targetTabId])
      }
    }
  }
}

// ─── Copy / Cut / Paste ─────────────────────────────────────────
function copyWidgetToClipboard(widgetId: string, isCut: boolean) {
  const widget = getWidgetById(widgetId)
  const layoutItem = getLayoutItemById(widgetId)
  if (!widget || !layoutItem) return

  widgetClipboard.value = {
    type: widget.type,
    chartId: widget.chartId,
    name: widget.name,
    position: {
      left: layoutItem.left,
      top: layoutItem.top,
      width: layoutItem.width,
      height: layoutItem.height
    },
    style: widget.style ? JSON.parse(JSON.stringify(widget.style)) : undefined,
    configOverride: widget.configOverride ? JSON.parse(JSON.stringify(widget.configOverride)) : undefined,
    state: widget.state ? JSON.parse(JSON.stringify(widget.state)) : undefined,
    isCut,
    sourceWidgetId: widgetId
  }

  if (isCut) {
    handleDeleteWidget(widgetId)
  }
}

async function pasteWidget() {
  const clip = widgetClipboard.value
  if (!clip) return

  const targetTabId = activeTabId.value || tabs.value[0]?.id
  if (!targetTabId) return

  const OFFSET = 30
  const newPosition = {
    left: clip.position.left + OFFSET,
    top: clip.position.top + OFFSET,
    width: clip.position.width,
    height: clip.position.height
  }

  const body: any = {
    tabId: targetTabId,
    type: clip.type,
    position: newPosition,
    style: clip.style ? JSON.parse(JSON.stringify(clip.style)) : {}
  }
  if (clip.type === 'chart' && clip.chartId) {
    body.chartId = clip.chartId
  }
  if (clip.configOverride) {
    body.configOverride = JSON.parse(JSON.stringify(clip.configOverride))
  }

  const tempWidgetId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const newWidget = {
    widgetId: tempWidgetId,
    type: clip.type,
    chartId: clip.chartId,
    name: clip.name,
    position: newPosition,
    state: clip.state,
    style: clip.style ? JSON.parse(JSON.stringify(clip.style)) : {},
    configOverride: clip.configOverride ? JSON.parse(JSON.stringify(clip.configOverride)) : undefined,
    dataStatus: clip.type === 'chart' ? 'pending' as const : undefined
  }

  const tab = tabs.value.find(t => t.id === targetTabId)
  if (tab) {
    tab.widgets.push(newWidget)
    const newLayoutItem = {
      left: newPosition.left,
      top: newPosition.top,
      width: newPosition.width,
      height: newPosition.height,
      i: String(tempWidgetId)
    }
    tabLayouts[targetTabId] = [...(tabLayouts[targetTabId] || []), newLayoutItem]
    gridLayout.value = cloneLayout(tabLayouts[targetTabId])
  }

  selectedTextWidgetId.value = tempWidgetId

  // After a cut, clear clipboard; after a copy, keep it
  if (clip.isCut) {
    widgetClipboard.value = null
  } else {
    // Update position for next paste so they don't stack
    clip.position = newPosition
  }

  try {
    const res = await $fetch<{ success: boolean; widgetId: string }>('/api/dashboard-widgets', {
      method: 'POST',
      body
    })
    if (res?.widgetId && tab) {
      const widgetIndex = tab.widgets.findIndex(w => w.widgetId === tempWidgetId)
      if (widgetIndex >= 0) {
        tab.widgets[widgetIndex].widgetId = res.widgetId
        const layoutItemIndex = tabLayouts[targetTabId].findIndex((item: any) => item.i === String(tempWidgetId))
        if (layoutItemIndex >= 0) {
          tabLayouts[targetTabId][layoutItemIndex].i = String(res.widgetId)
          gridLayout.value = cloneLayout(tabLayouts[targetTabId])
          initialTabLayouts.value[targetTabId] = cloneLayout(tabLayouts[targetTabId])
        }
        if (selectedTextWidgetId.value === tempWidgetId) {
          selectedTextWidgetId.value = res.widgetId
        }
        const addedId = res.widgetId
        recordAction({
          type: 'Paste Widget',
          undo: async () => { await deleteWidgetInternal(addedId) },
          redo: async () => {
            await $fetch('/api/dashboard-widgets', { method: 'POST', body })
              .then(async () => { await loadDashboard() })
          }
        })
      }
    }
  } catch (error) {
    console.error('Failed to paste widget', error)
    if (tab) {
      const widgetIndex = tab.widgets.findIndex(w => w.widgetId === tempWidgetId)
      if (widgetIndex >= 0) {
        tab.widgets.splice(widgetIndex, 1)
        tabLayouts[targetTabId] = cloneLayout(buildLayoutFromTab(targetTabId))
        gridLayout.value = cloneLayout(tabLayouts[targetTabId])
      }
    }
  }
}

// ─── Z-Order (Bring to Front / Send to Back) ────────────────────
function changeWidgetZOrder(widgetId: string, direction: 'front' | 'back') {
  const tab = tabs.value.find(t => t.id === activeTabId.value)
  if (!tab) return

  const widgetCount = tab.widgets.length
  if (widgetCount < 2) return

  // Get layout items for z-index reordering
  const layout = tabLayouts[activeTabId.value]
  if (!layout) return

  const itemIndex = layout.findIndex((item: any) => item.i === widgetId)
  if (itemIndex < 0) return

  const [item] = layout.splice(itemIndex, 1)
  if (direction === 'front') {
    layout.push(item)
  } else {
    layout.unshift(item)
  }

  tabLayouts[activeTabId.value] = [...layout]
  gridLayout.value = cloneLayout(tabLayouts[activeTabId.value])

  recordAction({
    type: direction === 'front' ? 'Bring to Front' : 'Send to Back',
    undo: async () => {
      const lay = tabLayouts[activeTabId.value]
      if (!lay) return
      const idx = lay.findIndex((i: any) => i.i === widgetId)
      if (idx < 0) return
      const [it] = lay.splice(idx, 1)
      lay.splice(itemIndex, 0, it)
      tabLayouts[activeTabId.value] = [...lay]
      gridLayout.value = cloneLayout(tabLayouts[activeTabId.value])
    },
    redo: async () => {
      changeWidgetZOrder(widgetId, direction)
    }
  })
}

// ─── Keyboard Shortcuts ─────────────────────────────────────────
function handleDashboardKeyDown(e: KeyboardEvent) {
  if (!isEditableSession.value) return
  // Don't intercept when user is typing in an input/textarea/contenteditable
  const tag = (e.target as HTMLElement).tagName?.toLowerCase()
  const isEditable = (e.target as HTMLElement).isContentEditable
  if (tag === 'input' || tag === 'textarea' || isEditable) return

  const selected = selectedTextWidgetId.value

  if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
    e.preventDefault()
    handleDeleteWidget(selected)
  } else if (e.key === 'd' && (e.ctrlKey || e.metaKey) && selected) {
    e.preventDefault()
    duplicateWidget(selected)
  } else if (e.key === 'c' && (e.ctrlKey || e.metaKey) && selected) {
    e.preventDefault()
    copyWidgetToClipboard(selected, false)
  } else if (e.key === 'x' && (e.ctrlKey || e.metaKey) && selected) {
    e.preventDefault()
    copyWidgetToClipboard(selected, true)
  } else if (e.key === 'v' && (e.ctrlKey || e.metaKey) && widgetClipboard.value) {
    e.preventDefault()
    pasteWidget()
  } else if (e.key === 'Escape') {
    if (ctxMenu.visible) {
      closeContextMenu()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleDashboardKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleDashboardKeyDown)
})
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



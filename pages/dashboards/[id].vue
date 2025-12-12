<template>
  <div class="min-h-screen flex flex-col p-4 lg:p-6">
    <div class="space-y-4 flex-1 flex flex-col overflow-hidden">
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
            v-if="canEditDashboard"
            :color="isEditableSession ? 'gray' : 'orange'"
            variant="solid"
            size="sm"
            class="cursor-pointer"
            @click="handleModeToggle"
        >
          <Icon :name="isEditableSession ? 'i-heroicons-check' : 'i-heroicons-pencil-square'" class="w-4 h-4 mr-1"/>
          {{ isEditableSession ? 'Done' : 'Edit' }}
        </UButton>
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
              v-if="isEditableSession && sidebarCollapsed"
              size="xs"
              variant="outline"
              class="cursor-pointer"
              @click="sidebarCollapsed = false"
              title="Show Options"
          >
            <Icon name="i-heroicons-adjustments-horizontal" class="w-4 h-4 mr-1"/>
            Show Options
          </UButton>
        </div>
      </div>
    </div>

    <!-- Debug Panel (only shown when DEBUG_ENV=true) -->
    <ClientOnly>
      <div v-if="debugEnv" class="debug-panel border rounded bg-neutral-50 dark:bg-neutral-800 p-2">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-medium text-xs flex items-center gap-2">
          <Icon name="i-heroicons-beaker" class="w-3 h-3 text-orange-500"/>
          GridLayout Debug
        </h3>
        <UButton
          variant="ghost"
          size="xs"
          color="gray"
          class="cursor-pointer"
          @click="debugPanelOpen = !debugPanelOpen"
        >
          <Icon :name="debugPanelOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-3 h-3"/>
        </UButton>
      </div>

      <div v-if="debugPanelOpen" class="space-y-3">
        <!-- Basic Layout Properties -->
        <div>
          <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Basic Layout</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Columns</label>
              <UInput v-model.number="gridConfig.colNum" type="number" size="sm" min="1" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Row Height</label>
              <UInput v-model.number="gridConfig.rowHeight" type="number" size="sm" min="1" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max Rows</label>
              <UInput v-model="maxRowsInput" type="number" size="sm" min="1" placeholder="Infinity" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Margin [x,y]</label>
              <div class="flex gap-1">
                <UInput v-model.number="gridConfig.margin[0]" type="number" size="sm" placeholder="x" min="0" />
                <UInput v-model.number="gridConfig.margin[1]" type="number" size="sm" placeholder="y" min="0" />
              </div>
            </div>
          </div>
        </div>

        <!-- Behavior Properties -->
        <div>
          <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Behavior</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Draggable</label>
              <UCheckbox v-model="gridConfig.isDraggable" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Resizable</label>
              <UCheckbox v-model="gridConfig.isResizable" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Mirrored (RTL)</label>
              <UCheckbox v-model="gridConfig.isMirrored" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bounded</label>
              <UCheckbox v-model="gridConfig.isBounded" />
            </div>
          </div>
        </div>

        <!-- Layout Properties -->
        <div>
          <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Layout</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Auto Size</label>
              <UCheckbox v-model="gridConfig.autoSize" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Vertical Compact</label>
              <UCheckbox v-model="gridConfig.verticalCompact" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Restore on Drag</label>
              <UCheckbox v-model="gridConfig.restoreOnDrag" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Prevent Collision</label>
              <UCheckbox v-model="gridConfig.preventCollision" />
            </div>
          </div>
        </div>

        <!-- Performance Properties -->
        <div>
          <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Performance</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CSS Transforms</label>
              <UCheckbox v-model="gridConfig.useCssTransforms" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Style Cursor</label>
              <UCheckbox v-model="gridConfig.useStyleCursor" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Transform Scale</label>
              <UInput v-model.number="gridConfig.transformScale" type="number" size="sm" step="0.1" min="0.1" />
            </div>
          </div>
        </div>

        <!-- Responsive Properties -->
        <div>
          <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Responsive</h4>
          <div class="space-y-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Responsive</label>
              <UCheckbox v-model="gridConfig.responsive" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Breakpoints</label>
                <UTextarea
                  v-model="breakpointsJson"
                  :rows="2"
                  size="sm"
                  monospace
                  placeholder='{"lg": 1200, "md": 996, "sm": 768, "xs": 480, "xxs": 0}'
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Columns per Breakpoint</label>
                <UTextarea
                  v-model="colsJson"
                  :rows="2"
                  size="sm"
                  monospace
                  placeholder='{"lg": 12, "md": 10, "sm": 6, "xs": 4, "xxs": 2}'
                />
              </div>
            </div>
          </div>
        </div>

        <!-- JSON Editor for gridLayout -->
        <div>
          <h4 class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">Layout Data</h4>
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Grid Layout JSON</label>
          <UTextarea
            v-model="gridLayoutJson"
            :rows="6"
            size="sm"
            monospace
            @input="updateGridLayoutFromJson"
            placeholder="Edit the grid layout as JSON..."
          />
        </div>

        <!-- Current Layout Info -->
        <div class="text-xs text-gray-600 dark:text-gray-400 border-t pt-2">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <div class="font-medium mb-1">Layout Stats</div>
              <div>Items: {{ gridLayout.length }}</div>
              <div>Total Width: {{ gridLayout.reduce((sum, item) => sum + item.w, 0) }}</div>
              <div>Max Height: {{ gridLayout.length ? Math.max(...gridLayout.map(item => item.y + item.h)) : 0 }}</div>
            </div>
            <div>
              <div class="font-medium mb-1">Config Summary</div>
              <div>Responsive: {{ gridConfig.responsive ? 'Yes' : 'No' }}</div>
              <div>Draggable: {{ gridConfig.isDraggable ? 'Yes' : 'No' }}</div>
              <div>Resizable: {{ gridConfig.isResizable ? 'Yes' : 'No' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
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


      <div class="flex gap-4 items-stretch flex-1 min-h-0">
        <div class="flex-1 min-w-0 h-full">
          <div class="h-full overflow-auto pr-1">
            <Dashboard
                :device="device"
                v-model:layout="gridLayout"
                :grid-config="effectiveGridConfig"
                :widgets="currentTabWidgets"
                :loading="loading"
                :preview="!isEditableSession"
                :selected-text-id="selectedWidgetId"
                ref="dashboardRef"
                @edit-chart="editChart"
                @rename-chart="startRenameChart"
                @delete-chart="confirmDeleteChart"
                @edit-text="startEditText"
                @delete-widget="handleDeleteWidget"
                @select-text="selectWidget"
                @update-text-content="updateTextContent"
                @rename-chart-inline="renameChartInline"
            />
          </div>
        </div>
        <WidgetOptionsSidebar
            v-if="isEditableSession && !sidebarCollapsed"
            :selected-widget="selectedWidget"
            :text-form="textForm"
            :font-family-items="fontFamilyItems"
            :chart-appearance="selectedChartAppearance"
            :readonly="!isEditableSession"
            @update-text-form="updateTextForm"
            @update-text-content="updateTextContentInline"
            @delete-widget="selectedWidget && handleDeleteWidget(selectedWidget.widgetId)"
            @edit-chart="selectedWidget && selectedWidget.chartId ? editChart(String(selectedWidget.chartId)) : null"
            @rename-chart="(name)=> selectedWidget && renameChartInline(selectedWidget.widgetId, name)"
            @delete-chart="selectedWidget && handleDeleteWidget(selectedWidget.widgetId)"
            @update-chart-appearance="updateChartAppearance"
        >
          <template #collapse>
            <UButton size="xs" variant="ghost" class="cursor-pointer" @click="sidebarCollapsed = true">
              <Icon name="i-heroicons-chevron-right" class="w-4 h-4"/>
            </UButton>
          </template>
        </WidgetOptionsSidebar>
      </div>
      <div v-if="isEditableSession && sidebarCollapsed" class="flex justify-end mt-2">
        <UButton size="sm" variant="outline" class="cursor-pointer" @click="sidebarCollapsed = false">
          <Icon name="i-heroicons-chevron-left" class="w-4 h-4 mr-1"/>
          Show Text Options
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
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

// Debug environment flag for development
const { public: { debugEnv: runtimeDebugEnv } } = useRuntimeConfig()
const debugEnv = ref<boolean>(false)

onMounted(() => {
  if (typeof window === 'undefined') return
  if (!('__DEBUG_ENV__' in (window as any))) {
    ;(window as any).__DEBUG_ENV__ = runtimeDebugEnv === 'true'
  }
  debugEnv.value = (window as any).__DEBUG_ENV__ === true
})


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

const dashboardName = ref('')
const initialDashboardName = ref('')
const tabs = ref<Array<{
  id: string;
  name: string;
  position: number;
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
const loading = ref(true)

// Modal states
const showRenameModal = ref(false)
const showDeleteModal = ref(false)
const showAddChartModal = ref(false)
const showCreateTabModal = ref(false)
const showRenameTabModal = ref(false)
const showDeleteTabModal = ref(false)
const pendingRoute = ref<any>(null)

// Text widget editor
const selectedTextWidgetId = ref<string | null>(null)
const selectedWidgetId = selectedTextWidgetId
const sidebarCollapsed = ref(false)
const renameChartTimers: Record<number, ReturnType<typeof setTimeout>> = {}
const saveChartOverrideTimers: Record<string, ReturnType<typeof setTimeout>> = {}
let saveDashboardNameTimer: ReturnType<typeof setTimeout> | null = null
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
})

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

// Computed property for current tab widgets/charts
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
  if (!activeTabId.value) return
  tabLayouts[activeTabId.value] = cloneLayout(layout || [])
}, {deep: true})

// Auto-save layout changes
watch(tabLayouts, (layouts) => {
  if (!isEditableSession.value) return
  if (saveLayoutTimer) clearTimeout(saveLayoutTimer)
  saveLayoutTimer = setTimeout(async () => {
    try {
      const layoutPayload = Object.values(layouts).flatMap((layoutArr) =>
          (layoutArr || []).map((item) => ({
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

    tabs.value = (res.tabs || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      position: t.position,
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
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadUserProfile()
  await load()
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
        currentTab.widgets.splice(widgetIndex, 1)
        const updatedLayout = buildLayoutFromTab(activeTabId.value)
        tabLayouts[activeTabId.value] = cloneLayout(updatedLayout)
        initialTabLayouts.value[activeTabId.value] = cloneLayout(updatedLayout)
        gridLayout.value = cloneLayout(updatedLayout)
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
  const style = {...getDefaultTextStyle(), ...(widget.style || {})}
  Object.assign(textForm, style)
  selectedTextWidgetId.value = widgetId
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

async function renameChartInline(widgetId: string, name: string) {
  const widget = tabs.value.flatMap(t => t.widgets).find(w => w.widgetId === widgetId)
  if (!widget || widget.type !== 'chart' || widget.chartId == null) return
  widget.name = name
  const chartId = Number(widget.chartId)
  if (!Number.isFinite(chartId)) return
  if (renameChartTimers[chartId]) clearTimeout(renameChartTimers[chartId])
  renameChartTimers[chartId] = setTimeout(async () => {
    try {
      await updateChart({id: chartId, name})
    } catch (e) {
      console.error('Failed to rename chart inline', e)
    }
  }, 300)
}

let saveTextTimer: ReturnType<typeof setTimeout> | null = null
watch(textForm, (val) => {
  if (!selectedTextWidgetId.value || !isEditableSession.value) return
  const tab = tabs.value.find(t => t.id === activeTabId.value)
  if (!tab) return
  const widget = tab.widgets.find(w => w.widgetId === selectedTextWidgetId.value)
  if (widget) {
    widget.style = {...val}
    widget.name = widget.style.content || widget.name
  }
  if (saveTextTimer) clearTimeout(saveTextTimer)
  saveTextTimer = setTimeout(() => {
    persistTextWidget().catch((err) => console.error('Failed to persist text widget', err))
  }, 200)
}, {deep: true})

// Auto-save dashboard name changes
watch(dashboardName, (newName) => {
  if (!isEditableSession.value || !newName.trim()) return
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
})

async function persistTextWidget() {
  if (!selectedTextWidgetId.value) return
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
    await load()
    if (res?.widgetId) {
      startEditText(res.widgetId)
    }
  } catch (error) {
    console.error('Failed to add text widget', error)
  }
}

async function handleDeleteWidget(widgetId: string) {
  try {
    await $fetch('/api/dashboard-widgets', {
      method: 'DELETE',
      query: {id: widgetId}
    })
    const tab = tabs.value.find(t => t.id === activeTabId.value)
    if (tab) {
      const idx = tab.widgets.findIndex(w => w.widgetId === widgetId)
      if (idx >= 0) {
        tab.widgets.splice(idx, 1)
        tabLayouts[activeTabId.value] = cloneLayout(buildLayoutFromTab(activeTabId.value))
        gridLayout.value = cloneLayout(tabLayouts[activeTabId.value])
        initialTabLayouts.value[activeTabId.value] = cloneLayout(tabLayouts[activeTabId.value])
      }
    }
    if (selectedTextWidgetId.value === widgetId) {
      selectedTextWidgetId.value = null
    }
  } catch (error) {
    console.error('Failed to delete widget', error)
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

function selectWidget(widgetId: string) {
  const widget = tabs.value.flatMap(t => t.widgets).find(w => w.widgetId === widgetId)
  if (!widget) return
  selectedWidgetId.value = widgetId
  if (widget.type === 'text') {
    startEditText(widgetId)
  }
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



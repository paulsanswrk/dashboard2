<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UButton variant="ghost" @click="goBack" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
          <Icon name="i-heroicons-arrow-left" class="w-5 h-5"/>
        </UButton>
        <div>
          <h1 class="text-2xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">
            {{ organization?.name || 'Organization Details' }}
          </h1>
        </div>
      </div>
    </div>

    <ClientOnly>
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="text-center">
          <Icon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2"/>
          <p class="text-gray-500 dark:text-gray-400">Loading organization details...</p>
        </div>
      </div>

      <!-- Organization Details -->
      <div v-else-if="organization" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-start">
        <!-- Organization Overview -->
        <UCard class="bg-white dark:bg-gray-800 2xl:col-span-2">
          <template #header>
            <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
              Organization Overview
            </h3>
          </template>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div class="text-center">
              <div class="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full mx-auto mb-3">
                <Icon name="i-heroicons-user-group" class="w-6 h-6 text-green-600 dark:text-green-300"/>
              </div>
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ internalUsers?.length || 0 }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Internal Users</div>
            </div>

            <div class="text-center">
              <div class="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full mx-auto mb-3">
                <Icon name="i-heroicons-eye" class="w-6 h-6 text-purple-600 dark:text-purple-300"/>
              </div>
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ allViewers?.length || 0 }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Viewers</div>
            </div>

            <div class="text-center">
              <div class="flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full mx-auto mb-3">
                <Icon name="i-heroicons-chart-bar" class="w-6 h-6 text-orange-600 dark:text-orange-300"/>
              </div>
              <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ organization.dashboards_count || 0 }}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Dashboards</div>
            </div>
          </div>

          <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Organization Name
                </label>
                <div class="text-gray-900 dark:text-white font-medium">
                  {{ organization.name }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Organization ID
                </label>
                <div class="text-gray-500 dark:text-gray-400 font-mono text-sm">
                  {{ organization.id }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Created Date
                </label>
                <div class="text-gray-900 dark:text-white">
                  {{ formatDate(organization.createdAt) }}
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <UBadge :color="organization.status === 'active' ? 'success' : 'neutral'" variant="soft">
                  {{ organization.status || 'Active' }}
                </UBadge>
              </div>

              <div v-if="organization.tenantName">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tenant Name
                </label>
                <div class="text-gray-900 dark:text-white">
                  {{ organization.tenantName }}
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Users Section -->
        <UCard class="bg-white dark:bg-gray-800 lg:col-span-1 user-card-container">
          <template #header>
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white whitespace-nowrap">
                Internal Users ({{ filteredInternalUsers?.length || 0 }})
              </h3>
              <div class="flex items-center gap-2 flex-wrap">
                <UInput
                    v-model="userSearchQuery"
                    placeholder="Search users..."
                    size="sm"
                    class="w-40 md:w-48 search-input"
                    :disabled="isLoading"
                    :ui="{ padding: { sm: 'ps-9' } }"
                >
                  <template #leading>
                    <Icon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-gray-400" />
                  </template>
                  <template #trailing>
                    <UButton
                        v-if="userSearchQuery"
                        color="gray"
                        variant="link"
                        icon="i-heroicons-x-mark"
                        :padded="false"
                        @click="userSearchQuery = ''"
                        class="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    />
                  </template>
                </UInput>
                <UButton
                    color="orange"
                    size="sm"
                    class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer whitespace-nowrap"
                    @click="openAddUserModal"
                    :disabled="isLoading"
                >
                  <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
                  Add User
                </UButton>
              </div>
            </div>
          </template>

          <!-- Bulk Actions Bar -->
          <div v-if="selectedUsers.length > 0" class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-between">
            <span class="text-sm text-blue-700 dark:text-blue-300">{{ selectedUsers.length }} user(s) selected</span>
            <div class="flex gap-2">
              <UButton size="xs" color="red" variant="soft" @click="bulkDeleteUsers" :loading="isBulkDeleting">
                <Icon name="i-heroicons-trash" class="w-3 h-3 mr-1"/>
                Delete Selected
              </UButton>
              <UButton size="xs" variant="ghost" @click="clearUserSelection">
                Clear
              </UButton>
            </div>
          </div>

          <div v-if="filteredInternalUsers?.length > 0" class="users-list-container space-y-2 max-h-96 overflow-y-auto pr-1">
            <div v-for="profile in filteredInternalUsers" :key="profile.userId"
                 class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <!-- Responsive row: stack on small screens, row on larger -->
              <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <!-- Left: Checkbox + Avatar + Name/Email -->
                <div class="flex items-center gap-2 min-w-0 flex-1">
                   <UCheckbox
                       color="primary"
                      :model-value="selectedUsers.includes(profile.userId)"
                      @update:model-value="toggleUserSelection(profile.userId)"
                      class="flex-shrink-0 -ml-0.5 user-checkbox"
                      :ui="{ border: 'border-gray-300 dark:border-gray-500' }"
                  />
                  <div class="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-xs md:text-sm flex-shrink-0 -ml-1">
                    {{ getUserInitials(profile.firstName, profile.lastName) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold text-gray-900 dark:text-white truncate text-sm md:text-base">
                      {{ profile.firstName || '' }} {{ profile.lastName || '' }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {{ profile.email || 'No email' }}
                    </div>
                  </div>
                </div>
                <!-- Right: Badge + Date + Actions -->
                <div class="flex items-center gap-2 flex-shrink-0 ml-11 md:ml-0">
                  <UBadge :color="profile.role === 'ADMIN' ? 'orange' : 'gray'" variant="soft" size="xs" class="whitespace-nowrap">
                    {{ profile.role }}
                  </UBadge>
                  <div class="user-date text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {{ formatDate(profile.createdAt, true) }}
                  </div>
                  <div class="flex items-center gap-1">
                    <UButton
                        variant="ghost"
                        size="xs"
                        color="gray"
                        class="hover:bg-gray-200 dark:hover:bg-gray-500 cursor-pointer"
                        @click="editUser(profile)"
                        :disabled="isEditingUser"
                    >
                      <Icon name="i-heroicons-pencil" class="w-4 h-4"/>
                    </UButton>
                    <UButton
                        variant="ghost"
                        size="xs"
                        color="red"
                        class="hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        @click="deleteUser(profile)"
                        :disabled="isDeletingUser"
                        :loading="isDeletingUser && deletingUserId === profile.userId"
                    >
                      <Icon name="i-heroicons-trash" class="w-4 h-4"/>
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="userSearchQuery && internalUsers?.length > 0" class="text-center py-8">
            <Icon name="i-heroicons-magnifying-glass" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4"/>
            <p class="text-gray-500 dark:text-gray-400 mb-2">No users match "{{ userSearchQuery }}"</p>
            <UButton size="sm" variant="ghost" @click="userSearchQuery = ''">Clear search</UButton>
          </div>

          <div v-else class="text-center py-8">
            <Icon name="i-heroicons-user-group" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4"/>
            <p class="text-gray-500 dark:text-gray-400 mb-4">No internal users found</p>
            <UButton
                color="orange"
                size="sm"
                class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                @click="openAddUserModal"
            >
              <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
              Add First User
            </UButton>
          </div>
        </UCard>

        <!-- Viewers Section -->
        <UCard class="bg-white dark:bg-gray-800 lg:col-span-1 user-card-container">
          <template #header>
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white whitespace-nowrap">
                Viewers ({{ filteredViewers?.length || 0 }})
              </h3>
              <div class="flex items-center gap-2 flex-wrap">
                <UInput
                    v-model="viewerSearchQuery"
                    placeholder="Search viewers..."
                    size="sm"
                    class="w-40 md:w-48 search-input"
                    :disabled="isLoading"
                    :ui="{ padding: { sm: 'ps-9' } }"
                >
                  <template #leading>
                    <Icon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-gray-400" />
                  </template>
                  <template #trailing>
                    <UButton
                        v-if="viewerSearchQuery"
                        color="gray"
                        variant="link"
                        icon="i-heroicons-x-mark"
                        :padded="false"
                        @click="viewerSearchQuery = ''"
                        class="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    />
                  </template>
                </UInput>
                <UButton
                    color="purple"
                    size="sm"
                    class="bg-purple-500 hover:bg-purple-600 text-white cursor-pointer whitespace-nowrap"
                    @click="openAddViewerModal"
                    :disabled="isLoading"
                >
                  <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
                  Add Viewer
                </UButton>
              </div>
            </div>
          </template>

          <!-- Bulk Actions Bar -->
          <div v-if="selectedViewers.length > 0" class="mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-between">
            <span class="text-sm text-purple-700 dark:text-purple-300">{{ selectedViewers.length }} viewer(s) selected</span>
            <div class="flex gap-2">
              <UButton size="xs" color="red" variant="soft" @click="bulkDeleteViewers" :loading="isBulkDeleting">
                <Icon name="i-heroicons-trash" class="w-3 h-3 mr-1"/>
                Delete Selected
              </UButton>
              <UButton size="xs" variant="ghost" @click="clearViewerSelection">
                Clear
              </UButton>
            </div>
          </div>

          <div v-if="filteredViewers?.length > 0" class="users-list-container space-y-2 max-h-96 overflow-y-auto pr-1">
            <div v-for="viewer in filteredViewers" :key="viewer.userId"
                 class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <!-- Responsive row: stack on small screens, row on larger -->
              <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <!-- Left: Checkbox + Avatar + Name/Email -->
                <div class="flex items-center gap-2 min-w-0 flex-1">
                   <UCheckbox
                      :model-value="selectedViewers.includes(viewer.userId)"
                      @update:model-value="toggleViewerSelection(viewer.userId)"
                      class="flex-shrink-0 -ml-0.5 user-checkbox"
                      :ui="{ border: 'border-gray-300 dark:border-gray-500' }"
                  />
                  <div class="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs md:text-sm flex-shrink-0 -ml-1">
                    {{ getUserInitials(viewer.firstName, viewer.lastName) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold text-gray-900 dark:text-white truncate text-sm md:text-base">
                      {{ viewer.firstName || '' }} {{ viewer.lastName || '' }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {{ viewer.email || 'No email' }}
                    </div>
                  </div>
                </div>
                <!-- Right: Badge + Date + Actions -->
                <div class="flex items-center gap-2 flex-shrink-0 ml-11 md:ml-0">
                  <UBadge color="purple" variant="soft" size="xs" class="whitespace-nowrap">
                    {{ viewer.viewer_type || 'Viewer' }}
                  </UBadge>
                  <UBadge v-if="viewer.group_name" color="gray" variant="soft" size="xs" class="whitespace-nowrap">
                    {{ viewer.group_name }}
                  </UBadge>
                  <div class="user-date text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {{ formatDate(viewer.createdAt, true) }}
                  </div>
                  <UButton
                      variant="ghost"
                      size="xs"
                      color="red"
                      class="hover:bg-red-50 hover:text-red-700 cursor-pointer"
                      @click="deleteViewer(viewer)"
                      :disabled="isDeletingViewer"
                      :loading="isDeletingViewer && deletingViewerId === viewer.userId"
                  >
                    <Icon name="i-heroicons-trash" class="w-4 h-4"/>
                  </UButton>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="viewerSearchQuery && allViewers?.length > 0" class="text-center py-8">
            <Icon name="i-heroicons-magnifying-glass" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4"/>
            <p class="text-gray-500 dark:text-gray-400 mb-2">No viewers match "{{ viewerSearchQuery }}"</p>
            <UButton size="sm" variant="ghost" @click="viewerSearchQuery = ''">Clear search</UButton>
          </div>

          <div v-else class="text-center py-8">
            <Icon name="i-heroicons-eye" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4"/>
            <p class="text-gray-500 dark:text-gray-400 mb-4">No viewers found</p>
            <UButton
                color="purple"
                size="sm"
                class="bg-purple-500 hover:bg-purple-600 text-white cursor-pointer"
                @click="openAddViewerModal"
            >
              <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
              Add First Viewer
            </UButton>
          </div>
        </UCard>

        <!-- Data Connections Section -->
        <UCard class="bg-white dark:bg-gray-800 lg:col-span-1 2xl:col-span-2">
          <template #header>
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white whitespace-nowrap">
                Data Connections ({{ dataConnections?.length || 0 }})
              </h3>
              <UButton
                color="blue"
                size="sm"
                class="bg-blue-500 hover:bg-blue-600 text-white cursor-pointer whitespace-nowrap"
                @click="openAddConnectionModal"
                :disabled="isLoading"
              >
                <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
                Add Connection
              </UButton>
            </div>
          </template>

          <div v-if="dataConnections?.length > 0" class="space-y-2 max-h-96 overflow-y-auto pr-1">
            <div v-for="connection in dataConnections" :key="connection.id"
                 class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <div :class="[
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                    connection.database_type === 'internal' 
                      ? 'bg-blue-100 dark:bg-blue-900' 
                      : 'bg-orange-100 dark:bg-orange-900'
                  ]">
                    <Icon 
                      :name="connection.database_type === 'internal' ? 'i-heroicons-cloud' : 'i-heroicons-circle-stack'" 
                      :class="[
                        'w-5 h-5',
                        connection.database_type === 'internal' 
                          ? 'text-blue-600 dark:text-blue-300' 
                          : 'text-orange-600 dark:text-orange-300'
                      ]"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold text-gray-900 dark:text-white truncate">
                      {{ connection.internal_name }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {{ connection.database_type === 'internal' ? 'Internal Data Source' : `${connection.database_name} @ ${connection.host}` }}
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0 ml-13 md:ml-0">
                  <UBadge 
                    :color="connection.database_type === 'internal' ? 'info' : 'warning'" 
                    variant="soft" 
                    size="xs"
                  >
                    {{ connection.database_type === 'internal' ? 'Internal' : 'MySQL' }}
                  </UBadge>
                  <div class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {{ formatDate(connection.created_at, true) }}
                  </div>
                  <UButton
                    v-if="!connection.is_immutable && (connection.database_type !== 'internal' || userProfile?.role === 'SUPERADMIN')"
                    variant="ghost"
                    size="xs"
                    color="gray"
                    class="hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                    @click="editConnection(connection)"
                  >
                    <Icon name="i-heroicons-pencil-square" class="w-4 h-4"/>
                  </UButton>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8">
            <Icon name="i-heroicons-circle-stack" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4"/>
            <p class="text-gray-500 dark:text-gray-400 mb-4">No data connections configured</p>
            <UButton
              color="blue"
              size="sm"
              class="bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
              @click="openAddConnectionModal"
            >
              <Icon name="i-heroicons-plus" class="w-4 h-4 mr-1"/>
              Add First Connection
            </UButton>
          </div>
        </UCard>

        <!-- License Management Card -->

        <UCard v-if="false" class="bg-white dark:bg-gray-800">
          <template #header>
            <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
              License Management
            </h3>
          </template>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Number of Licenses
                </label>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Set the maximum number of viewer licenses for this organization
                </p>
              </div>
              <div class="flex items-center gap-3">
                <UInput
                    v-model="licensesForm.licenses"
                    type="number"
                    min="0"
                    class="w-24 text-center"
                    :disabled="isUpdating"
                />
                <UButton
                    color="orange"
                    class="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                    @click="updateLicenses"
                    :loading="isUpdating"
                    :disabled="licensesForm.licenses === organization.licenses"
                >
                  Update
                </UButton>
              </div>
            </div>

            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Current Licenses:</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ organization.licenses || 0 }}</span>
              </div>
              <div class="flex items-center justify-between text-sm mt-1">
                <span class="text-gray-600 dark:text-gray-400">Used by Viewers:</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ organization.viewer_count || 0 }}</span>
              </div>
              <div class="flex items-center justify-between text-sm mt-1">
                <span class="text-gray-600 dark:text-gray-400">Available:</span>
                <span class="font-medium" :class="availableLicenses >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                  {{ availableLicenses }}
                </span>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Error State -->
      <div v-else class="text-center py-12">
        <Icon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-red-400 mx-auto mb-4"/>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Organization not found</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">The organization you're looking for doesn't exist or you don't have permission to view it.</p>
        <UButton @click="goBack" color="orange">
          <Icon name="i-heroicons-arrow-left" class="w-4 h-4 mr-1"/>
          Go Back
        </UButton>
      </div>

      <!-- Add User Modal -->
      <UModal v-model:open="showAddUserModal">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
            Add New User
          </h3>
        </template>

        <template #body>
          <form @submit.prevent="addUser" class="space-y-4">
            <UFormField label="Email Address" required>
              <UInput v-model="userForm.email" type="email" placeholder="Enter email address" class="w-full"/>
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="First Name" required>
                <UInput v-model="userForm.firstName" placeholder="Enter first name" class="w-full"/>
              </UFormField>

              <UFormField label="Last Name" required>
                <UInput v-model="userForm.lastName" placeholder="Enter last name" class="w-full"/>
              </UFormField>
            </div>

            <UFormField label="Role">
              <USelect
                  v-model="userForm.role"
                  :items="userRoleOptions"
                  placeholder="Select role"
                  class="w-full"
              />
            </UFormField>

            <label class="flex items-center gap-2 pt-2 cursor-pointer">
              <UCheckbox
                v-model="userForm.sendInvitationEmail"
                color="primary"
                :ui="{ border: 'border-gray-300 dark:border-gray-500' }"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">Send invitation email</span>
            </label>

            <div class="flex justify-end gap-3 pt-4">
              <UButton variant="ghost" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="closeAddUserModal">Cancel</UButton>
              <UButton type="submit" color="orange" class="bg-orange-500 hover:bg-orange-600 text-white dark:text-black cursor-pointer" :loading="isAddingUser">
                Add User
              </UButton>
            </div>
          </form>
        </template>
      </UModal>

      <!-- Add Viewer Modal -->
      <UModal v-model:open="showAddViewerModal">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
            Add New Viewer
          </h3>
        </template>

        <template #body>
          <form @submit.prevent="addViewer" class="space-y-4">
            <UFormField label="Email Address" required>
              <UInput v-model="viewerForm.email" type="email" placeholder="Enter email address" class="w-full"/>
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="First Name" required>
                <UInput v-model="viewerForm.firstName" placeholder="Enter first name" class="w-full"/>
              </UFormField>

              <UFormField label="Last Name" required>
                <UInput v-model="viewerForm.lastName" placeholder="Enter last name" class="w-full"/>
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Viewer Type">
                <UInput v-model="viewerForm.type" placeholder="e.g., Viewer, Manager" class="w-full"/>
              </UFormField>

              <UFormField label="Group">
                <UInput v-model="viewerForm.group" placeholder="e.g., Sales, Marketing" class="w-full"/>
              </UFormField>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <UButton variant="ghost" class="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" @click="closeAddViewerModal">Cancel</UButton>
              <UButton type="submit" color="purple" class="bg-purple-500 hover:bg-purple-600 text-white dark:text-black cursor-pointer" :loading="isAddingViewer">
                Add Viewer
              </UButton>
            </div>
          </form>
        </template>
      </UModal>

      <!-- Delete User Confirmation Modal -->
      <UModal v-model:open="showDeleteUserModal">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-red-600 dark:text-red-400">
            Delete User
          </h3>
        </template>

        <template #body>
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600 dark:text-red-400"/>
              </div>
              <div class="space-y-2">
                <p class="text-gray-900 dark:text-white font-medium">
                  Are you sure you want to delete this user?
                </p>
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p class="text-sm text-red-800 dark:text-red-200 font-medium mb-1">This will permanently delete:</p>
                  <ul class="text-sm text-red-700 dark:text-red-300 space-y-1">
                    <li>• User account and all associated data</li>
                    <li>• All dashboards created by this user</li>
                  </ul>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <UButton variant="ghost" @click="cancelDeleteUser" :disabled="isDeletingUser">
                Cancel
              </UButton>
              <UButton
                  color="red"
                  @click="confirmDeleteUser"
                  :loading="isDeletingUser"
              >
                Delete User
              </UButton>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Delete Viewer Confirmation Modal -->
      <UModal v-model:open="showDeleteViewerModal">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-red-600 dark:text-red-400">
            Delete Viewer
          </h3>
        </template>

        <template #body>
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600 dark:text-red-400"/>
              </div>
              <div class="space-y-2">
                <p class="text-gray-900 dark:text-white font-medium">
                  Are you sure you want to delete this viewer?
                </p>
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p class="text-sm text-red-800 dark:text-red-200 font-medium mb-1">This will permanently delete:</p>
                  <ul class="text-sm text-red-700 dark:text-red-300 space-y-1">
                    <li>• Viewer account and all associated data</li>
                    <li>• Access to all shared dashboards</li>
                  </ul>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <UButton variant="ghost" @click="cancelDeleteViewer" :disabled="isDeletingViewer">
                Cancel
              </UButton>
              <UButton
                  color="red"
                  @click="confirmDeleteViewer"
                  :loading="isDeletingViewer"
              >
                Delete Viewer
              </UButton>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Add Connection Modal -->
      <UModal v-model:open="showAddConnectionModal">
        <template #header>
          <h3 class="text-lg font-heading font-semibold tracking-tight text-gray-900 dark:text-white">
            Add Data Connection
          </h3>
        </template>

        <template #body>
          <div class="space-y-4">
            <!-- Data Source Type Selector -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Connection Type
              </label>
              <div class="grid grid-cols-2 gap-3">
                <div 
                  class="p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md"
                  :class="connectionForm.databaseType !== 'internal' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700'"
                  @click="selectConnectionType('mysql')"
                >
                  <div class="flex items-center gap-2">
                    <Icon name="i-heroicons-circle-stack" class="w-6 h-6 text-orange-500"/>
                    <span class="font-medium text-gray-900 dark:text-white">MySQL</span>
                  </div>
                </div>
                <!-- Internal option only visible to SUPERADMIN -->
                <div 
                  v-if="userProfile?.role === 'SUPERADMIN'"
                  class="p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md"
                  :class="connectionForm.databaseType === 'internal' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'"
                  @click="selectConnectionType('internal')"
                >
                  <div class="flex items-center gap-2">
                    <Icon name="i-heroicons-cloud" class="w-6 h-6 text-blue-500"/>
                    <span class="font-medium text-gray-900 dark:text-white">Internal</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Connection Name (both types) -->
            <UFormField label="Connection Name" required>
              <UInput v-model="connectionForm.internalName" placeholder="e.g., My Database" class="w-full"/>
            </UFormField>

            <!-- MySQL-specific fields -->
            <template v-if="connectionForm.databaseType !== 'internal'">
              <UFormField label="Database Name" required>
                <UInput v-model="connectionForm.databaseName" placeholder="e.g., analytics_db" class="w-full"/>
              </UFormField>
              <UFormField label="Host" required>
                <UInput v-model="connectionForm.host" placeholder="e.g., db.example.com" class="w-full"/>
              </UFormField>
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Username" required>
                  <UInput v-model="connectionForm.username" class="w-full"/>
                </UFormField>
                <UFormField label="Port">
                  <UInput v-model="connectionForm.port" type="number" class="w-full"/>
                </UFormField>
              </div>
              <UFormField label="Password" required>
                <UInput v-model="connectionForm.password" type="password" class="w-full"/>
              </UFormField>
            </template>

            <!-- Internal source info -->
            <UAlert 
              v-else
              color="info" 
              variant="soft"
              title="Internal Data Source"
              description="Connects to the Optiqo Flow internal database. No additional configuration needed."
            />

            <div class="flex justify-end gap-3 pt-4">
              <UButton variant="ghost" @click="showAddConnectionModal = false" :disabled="isSavingConnection">
                Cancel
              </UButton>
              <UButton
                color="primary"
                @click="saveConnection"
                :loading="isSavingConnection"
                class="bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
              >
                Create Connection
              </UButton>
            </div>
          </div>
        </template>
      </UModal>

      <template #fallback>
        <!-- Server-side fallback -->
        <div class="flex justify-center items-center py-12">
          <div class="text-center">
            <Icon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2"/>
            <p class="text-gray-500 dark:text-gray-400">Loading organization details...</p>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup>
// Get organization ID from route
const route = useRoute()
const organizationId = route.params.id

// Authentication
const {userProfile} = useAuth()

// State
const organization = ref(null)
const isLoading = ref(false)
const isUpdating = ref(false)

// Modal states
const showAddUserModal = ref(false)
const showAddViewerModal = ref(false)
const showDeleteUserModal = ref(false)
const showDeleteViewerModal = ref(false)

// Loading states
const isAddingUser = ref(false)
const isAddingViewer = ref(false)
const isDeletingUser = ref(false)
const isDeletingViewer = ref(false)
const deletingUserId = ref(null)
const deletingViewerId = ref(null)

// Form data
const licensesForm = ref({
  licenses: 0
})

const userForm = ref({
  email: '',
  firstName: '',
  lastName: '',
  role: 'EDITOR',
  sendInvitationEmail: true
})

const viewerForm = ref({
  email: '',
  firstName: '',
  lastName: '',
  type: 'Viewer',
  group: ''
})

// User to delete
const userToDelete = ref(null)
const viewerToDelete = ref(null)

// Data connections state
const dataConnections = ref([])
const showAddConnectionModal = ref(false)
const connectionForm = ref({
  internalName: '',
  databaseType: 'mysql',
  databaseName: '',
  host: '',
  username: '',
  password: '',
  port: 3306,
  serverTime: 'GMT+00:00'
})
const isSavingConnection = ref(false)

// Search and filter states
const userSearchQuery = ref('')
const viewerSearchQuery = ref('')

// Bulk selection states
const selectedUsers = ref([])
const selectedViewers = ref([])
const isBulkDeleting = ref(false)

// Edit states
const isEditingUser = ref(false)
const showEditUserModal = ref(false)
const editingUser = ref(null)

// Role options
const userRoleOptions = [
  {label: 'Editor', value: 'EDITOR'},
  {label: 'Admin', value: 'ADMIN'}
]

// Computed
const availableLicenses = computed(() => {
  if (!organization.value) return 0
  return (organization.value.licenses || 0) - (organization.value.viewer_count || 0)
})

// Filter users by role
const internalUsers = computed(() => {
  if (!organization.value?.profiles) return []
  return organization.value.profiles.filter(profile =>
      profile.role === 'ADMIN' || profile.role === 'EDITOR'
  )
})

const allViewers = computed(() => {
  if (!organization.value) return []

  const viewersFromProfiles = (organization.value.profiles || [])
      .filter(profile => profile.role === 'VIEWER')
      .map(profile => ({
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        viewer_type: profile.viewerType || 'Viewer',
        group_name: profile.groupName || null,
        createdAt: profile.createdAt
      }))

  const viewersFromViewersTable = organization.value.viewers || []

  // Combine both sources and remove duplicates
  const combined = [...viewersFromProfiles, ...viewersFromViewersTable]
  const uniqueViewers = combined.filter((viewer, index, self) =>
      index === self.findIndex(v => v.userId === viewer.userId)
  )

  return uniqueViewers
})

// Filtered internal users (for search)
const filteredInternalUsers = computed(() => {
  if (!userSearchQuery.value) return internalUsers.value
  const query = userSearchQuery.value.toLowerCase()
  return internalUsers.value.filter(profile => {
    const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.toLowerCase()
    const email = (profile.email || '').toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })
})

// Filtered viewers (for search)
const filteredViewers = computed(() => {
  if (!viewerSearchQuery.value) return allViewers.value
  const query = viewerSearchQuery.value.toLowerCase()
  return allViewers.value.filter(viewer => {
    const fullName = `${viewer.firstName || ''} ${viewer.lastName || ''}`.toLowerCase()
    const email = (viewer.email || '').toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })
})

// Helper function to get user initials
const getUserInitials = (firstName, lastName) => {
  const first = (firstName || '')[0] || ''
  const last = (lastName || '')[0] || ''
  return (first + last).toUpperCase() || '?'
}

// Bulk selection functions
const toggleUserSelection = (userId) => {
  const index = selectedUsers.value.indexOf(userId)
  if (index === -1) {
    selectedUsers.value.push(userId)
  } else {
    selectedUsers.value.splice(index, 1)
  }
}

const clearUserSelection = () => {
  selectedUsers.value = []
}

const toggleViewerSelection = (userId) => {
  const index = selectedViewers.value.indexOf(userId)
  if (index === -1) {
    selectedViewers.value.push(userId)
  } else {
    selectedViewers.value.splice(index, 1)
  }
}

const clearViewerSelection = () => {
  selectedViewers.value = []
}

// Get access token for API calls
const getAccessToken = async () => {
  const supabase = useSupabaseClient()
  const {data: {session}} = await supabase.auth.getSession()
  return session?.access_token
}

// Load organization details
const loadOrganizationDetails = async () => {
  try {
    isLoading.value = true

    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }

    const response = await $fetch(`/api/organizations/${organizationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (response.success) {
      organization.value = response.organization
      licensesForm.value.licenses = response.organization.licenses || 0
    } else {
      throw new Error('Failed to load organization details')
    }
  } catch (error) {
    console.error('Error loading organization details:', error)

    // Handle session expired errors
    if (error.message?.includes('Session expired') ||
        error.message?.includes('Please log in again') ||
        error.message?.includes('No access token available')) {
      const toast = useToast()
      toast.add({
        title: 'Session Expired',
        description: 'Your session has expired. Please log in again.',
        color: 'red'
      })

      // Redirect to login after a short delay
      setTimeout(() => {
        navigateTo('/login')
      }, 2000)
      return
    }

    // Show user-friendly error message for other errors
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: 'Failed to load organization details. Please try again.',
      color: 'red'
    })
  } finally {
    isLoading.value = false
  }
}

// Load data connections for this organization
const loadDataConnections = async () => {
  try {
    const accessToken = await getAccessToken()
    if (!accessToken) return
    
    const response = await $fetch(`/api/organizations/${organizationId}/connections`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (response.success) {
      dataConnections.value = response.connections || []
    }
  } catch (error) {
    console.error('Error loading data connections:', error)
  }
}

// Open add connection modal
const openAddConnectionModal = () => {
  connectionForm.value = {
    internalName: '',
    databaseType: 'mysql',
    databaseName: '',
    host: '',
    username: '',
    password: '',
    port: 3306,
    serverTime: 'GMT+00:00'
  }
  showAddConnectionModal.value = true
}

// Select database type for connection form
const selectConnectionType = (type) => {
  connectionForm.value.databaseType = type
}

// Save new connection
const saveConnection = async () => {
  const toast = useToast()
  
  // Validate required fields
  if (!connectionForm.value.internalName?.trim()) {
    toast.add({
      title: 'Validation Error',
      description: 'Please enter a connection name',
      color: 'red'
    })
    return
  }
  
  try {
    isSavingConnection.value = true
    const accessToken = await getAccessToken()
    
    const payload = {
      internalName: connectionForm.value.internalName,
      databaseType: connectionForm.value.databaseType,
      storageLocation: connectionForm.value.databaseType === 'internal' ? 'internal' : 'remote',
      organizationId: organizationId // Use the organization from the route, not the logged-in user's org
    }
    
    // For internal sources, set placeholder values
    if (connectionForm.value.databaseType === 'internal') {
      payload.databaseName = 'optiqoflow'
      payload.host = 'internal'
      payload.username = 'service_role'
      payload.password = 'internal'
      payload.port = 5432
      payload.serverTime = 'GMT+00:00'
    } else {
      // For MySQL, require additional fields
      if (!connectionForm.value.host?.trim() || !connectionForm.value.databaseName?.trim()) {
        toast.add({
          title: 'Validation Error',
          description: 'Please fill in all required database fields',
          color: 'red'
        })
        return
      }
      payload.databaseName = connectionForm.value.databaseName
      payload.host = connectionForm.value.host
      payload.username = connectionForm.value.username
      payload.password = connectionForm.value.password
      payload.port = connectionForm.value.port || 3306
      payload.serverTime = connectionForm.value.serverTime || 'GMT+00:00'
    }
    
    const response = await $fetch('/api/reporting/connections', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: payload
    })
    
    if (response.success) {
      toast.add({
        title: 'Success',
        description: response.isExisting ? 'Connection already exists' : 'Connection created successfully',
        color: 'green'
      })
      showAddConnectionModal.value = false
      await loadDataConnections()
    }
  } catch (error) {
    console.error('Error saving connection:', error)
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to save connection',
      color: 'red'
    })
  } finally {
    isSavingConnection.value = false
  }
}

// Edit connection - redirect to integration wizard
const editConnection = (connection) => {
  navigateTo(`/integration-wizard?edit=${connection.id}`)
}

// Update licenses
const updateLicenses = async () => {
  try {
    isUpdating.value = true
    const toast = useToast()

    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }

    const response = await $fetch(`/api/organizations/${organizationId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: {
        licenses: parseInt(licensesForm.value.licenses)
      }
    })

    if (response.success) {
      organization.value = {...organization.value, ...response.organization}
      toast.add({
        title: 'Success',
        description: 'Licenses updated successfully',
        color: 'green'
      })
    } else {
      throw new Error(response.message || 'Failed to update licenses')
    }
  } catch (error) {
    console.error('Error updating licenses:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to update licenses. Please try again.',
      color: 'red'
    })
  } finally {
    isUpdating.value = false
  }
}

// Format date
const formatDate = (dateString, short = false) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'N/A'

  if (short) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Navigation
const goBack = () => {
  navigateTo('/organizations')
}

// Modal functions
const openAddUserModal = () => {
  userForm.value = {
    email: '',
    firstName: '',
    lastName: '',
    role: 'EDITOR'
  }
  showAddUserModal.value = true
}

const closeAddUserModal = () => {
  showAddUserModal.value = false
  userForm.value = {
    email: '',
    firstName: '',
    lastName: '',
    role: 'EDITOR'
  }
}

const openAddViewerModal = () => {
  viewerForm.value = {
    email: '',
    firstName: '',
    lastName: '',
    type: 'Viewer',
    group: ''
  }
  showAddViewerModal.value = true
}

const closeAddViewerModal = () => {
  showAddViewerModal.value = false
  viewerForm.value = {
    email: '',
    firstName: '',
    lastName: '',
    type: 'Viewer',
    group: ''
  }
}

// Add user function
const addUser = async () => {
  try {
    isAddingUser.value = true
    const toast = useToast()

    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }

    const response = await $fetch(`/api/organizations/${organizationId}/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: {
        email: userForm.value.email,
        firstName: userForm.value.firstName,
        lastName: userForm.value.lastName,
        role: userForm.value.role,
        sendInvitationEmail: userForm.value.sendInvitationEmail
      }
    })

    if (response.success) {
      // Reload organization details to get updated user list
      await loadOrganizationDetails()

      toast.add({
        title: 'Success',
        description: 'User added successfully',
        color: 'green'
      })

      closeAddUserModal()
    } else {
      throw new Error(response.error || 'Failed to add user')
    }
  } catch (error) {
    console.error('Error adding user:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to add user. Please try again.',
      color: 'red'
    })
  } finally {
    isAddingUser.value = false
  }
}

// Add viewer function
const addViewer = async () => {
  try {
    isAddingViewer.value = true
    const toast = useToast()

    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }

    const response = await $fetch(`/api/organizations/${organizationId}/viewers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: {
        email: viewerForm.value.email,
        firstName: viewerForm.value.firstName,
        lastName: viewerForm.value.lastName,
        type: viewerForm.value.type,
        group: viewerForm.value.group
      }
    })

    if (response.success) {
      // Reload organization details to get updated viewer list
      await loadOrganizationDetails()

      toast.add({
        title: 'Success',
        description: 'Viewer added successfully',
        color: 'green'
      })

      closeAddViewerModal()
    } else {
      throw new Error(response.error || 'Failed to add viewer')
    }
  } catch (error) {
    console.error('Error adding viewer:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to add viewer. Please try again.',
      color: 'red'
    })
  } finally {
    isAddingViewer.value = false
  }
}

// Delete user functions
const deleteUser = (profile) => {
  userToDelete.value = profile
  showDeleteUserModal.value = true
}

// Edit user function
const editUser = (profile) => {
  // Navigate to users page with edit modal or open inline edit
  navigateTo(`/users?edit=${profile.userId}`)
}

// Bulk delete users
const bulkDeleteUsers = async () => {
  if (selectedUsers.value.length === 0) return
  
  const toast = useToast()
  const confirmed = confirm(`Are you sure you want to delete ${selectedUsers.value.length} user(s)? This action cannot be undone.`)
  
  if (!confirmed) return
  
  try {
    isBulkDeleting.value = true
    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }
    
    let successCount = 0
    let errorCount = 0
    
    for (const userId of selectedUsers.value) {
      try {
        await $fetch(`/api/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        successCount++
      } catch (e) {
        errorCount++
      }
    }
    
    if (successCount > 0) {
      toast.add({
        title: 'Users Deleted',
        description: `Successfully deleted ${successCount} user(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        color: successCount === selectedUsers.value.length ? 'success' : 'warning'
      })
      await loadOrganizationDetails()
    }
    
    clearUserSelection()
  } catch (error) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to delete users',
      color: 'error'
    })
  } finally {
    isBulkDeleting.value = false
  }
}

const confirmDeleteUser = async () => {
  if (!userToDelete.value) return

  try {
    isDeletingUser.value = true
    deletingUserId.value = userToDelete.value.userId
    const toast = useToast()

    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }

    const response = await $fetch(`/api/users/${userToDelete.value.userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (response.success) {
      // Reload organization details to get updated user list
      await loadOrganizationDetails()

      toast.add({
        title: 'Success',
        description: 'User deleted successfully',
        color: 'green'
      })

      cancelDeleteUser()
    } else {
      throw new Error(response.error || 'Failed to delete user')
    }
  } catch (error) {
    console.error('Error deleting user:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to delete user. Please try again.',
      color: 'red'
    })
  } finally {
    isDeletingUser.value = false
    deletingUserId.value = null
  }
}

const cancelDeleteUser = () => {
  showDeleteUserModal.value = false
  userToDelete.value = null
}

// Delete viewer functions
const deleteViewer = (viewer) => {
  viewerToDelete.value = viewer
  showDeleteViewerModal.value = true
}

// Bulk delete viewers
const bulkDeleteViewers = async () => {
  if (selectedViewers.value.length === 0) return
  
  const toast = useToast()
  const confirmed = confirm(`Are you sure you want to delete ${selectedViewers.value.length} viewer(s)? This action cannot be undone.`)
  
  if (!confirmed) return
  
  try {
    isBulkDeleting.value = true
    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }
    
    let successCount = 0
    let errorCount = 0
    
    for (const userId of selectedViewers.value) {
      try {
        await $fetch(`/api/viewers/${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        successCount++
      } catch (e) {
        errorCount++
      }
    }
    
    if (successCount > 0) {
      toast.add({
        title: 'Viewers Deleted',
        description: `Successfully deleted ${successCount} viewer(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        color: successCount === selectedViewers.value.length ? 'success' : 'warning'
      })
      await loadOrganizationDetails()
    }
    
    clearViewerSelection()
  } catch (error) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to delete viewers',
      color: 'error'
    })
  } finally {
    isBulkDeleting.value = false
  }
}

const confirmDeleteViewer = async () => {
  if (!viewerToDelete.value) return

  try {
    isDeletingViewer.value = true
    deletingViewerId.value = viewerToDelete.value.userId
    const toast = useToast()

    const accessToken = await getAccessToken()
    if (!accessToken) {
      throw new Error('No access token available')
    }

    // Use the existing viewers API endpoint which handles both types
    const response = await $fetch(`/api/viewers/${viewerToDelete.value.userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (response.success) {
      // Reload organization details to get updated viewer list
      await loadOrganizationDetails()

      toast.add({
        title: 'Success',
        description: 'Viewer deleted successfully',
        color: 'green'
      })

      cancelDeleteViewer()
    } else {
      throw new Error(response.error || 'Failed to delete viewer')
    }
  } catch (error) {
    console.error('Error deleting viewer:', error)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to delete viewer. Please try again.',
      color: 'red'
    })
  } finally {
    isDeletingViewer.value = false
    deletingViewerId.value = null
  }
}

const cancelDeleteViewer = () => {
  showDeleteViewerModal.value = false
  viewerToDelete.value = null
}

// Load organization details on mount
onMounted(() => {
  loadOrganizationDetails()
  loadDataConnections()
})

// Page meta
definePageMeta({
  middleware: 'auth'
})
</script>

<style scoped>
/* Container query support for responsive cards */
.users-list-container {
  container-type: inline-size;
  container-name: users-list;
}

/* Hide date when container is narrow (< 350px) */
@container users-list (max-width: 350px) {
  .user-date {
    display: none;
  }
}

/* Also hide date on small container widths (350-450px) for better spacing */
@container users-list (min-width: 351px) and (max-width: 450px) {
  .user-date {
    display: none;
  }
}

/* Make checkboxes visible in dark mode */
:deep(.user-checkbox input) {
  border-color: #9ca3af !important; /* gray-400 */
}

.dark :deep(.user-checkbox input) {
  border-color: #6b7280 !important; /* gray-500 */
}
</style>

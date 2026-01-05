<template>
  <div class="p-4 lg:p-6">
    <div class="max-w-4xl mx-auto">
      <!-- Progress Steps -->
      <div class="flex items-center justify-center mb-6 lg:mb-8">
        <div class="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div 
            v-for="(step, index) in steps" 
            :key="step.step"
            class="flex items-center"
          >
            <div 
              class="w-8 h-8 rounded-full flex items-center justify-center"
              :class="getStepClasses(step)"
            >
              <Icon 
                v-if="step.completed"
                name="i-heroicons-check" 
                class="w-4 h-4" 
              />
              <span v-else>{{ step.step }}</span>
            </div>
            <span class="ml-2 text-xs sm:text-sm font-medium hidden sm:block">{{ step.label }}</span>
            <div 
              v-if="index < steps.length - 1" 
              class="w-8 h-px bg-gray-300 mx-2 sm:mx-4 hidden sm:block"
            />
          </div>
        </div>
      </div>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Please enter your data source credentials below</h2>
            <div class="flex flex-col gap-2">
              <!-- Show debug badges only when in debug mode -->
              <div v-if="debugMode" class="flex items-center gap-2">
                <UBadge color="warning" variant="soft" size="sm">
                  <Icon name="i-heroicons-bug-ant" class="w-3 h-3 mr-1"/>
                  Debug Mode
                </UBadge>
                <UBadge v-if="debugConfigLoaded" color="success" variant="soft" size="sm">
                  Auto-filled
                </UBadge>
              </div>

              <!-- Connection Examples Dropdown - Superadmin only -->
              <div v-if="isSuperAdmin && connectionExamples.length > 0" class="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quick Fill a demo connection:
                </label>
                <div class="flex gap-2">
                  <USelect
                    v-model="selectedExample"
                    :items="connectionExamples.map(ex => ({ label: ex.description, value: ex.filename }))"
                    placeholder="Select a connection example..."
                    :loading="loadingExamples"
                    @update:model-value="loadConnectionExample"
                    class="flex-1"
                  />
                  <UButton
                    v-if="selectedExample"
                    variant="outline"
                    size="sm"
                    @click="clearFormToDefaults"
                    color="gray"
                  >
                    Clear
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </template>
        
        <div class="space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Left Column - Form Fields -->
            <div class="space-y-4">
              <UFormField label="Internal Name" required class="text-gray-900 dark:text-white">
                <UInput
                    id="input-internal-name"
                  v-model="form.internalName"
                  :error="errors.internalName"
                  class="w-full"
                  @focus="focusedField = 'internalName'"
                />
              </UFormField>

              <UFormField label="Database Name" required class="text-gray-900 dark:text-white">
                <UInput
                    id="input-database-name"
                  v-model="form.databaseName"
                  :error="errors.databaseName"
                    class="w-full"
                    @focus="focusedField = 'databaseName'"
                />
              </UFormField>

              <UFormField label="Database Type" required class="text-gray-900 dark:text-white">
                <USelect
                    id="input-database-type"
                  v-model="form.databaseType"
                  :items="databaseTypes"
                  placeholder="Select Database Type"
                  :error="errors.databaseType"
                  class="w-full"
                  @focus="focusedField = 'databaseType'"
                />
              </UFormField>

              <UFormField label="Host / IP" required class="text-gray-900 dark:text-white">
                <UInput
                    id="input-host"
                  v-model="form.host"
                  :error="errors.host"
                    class="w-full"
                    @focus="focusedField = 'host'"
                />
              </UFormField>

              <UFormField label="Username" required class="text-gray-900 dark:text-white">
                <UInput
                    id="input-username"
                  v-model="form.username"
                  :error="errors.username"
                    class="w-full"
                    @focus="focusedField = 'username'"
                />
              </UFormField>

              <UFormField label="Password" required class="text-gray-900 dark:text-white">
                <UInput
                    id="input-password"
                    type="password"
                  v-model="form.password"
                  :error="errors.password"
                    class="w-full"
                    @focus="focusedField = 'password'"
                />
              </UFormField>

              <UFormField label="Database Port" required class="text-gray-900 dark:text-white">
                <UInput
                    id="input-port"
                  v-model="form.port"
                  :error="errors.port"
                    class="w-full"
                    @focus="focusedField = 'port'"
                />
              </UFormField>

              <UFormField label="Server Time" required class="text-gray-900 dark:text-white">
                <USelect
                  v-model="form.serverTime"
                  :items="timeZones"
                  placeholder="Select Time Zone"
                  :error="errors.serverTime"
                  class="w-full"
                  @focus="focusedField = 'serverTime'"
                />
              </UFormField>
            </div>

            <!-- Right Column - Info and SSH -->
            <div class="space-y-4">
              <UAlert 
                color="orange" 
                variant="soft"
                title="Information"
                :description="currentHint"
              />

              <!-- SSH Tunneling Section -->
              <div class="space-y-4">
                <div
                    class="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md -m-2"
                    @click="form.useSshTunneling = !form.useSshTunneling; focusedField = 'sshTunneling'"
                >
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Use SSH Tunneling</h3>
                  <USwitch 
                    v-model="form.useSshTunneling"
                    color="primary"
                    class="ring-1 ring-gray-300 dark:ring-gray-600 rounded-full"
                    @click.stop
                  />
                </div>

                <UFormField label="Authentication Method" v-if="form.useSshTunneling" class="text-gray-900 dark:text-white">
                  <URadioGroup
                      v-model="form.sshAuthMethod"
                      :items="sshAuthMethods"
                      orientation="horizontal"
                  />
                </UFormField>

                <div v-if="form.useSshTunneling" class="space-y-3">
                  <UFormField label="SSH Port" class="text-gray-900 dark:text-white">
                    <UInput
                        id="input-ssh-port"
                      v-model="form.sshPort"
                        class="w-full"
                        @focus="focusedField = 'sshPort'"
                    />
                  </UFormField>

                  <UFormField label="SSH User" class="text-gray-900 dark:text-white">
                    <UInput
                        id="input-ssh-user"
                      v-model="form.sshUser"
                        class="w-full"
                        @focus="focusedField = 'sshUser'"
                    />
                  </UFormField>

                  <UFormField label="SSH Host" class="text-gray-900 dark:text-white">
                    <UInput
                        id="input-ssh-host"
                      v-model="form.sshHost"
                        class="w-full"
                        @focus="focusedField = 'sshHost'"
                    />
                  </UFormField>

                  <UFormField label="SSH Password" v-if="form.sshAuthMethod === 'password'" class="text-gray-900 dark:text-white">
                    <UInput
                        id="input-ssh-password"
                        type="password"
                      v-model="form.sshPassword"
                        class="w-full"
                        @focus="focusedField = 'sshPassword'"
                    />
                  </UFormField>

                  <UFormField label="SSH Private Key" v-if="form.sshAuthMethod === 'public-key'" class="text-gray-900 dark:text-white">
                    <UTextarea
                        id="input-ssh-private-key"
                      v-model="form.sshPrivateKey"
                      :rows="8"
                      class="w-full font-mono text-xs"
                      @focus="focusedField = 'sshPrivateKey'"
                    />
                    <template #help>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Paste your SSH private key here. Make sure to include the BEGIN and END lines.
                      </p>
                    </template>
                  </UFormField>
                </div>
              </div>

            </div>
          </div>

          <!-- Error Summary -->
          <div v-if="showErrors && validationErrors.length > 0" class="mt-4">
            <div class="bg-red-50 border border-red-200 rounded-md p-4">
              <div class="flex">
                <Icon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400 mr-2 mt-0.5"/>
                <div>
                  <h4 class="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</h4>
                  <ul class="text-sm text-red-700 list-disc list-inside">
                    <li v-for="error in validationErrors" :key="error">{{ error }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Connection Test Result -->
          <div v-if="connectionTestResult" class="mt-4">
            <div 
              :class="[
                'border rounded-md p-4',
                connectionTestResult.success 
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              ]"
            >
              <div class="flex">
                <Icon
                    :name="connectionTestResult.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                  :class="[
                    'w-5 h-5 mr-2 mt-0.5',
                    connectionTestResult.success ? 'text-green-400' : 'text-red-400'
                  ]" 
                />
                <div>
                  <h4 
                    :class="[
                      'text-sm font-medium mb-1',
                      connectionTestResult.success ? 'text-green-800 dark:text-white' : 'text-red-800'
                    ]"
                  >
                    {{ connectionTestResult.success ? 'Connection Successful' : 'Connection Failed' }}
                  </h4>
                  <p 
                    :class="[
                      'text-sm',
                      connectionTestResult.success ? 'text-green-700 dark:text-white' : 'text-red-700'
                    ]"
                  >
                    {{ connectionTestResult.message }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Data Transfer Configuration (shown for saved connections) -->
          <div v-if="createdConnectionId" class="mt-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              <Icon name="i-heroicons-arrow-path" class="w-5 h-5 inline mr-2"/>
              Data Transfer Options
            </h3>
            <DataTransferPanel
                :connection-id="createdConnectionId"
                :initial-storage-location="form.storageLocation"
                @storage-changed="handleStorageChange"
                @schedule-saved="handleScheduleSaved"
            />
          </div>


          <!-- Navigation Buttons -->
          <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
            <UButton variant="outline" @click="goBack" class="w-full sm:w-auto">
              Back
            </UButton>
            <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <UButton
                @click="testConnection"
                :loading="isTestingConnection"
                :disabled="isTestingConnection"
                variant="outline"
                color="gray"
                class="w-full sm:w-auto hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <Icon name="i-heroicons-play" class="w-4 h-4 mr-2"/>
                Test Connection
              </UButton>
              <UButton
                v-if="!createdConnectionId"
                @click="nextStep"
                :disabled="!connectionTestResult?.success || saving"
                :loading="saving"
                class="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white cursor-pointer"
                color="green"
              >
                {{ saving ? 'Analyzing...' : 'Save and continue setup' }}
              </UButton>
              <UButton
                v-else
                @click="finishWizard"
                class="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white cursor-pointer"
                color="green"
              >
                Select Tables & Fields
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup>
import DataTransferPanel from '~/components/DataTransferPanel.vue'

const steps = ref([
  { step: 1, label: 'Integration', active: true, completed: false },
  { step: 2, label: 'Data Schema', active: false, completed: false },
  { step: 3, label: 'References', active: false, completed: false },
  { step: 4, label: 'Data Transfer', active: false, completed: false }
])

const form = ref({
  internalName: '',
  databaseName: '',
  databaseType: '',
  host: '',
  username: '',
  password: '',
  port: '',
  jdbcParams: '',
  serverTime: '',
  useSshTunneling: false,
  sshAuthMethod: 'password',
  sshPort: '',
  sshUser: '',
  sshHost: '',
  sshPassword: '',
  sshPrivateKey: '',
  storageLocation: 'remote'
})

// Context-sensitive form hints (collected from admin.optiqo.report)
const focusedField = ref('internalName')

const fieldHints = {
  internalName: 'Please give us a name how we should label your database internally. This label will only appear in our tool and helps you to distinguish between different data sources.',
  databaseName: 'Please type in the actual name of your database.',
  databaseType: 'Select the type of database you are connecting to.',
  host: 'Please give us the IP address or domain name of your database server. If your database is operating behind a firewall, please make sure to whitelist the IP of this instance.',
  username: 'Please create a user in your database and give us the credentials. The user should only have READ permissions and for analytical purposes be allowed to create temporary tables. Of course, you also can give us an existing user account.',
  password: 'Please type in the password corresponding to the username provided to us.',
  port: 'Database port is optional. Unless it is provided, we will use default port depending on your database type.',
  serverTime: 'The timezone that your database server is configured with.',
  sshTunneling: 'If secure connection is required or database is only accessible from private network, Secure SSH tunneling has to be used.',
  sshPort: 'Port value of your server. This value is by default 22 for most SSH enabled servers.',
  sshUser: 'We highly recommend you to provide a user that has limited privileges and is able to connect to your database server.',
  sshHost: 'Physical address of your remote server.',
  sshPassword: 'Using our provided public key is recommended. Alternatively, you can also provide us a password that is used for SSH connection instead of public key.',
  sshPrivateKey: 'Paste your SSH private key here. Make sure to include the BEGIN and END lines.'
}

const currentHint = computed(() => {
  return fieldHints[focusedField.value] || fieldHints.internalName
})

// Debug mode auto-fill
const debugMode = ref(false)
const debugConfigLoaded = ref(false)
const connectionExamples = ref([])
const loadingExamples = ref(false)
const selectedExample = ref('')

// Check if user is superadmin
const {userProfile} = useAuth()
const isSuperAdmin = computed(() => userProfile.value?.role === 'SUPERADMIN')

const errors = ref({})
const showErrors = ref(false)
const validationErrors = ref([])
const isTestingConnection = ref(false)
const connectionTestResult = ref(null)
const saving = ref(false)

const databaseTypes = [
  { label: 'MySQL', value: 'mysql' }
]

const sshAuthMethods = [
  { label: 'Public Key', value: 'public-key' },
  { label: 'Password', value: 'password' }
]

const storageOptions = [
  { label: 'No data storage (connect remotely)', value: 'remote' },
  { label: 'Transfer data to internal Data Warehouse', value: 'warehouse' }
]

const timeZones = [
  { label: 'GMT +02:00 - Europe/Berlin', value: 'GMT+02:00' },
  { label: 'GMT +01:00 - Europe/London', value: 'GMT+01:00' },
  { label: 'GMT +00:00 - UTC', value: 'GMT+00:00' },
  { label: 'GMT -05:00 - America/New_York', value: 'GMT-05:00' },
  { label: 'GMT -08:00 - America/Los_Angeles', value: 'GMT-08:00' }
]

// Load debug configuration and auto-fill form
const loadDebugConfiguration = async () => {
  try {
    const config = useRuntimeConfig()
    const isDebugEnabled = config.public.debugEnv && config.public.debugEnv.toLowerCase() === 'true'

    if (!isDebugEnabled) {
      return
    }

    const response = await $fetch('/api/debug/config')

    if (response.enabled && response.config) {
      debugMode.value = true
      debugConfigLoaded.value = true

      // Auto-fill form with debug configuration
      form.value = {
        ...form.value,
        ...response.config
      }

      console.log('✅ Debug configuration loaded and form auto-filled')
    } else if (response.enabled) {
      debugMode.value = true
      console.log('⚠️ Debug mode enabled but no configuration found')
    }
  } catch (error) {
    console.log('Debug configuration not available:', error?.data?.message || error?.message)
  }
}

// Load connection examples for superadmins only (server checks role)
const loadConnectionExamples = async () => {
  try {
    loadingExamples.value = true
    const response = await $fetch('/api/debug/connection-examples')

    if (response.success) {
      connectionExamples.value = response.examples
    }
  } catch (error) {
    // Silently fail - superadmin check on server will return 403 for non-superadmins
    connectionExamples.value = []
  } finally {
    loadingExamples.value = false
  }
}

// Load specific connection example and populate form
const loadConnectionExample = async (filename) => {
  if (!filename) {
    // Clear form and reset to defaults
    clearFormToDefaults()
    return
  }

  try {
    const response = await $fetch('/api/debug/connection-example', {
      params: { filename }
    })

    if (response.success) {
      // Clean up the config (remove null values and convert types)
      const cleanConfig = { ...response.config }

      // Handle null values for optional fields
      if (cleanConfig.sshAuthMethod === null) cleanConfig.sshAuthMethod = 'password'
      if (cleanConfig.sshPort === null) cleanConfig.sshPort = '22'
      if (cleanConfig.sshUser === null) cleanConfig.sshUser = ''
      if (cleanConfig.sshHost === null) cleanConfig.sshHost = ''
      if (cleanConfig.sshPassword === null) cleanConfig.sshPassword = ''
      if (cleanConfig.sshPrivateKey === null) cleanConfig.sshPrivateKey = ''

      // Ensure port is a string
      if (typeof cleanConfig.port === 'number') cleanConfig.port = String(cleanConfig.port)
      if (typeof cleanConfig.sshPort === 'number') cleanConfig.sshPort = String(cleanConfig.sshPort)

      // Populate form with connection config
      form.value = {
        ...form.value,
        ...cleanConfig
      }

      selectedExample.value = filename
      debugConfigLoaded.value = true

      console.log(`✅ Form populated with ${filename} configuration`)
    } else {
      console.error('❌ Failed to load connection example:', response.message)
    }
  } catch (error) {
    console.error('❌ Error loading connection example:', error?.data?.message || error?.message)
  }
}

// Clear form back to default values
const clearFormToDefaults = () => {
  form.value = {
    internalName: '',
    databaseName: '',
    databaseType: 'mysql',
    host: '',
    username: '',
    password: '',
    port: '3306',
    jdbcParams: '',
    serverTime: 'GMT+02:00',
    useSshTunneling: false,
    sshAuthMethod: 'password',
    sshPort: '22',
    sshUser: '',
    sshHost: '',
    sshPassword: '',
    sshPrivateKey: '',
    storageLocation: 'remote'
  }

  selectedExample.value = ''
  debugConfigLoaded.value = false

  console.log('✅ Form cleared to default values')
}

// Watch for user profile to load, then load examples if superadmin
watch(userProfile, (profile) => {
  if (profile?.role === 'SUPERADMIN') {
    loadConnectionExamples()
  }
}, {immediate: true})

// Prefill when editing
onMounted(() => {
  try {
    const url = new URL(window.location.href)
    const editId = url.searchParams.get('id')
    if (editId) prefillFromConnection(Number(editId))
  } catch {}
})

const getStepClasses = (step) => {
  if (step.active) {
    return 'bg-blue-600 text-white'
  } else if (step.completed) {
    return 'bg-orange-600 text-white'
  } else {
    return 'bg-gray-300 text-gray-600'
  }
}

const validateForm = async () => {
  errors.value = {}
  validationErrors.value = []

  // Required field validation
  if (!form.value.internalName.trim()) {
    errors.value.internalName = 'Internal name is required'
    validationErrors.value.push('Internal name is required')
  } else {
    // Check for duplicate connection names
    try {
      const existingConnections = await $fetch('/api/reporting/connections')
      const duplicateConnection = existingConnections.find(c =>
          c.internal_name?.toLowerCase() === form.value.internalName.trim().toLowerCase() &&
          c.id !== createdConnectionId.value // Exclude current connection when editing
      )

      if (duplicateConnection) {
        errors.value.internalName = 'A connection with this name already exists'
        validationErrors.value.push(`Connection "${form.value.internalName.trim()}" already exists. Please choose a different name.`)
      }
    } catch (error) {
      console.warn('[FRONTEND_AUTO_JOIN] Could not check for duplicate connections:', error)
      // Continue validation even if we can't check duplicates
    }
  }

  if (!form.value.databaseName.trim()) {
    errors.value.databaseName = 'Database name is required'
    validationErrors.value.push('Database name is required')
  }

  if (!form.value.databaseType) {
    errors.value.databaseType = 'Database type is required'
    validationErrors.value.push('Database type is required')
  }

  if (!form.value.host.trim()) {
    errors.value.host = 'Host/IP is required'
    validationErrors.value.push('Host/IP is required')
  }

  if (!form.value.username.trim()) {
    errors.value.username = 'Username is required'
    validationErrors.value.push('Username is required')
  }

  if (!form.value.password.trim()) {
    errors.value.password = 'Password is required'
    validationErrors.value.push('Password is required')
  }

  if (!form.value.port.trim()) {
    errors.value.port = 'Port is required'
    validationErrors.value.push('Port is required')
  } else if (!/^\d+$/.test(form.value.port)) {
    errors.value.port = 'Port must be a number'
    validationErrors.value.push('Port must be a number')
  }

  if (!form.value.serverTime) {
    errors.value.serverTime = 'Server time is required'
    validationErrors.value.push('Server time is required')
  }

  // SSH validation (only if SSH tunneling is enabled)
  if (form.value.useSshTunneling) {
    if (!form.value.sshPort.trim()) {
      validationErrors.value.push('SSH port is required when using SSH tunneling')
    } else if (!/^\d+$/.test(form.value.sshPort)) {
      validationErrors.value.push('SSH port must be a number')
    }

    if (!form.value.sshUser.trim()) {
      validationErrors.value.push('SSH user is required when using SSH tunneling')
    }

    if (!form.value.sshHost.trim()) {
      validationErrors.value.push('SSH host is required when using SSH tunneling')
    }

    if (form.value.sshAuthMethod === 'password' && !form.value.sshPassword.trim()) {
      validationErrors.value.push('SSH password is required when using password authentication')
    }

    if (form.value.sshAuthMethod === 'public-key' && !form.value.sshPrivateKey.trim()) {
      validationErrors.value.push('SSH private key is required when using public key authentication')
    }

    // Basic SSH private key format validation
    if (form.value.sshAuthMethod === 'public-key' && form.value.sshPrivateKey.trim()) {
      const keyContent = form.value.sshPrivateKey.trim()
      if (!keyContent.includes('BEGIN') || !keyContent.includes('END')) {
        validationErrors.value.push('SSH private key must include BEGIN and END markers')
      }
    }
  }

  return validationErrors.value.length === 0
}

const testConnection = async () => {
  // Clear previous results
  connectionTestResult.value = null
  
  // Validate form first
  if (!(await validateForm())) {
    showErrors.value = true
    return
  }

  isTestingConnection.value = true
  showErrors.value = false

  try {
    // Get access token for API call
    const supabase = useSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('No access token available')
    }

    // Call the real connection test API
    const response = await $fetch('/api/connections/test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: {
        host: form.value.host,
        port: form.value.port,
        username: form.value.username,
        password: form.value.password,
        database: form.value.databaseName,
        jdbcParams: form.value.jdbcParams,
        useSshTunneling: form.value.useSshTunneling,
        // Include connectionId when editing so backend can fetch real credentials if masked
        connectionId: createdConnectionId.value || undefined,
        sshConfig: form.value.useSshTunneling ? {
          port: form.value.sshPort,
          user: form.value.sshUser,
          host: form.value.sshHost,
          password: form.value.sshPassword,
          privateKey: form.value.sshPrivateKey,
          authMethod: form.value.sshAuthMethod
        } : {}
      }
    })

    connectionTestResult.value = {
      success: response.success,
      message: response.message,
      error: response.error,
      details: response.details
    }

    if (response.success) {
      // Mark integration step as completed
      steps.value[0].completed = true
      steps.value[1].active = true
    }
  } catch (error) {
    console.error('Connection test error:', error)
    
    let errorMessage = 'An error occurred while testing the connection. Please try again.'
    
    if (error?.message?.includes('No access token')) {
      errorMessage = 'Authentication required. Please log in again.'
    } else if (error?.data?.message) {
      errorMessage = error.data.message
    } else if (error?.message) {
      errorMessage = error.message
    }
    
    connectionTestResult.value = {
      success: false,
      message: errorMessage,
      error: error?.data?.error || 'UNKNOWN_ERROR'
    }
  } finally {
    isTestingConnection.value = false
  }
}
async function prefillFromConnection(id) {
  try {
    const conn = await $fetch('/api/reporting/connection', { params: { id } })
    if (conn) {
      form.value.internalName = conn.internal_name || ''
      form.value.databaseName = conn.database_name || ''
      form.value.databaseType = conn.database_type || 'mysql'
      form.value.host = conn.host || ''
      form.value.username = conn.username || ''
      form.value.password = conn.password || ''
      form.value.port = String(conn.port || '3306')
      form.value.jdbcParams = conn.jdbc_params || ''
      form.value.serverTime = conn.server_time || form.value.serverTime
      form.value.useSshTunneling = !!conn.use_ssh_tunneling
      form.value.sshAuthMethod = conn.ssh_auth_method || form.value.sshAuthMethod
      form.value.sshPort = String(conn.ssh_port || '22')
      form.value.sshUser = conn.ssh_user || ''
      form.value.sshHost = conn.ssh_host || ''
      form.value.sshPassword = conn.ssh_password || ''
      form.value.sshPrivateKey = conn.ssh_private_key || ''
      form.value.storageLocation = conn.storage_location || 'remote'
      createdConnectionId.value = id
    }
  } catch (e) {
    console.error('Failed to prefill connection', e)
  }
}

const goBack = () => {
  navigateTo('/data-sources')
}

const nextStep = async () => {
  if (!connectionTestResult.value?.success) {
    showErrors.value = true
    validationErrors.value = ['Please test the connection successfully before proceeding']
    return
  }

  // Validate form before creating connection
  if (!(await validateForm())) {
    showErrors.value = true
    return
  }

  saving.value = true
  try {
    const payload = {
      internalName: form.value.internalName,
      databaseName: form.value.databaseName,
      databaseType: form.value.databaseType,
      host: form.value.host,
      username: form.value.username,
      password: form.value.password,
      port: form.value.port,
      jdbcParams: form.value.jdbcParams,
      serverTime: form.value.serverTime,
      useSshTunneling: form.value.useSshTunneling,
      storageLocation: form.value.storageLocation
    }
    if (form.value.useSshTunneling) {
      payload.sshAuthMethod = form.value.sshAuthMethod
      payload.sshPort = form.value.sshPort
      payload.sshUser = form.value.sshUser
      payload.sshHost = form.value.sshHost
      payload.sshPassword = form.value.sshPassword
      payload.sshPrivateKey = form.value.sshPrivateKey
    }

    console.log('[FRONTEND_AUTO_JOIN] Creating new connection:', {
      internalName: payload.internalName,
      databaseName: payload.databaseName,
      host: payload.host,
      port: payload.port,
      hasSchema: !!payload.schema,
      schemaTableCount: payload.schema?.tables?.length || 0
    })

    const response = await $fetch('/api/reporting/connections', {
      method: 'POST',
      body: payload
    })

    console.log('[FRONTEND_AUTO_JOIN] Connection creation response:', response)

    if (response.isExisting) {
      if (response.configMatches) {
        console.log('[FRONTEND_AUTO_JOIN] Using existing connection with same configuration')
        // Show info message but continue with the existing connection
        validationErrors.value.push(`Connection "${payload.internalName}" already exists with the same configuration. Using existing connection.`)
        showErrors.value = true
      } else {
        console.log('[FRONTEND_AUTO_JOIN] Updated existing connection with new configuration')
        // Show warning message about updating existing connection
        validationErrors.value.push(`Connection name "${payload.internalName}" already exists. Updated with new database configuration.`)
        showErrors.value = true
      }
    }

    // Keep user in wizard and move to Schema step
    if (response.id) {
      console.log('[FRONTEND_AUTO_JOIN] Connection created/updated successfully, navigating to schema editor:', response.id)
      createdConnectionId.value = response.id
      steps.value[1].active = true
      steps.value[0].completed = true
      // Move to dedicated schema editor page
      navigateTo(`/schema-editor?id=${response.id}`)
      return
    }
  } catch (e) {
    console.error('Failed to save connection', e)
    showErrors.value = true
    validationErrors.value = ['Failed to save connection. Please try again.']
  } finally {
    saving.value = false
  }
}


const createdConnectionId = ref(null)

async function finishWizard() {
  if (!createdConnectionId.value) return
  navigateTo(`/schema-editor?id=${createdConnectionId.value}`)
}

// Handler for storage location changes from DataTransferPanel
async function handleStorageChange(storageLocation) {
  if (!createdConnectionId.value) return

  try {
    await $fetch('/api/reporting/connections', {
      method: 'PUT',
      params: {id: createdConnectionId.value},
      body: {storage_location: storageLocation}
    })
    form.value.storageLocation = storageLocation
    console.log(`Storage location updated to: ${storageLocation}`)
  } catch (error) {
    console.error('Failed to update storage location:', error)
  }
}

// Handler for when sync schedule is saved
function handleScheduleSaved() {
  console.log('Sync schedule saved successfully')
  // Mark Data Transfer step as completed
  steps.value[3].completed = true
}

</script>

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
                name="heroicons:check" 
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
          <h2 class="text-lg sm:text-xl font-semibold">Please enter your data source credentials below</h2>
        </template>
        
        <div class="space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Left Column - Form Fields -->
            <div class="space-y-4">
              <UFormGroup label="Internal Name">
                <UInput placeholder="insta800.net" v-model="form.internalName" />
              </UFormGroup>
              
              <UFormGroup label="Database Name">
                <UInput placeholder="datapine_insider" v-model="form.databaseName" />
              </UFormGroup>
              
              <UFormGroup label="Database Type">
                <USelect 
                  v-model="form.databaseType"
                  :options="databaseTypes"
                  placeholder="MemSQL"
                />
              </UFormGroup>
              
              <UFormGroup label="Host / IP">
                <UInput placeholder="reporting.insta800.net" v-model="form.host" />
              </UFormGroup>
              
              <UFormGroup label="Username">
                <UInput placeholder="insta800" v-model="form.username" />
              </UFormGroup>
              
              <UFormGroup label="Password">
                <UInput 
                  type="password" 
                  placeholder="Enter Password" 
                  v-model="form.password"
                />
              </UFormGroup>
            </div>

            <!-- Right Column - Info and SSH -->
            <div class="space-y-4">
              <UAlert 
                color="orange" 
                variant="soft"
                title="Information"
                description="Please give us a name how we should label your database internally. This label will only appear in our tool and helps you to distinguish between different data sources."
              />

              <UFormGroup label="Use SSH Tunneling">
                <URadioGroup v-model="form.sshType" :options="sshTypes" />
              </UFormGroup>

              <div class="space-y-3">
                <UFormGroup label="SSH Port">
                  <UInput placeholder="0" v-model="form.sshPort" />
                </UFormGroup>
                
                <UFormGroup label="SSH User">
                  <UInput placeholder="Enter SSH User Name" v-model="form.sshUser" />
                </UFormGroup>
                
                <UFormGroup label="SSH Host">
                  <UInput placeholder="Enter SSH Host Address" v-model="form.sshHost" />
                </UFormGroup>
                
                <UFormGroup label="SSH Password">
                  <UInput 
                    type="password" 
                    placeholder="Enter SSH Password" 
                    v-model="form.sshPassword"
                  />
                </UFormGroup>
              </div>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
            <UButton variant="outline" @click="goBack" class="w-full sm:w-auto">
              Back
            </UButton>
            <UButton @click="nextStep" class="w-full sm:w-auto" color="green">
              Next Step
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup>
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
  sshType: 'password',
  sshPort: '',
  sshUser: '',
  sshHost: '',
  sshPassword: ''
})

const databaseTypes = [
  { label: 'MemSQL', value: 'memsql' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgresql' }
]

const sshTypes = [
  { label: 'Public Key', value: 'public-key' },
  { label: 'Password', value: 'password' }
]

const getStepClasses = (step) => {
  if (step.active) {
    return 'bg-blue-600 text-white'
  } else if (step.completed) {
    return 'bg-orange-600 text-white'
  } else {
    return 'bg-gray-300 text-gray-600'
  }
}

const goBack = () => {
  navigateTo('/data-sources')
}

const nextStep = () => {
  // Handle next step logic
  console.log('Next step clicked')
}
</script>

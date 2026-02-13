<template>
  <div>
    <!-- Color Scheme for theme management -->
    <ColorScheme/>

    <div class="flex h-screen bg-gray-50">
      <!-- Main Content (no sidebar, no footer) -->
      <div class="flex-1 flex flex-col lg:ml-0 min-w-0">
        <!-- Top Bar -->
        <TopBar />

        <!-- Page Content -->
        <main class="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          <slot/>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Dashboard layout - no sidebar, no footer
// Used for dashboard view and edit pages to maximize screen real estate
</script>

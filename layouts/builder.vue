<template>
  <div>
    <!-- Color Scheme for theme management -->
    <ColorScheme/>

    <div class="flex h-screen bg-gray-50">
      <!-- Main Content (no sidebar) -->
      <div class="flex-1 flex flex-col lg:ml-0">
        <!-- Top Bar -->
        <TopBar />

        <!-- Page Content -->
        <main class="flex-1 overflow-auto">
          <slot/>
        </main>

        <!-- Footer -->
        <footer class="bg-neutral-800 border-t border-neutral-600 dark:border-[rgb(64,64,64)] px-4 lg:px-6 py-3 lg:py-4">
          <div class="flex items-center justify-center gap-2">
            <img
                src="/images/qtransparent.png"
                alt="Q"
                class="h-4 lg:h-6 w-auto opacity-60"
            />
            <span class="text-sm" style="color: rgb(156 99 39);">
            © {{ currentYear }} Optiqo. All rights reserved
          </span>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Current year for copyright
const currentYear = computed(() => new Date().getFullYear())
</script>

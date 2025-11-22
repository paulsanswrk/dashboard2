<template>
  <div>
    <!-- Color Scheme for theme management -->
    <ColorScheme/>

    <!-- Page Content - no global chrome -->
    <slot/>
  </div>
</template>

<script setup lang="ts">
// Empty layout - provides only essential global components
// No sidebar, top bar, footer, or navigation
</script>

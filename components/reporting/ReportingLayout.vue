<template>
  <div class="h-full grid grid-cols-12">
    <aside class="col-span-3 border-r bg-dark overflow-auto">
      <slot name="left" />
    </aside>
    <main class="col-span-6 overflow-auto">
      <slot name="center" />
    </main>
    <aside class="col-span-3 border-l bg-white overflow-auto">
      <slot name="right" />
    </aside>
  </div>
</template>

<script setup lang="ts">
// Basic 3-panel layout for the reporting builder
</script>

<style scoped>
html, body, :host { height: 100%; }
</style>



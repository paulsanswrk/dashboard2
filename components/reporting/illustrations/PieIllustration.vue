<template>
  <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Pie chart -->
    <g transform="translate(100, 80)">
      <!-- Slice 1 - 40% -->
      <path d="M 0 0 L 0 -60 A 60 60 0 0 1 57 18 Z" fill="#3B82F6"/>
      <!-- Slice 2 - 30% -->
      <path d="M 0 0 L 57 18 A 60 60 0 0 1 -35 49 Z" fill="#10B981"/>
      <!-- Slice 3 - 20% -->
      <path d="M 0 0 L -35 49 A 60 60 0 0 1 -57 -18 Z" fill="#F59E0B"/>
      <!-- Slice 4 - 10% -->
      <path d="M 0 0 L -57 -18 A 60 60 0 0 1 0 -60 Z" fill="#EF4444"/>
    </g>

    <!-- Labels -->
    <text x="100" y="155" text-anchor="middle" class="label">Divide by Category</text>
  </svg>
</template>

<style scoped>
.label {
  font-size: 11px;
  fill: #6B7280;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

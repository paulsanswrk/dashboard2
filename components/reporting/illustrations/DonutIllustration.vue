<template>
  <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Donut chart with center hole -->
    <g transform="translate(100, 75)">
      <!-- Outer ring slices -->
      <!-- Slice 1 - 40% -->
      <path d="M 0 -55 A 55 55 0 0 1 52 17 L 31 10 A 32 32 0 0 0 0 -32 Z" fill="#3B82F6"/>
      <!-- Slice 2 - 30% -->
      <path d="M 52 17 A 55 55 0 0 1 -32 45 L -19 26 A 32 32 0 0 0 31 10 Z" fill="#10B981"/>
      <!-- Slice 3 - 20% -->
      <path d="M -32 45 A 55 55 0 0 1 -52 -17 L -31 -10 A 32 32 0 0 0 -19 26 Z" fill="#F59E0B"/>
      <!-- Slice 4 - 10% -->
      <path d="M -52 -17 A 55 55 0 0 1 0 -55 L 0 -32 A 32 32 0 0 0 -31 -10 Z" fill="#EF4444"/>

      <!-- Center circle (creates the donut hole) -->
      <circle cx="0" cy="0" r="28" fill="white" class="center-fill"/>

      <!-- Center text -->
      <text x="0" y="5" text-anchor="middle" class="center-value">75%</text>
    </g>

    <!-- Label -->
    <text x="100" y="150" text-anchor="middle" class="label">Total Proportion</text>
  </svg>
</template>

<style scoped>
.center-fill {
  fill: white;
}

:global(.dark) .center-fill {
  fill: #1f2937;
}

.center-value {
  font-size: 16px;
  font-weight: 700;
  fill: #1F2937;
  font-family: system-ui, -apple-system, sans-serif;
}

:global(.dark) .center-value {
  fill: #E5E7EB;
}

.label {
  font-size: 11px;
  fill: #6B7280;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

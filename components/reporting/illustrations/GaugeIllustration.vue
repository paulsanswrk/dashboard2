<template>
  <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Gauge arc background -->
    <g transform="translate(100, 100)">
      <path d="M -70 0 A 70 70 0 0 1 70 0" stroke="#E5E7EB" stroke-width="16" fill="none" stroke-linecap="round"/>

      <!-- Gauge arc fill (75%) -->
      <path d="M -70 0 A 70 70 0 0 1 49.5 -49.5" stroke="#3B82F6" stroke-width="16" fill="none" stroke-linecap="round"/>

      <!-- Center value -->
      <text x="0" y="-10" text-anchor="middle" class="gauge-value">75%</text>

      <!-- Needle -->
      <line x1="0" y1="0" x2="35" y2="-35" stroke="#1F2937" stroke-width="3" stroke-linecap="round"/>
      <circle cx="0" cy="0" r="6" fill="#1F2937"/>
    </g>

    <!-- Labels -->
    <text x="30" y="105" class="range-label">0</text>
    <text x="170" y="105" class="range-label">100</text>
    <text x="100" y="145" text-anchor="middle" class="label">Measure → Target</text>
  </svg>
</template>

<style scoped>
.gauge-value {
  font-size: 24px;
  font-weight: 700;
  fill: #1F2937;
  font-family: system-ui, -apple-system, sans-serif;
}

.range-label {
  font-size: 10px;
  fill: #9CA3AF;
  font-family: system-ui, -apple-system, sans-serif;
}

.label {
  font-size: 11px;
  fill: #6B7280;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

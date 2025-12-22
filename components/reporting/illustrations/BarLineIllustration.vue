<template>
  <svg width="280" height="160" viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Axes -->
    <line x1="40" y1="120" x2="260" y2="120" stroke="#9CA3AF" stroke-width="2"/>
    <line x1="40" y1="20" x2="40" y2="120" stroke="#9CA3AF" stroke-width="2"/>

    <!-- Y-axis label -->
    <text x="15" y="70" text-anchor="middle" class="axis-label" transform="rotate(-90, 15, 70)">Y-AXIS</text>

    <!-- X-axis label -->
    <text x="150" y="145" text-anchor="middle" class="axis-label">X-AXIS</text>

    <!-- Bars -->
    <rect x="60" y="60" width="30" height="60" rx="2" fill="#3B82F6"/>
    <rect x="100" y="40" width="30" height="80" rx="2" fill="#3B82F6"/>
    <rect x="140" y="70" width="30" height="50" rx="2" fill="#3B82F6"/>
    <rect x="180" y="35" width="30" height="85" rx="2" fill="#3B82F6"/>
    <rect x="220" y="55" width="30" height="65" rx="2" fill="#3B82F6"/>

    <!-- Legend indicator -->
    <g transform="translate(200, 10)">
      <rect x="0" y="0" width="12" height="12" rx="2" fill="#3B82F6"/>
      <text x="18" y="10" class="legend-text">Series A</text>
    </g>

    <!-- Optional second series (faded) -->
    <rect x="65" y="80" width="20" height="40" rx="2" fill="#10B981" opacity="0.4"/>
    <rect x="105" y="65" width="20" height="55" rx="2" fill="#10B981" opacity="0.4"/>
    <rect x="145" y="85" width="20" height="35" rx="2" fill="#10B981" opacity="0.4"/>

    <g transform="translate(200, 26)">
      <rect x="0" y="0" width="12" height="12" rx="2" fill="#10B981" opacity="0.5"/>
      <text x="18" y="10" class="legend-text" opacity="0.5">Series B</text>
    </g>
  </svg>
</template>

<style scoped>
.axis-label {
  font-size: 11px;
  font-weight: 600;
  fill: #6B7280;
  font-family: system-ui, -apple-system, sans-serif;
  letter-spacing: 0.05em;
}

.legend-text {
  font-size: 10px;
  fill: #6B7280;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

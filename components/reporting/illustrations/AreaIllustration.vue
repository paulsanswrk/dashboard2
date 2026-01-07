<template>
  <svg width="280" height="160" viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Axes -->
    <line x1="40" y1="120" x2="260" y2="120" stroke="#9CA3AF" stroke-width="2"/>
    <line x1="40" y1="20" x2="40" y2="120" stroke="#9CA3AF" stroke-width="2"/>

    <!-- Gradient definition -->
    <defs>
      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.1"/>
      </linearGradient>
    </defs>

    <!-- Filled area -->
    <path 
      d="M 60 85 L 100 50 L 140 65 L 180 35 L 220 55 L 250 40 L 250 120 L 60 120 Z" 
      fill="url(#areaGradient)"
    />

    <!-- Line on top -->
    <polyline 
      points="60,85 100,50 140,65 180,35 220,55 250,40" 
      stroke="#3B82F6" 
      stroke-width="2.5" 
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Axis labels -->
    <text x="15" y="70" text-anchor="middle" class="axis-label" transform="rotate(-90, 15, 70)">Y-AXIS</text>
    <text x="150" y="145" text-anchor="middle" class="axis-label">X-AXIS</text>
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
</style>

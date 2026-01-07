<template>
  <svg width="280" height="160" viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Axes -->
    <line x1="40" y1="120" x2="260" y2="120" stroke="#9CA3AF" stroke-width="2"/>
    <line x1="40" y1="20" x2="40" y2="120" stroke="#9CA3AF" stroke-width="2"/>

    <!-- Grid lines -->
    <line x1="40" y1="45" x2="260" y2="45" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="40" y1="70" x2="260" y2="70" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="40" y1="95" x2="260" y2="95" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4 4"/>

    <!-- Line path -->
    <polyline 
      points="60,85 100,50 140,65 180,35 220,55 250,40" 
      stroke="#3B82F6" 
      stroke-width="3" 
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Data points -->
    <circle cx="60" cy="85" r="5" fill="#3B82F6"/>
    <circle cx="100" cy="50" r="5" fill="#3B82F6"/>
    <circle cx="140" cy="65" r="5" fill="#3B82F6"/>
    <circle cx="180" cy="35" r="5" fill="#3B82F6"/>
    <circle cx="220" cy="55" r="5" fill="#3B82F6"/>
    <circle cx="250" cy="40" r="5" fill="#3B82F6"/>

    <!-- Inner circle highlights -->
    <circle cx="60" cy="85" r="2" fill="white"/>
    <circle cx="100" cy="50" r="2" fill="white"/>
    <circle cx="140" cy="65" r="2" fill="white"/>
    <circle cx="180" cy="35" r="2" fill="white"/>
    <circle cx="220" cy="55" r="2" fill="white"/>
    <circle cx="250" cy="40" r="2" fill="white"/>

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

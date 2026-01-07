<template>
  <svg width="280" height="160" viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Axes -->
    <line x1="40" y1="120" x2="260" y2="120" stroke="#9CA3AF" stroke-width="2"/>
    <line x1="40" y1="20" x2="40" y2="120" stroke="#9CA3AF" stroke-width="2"/>

    <!-- Stacked bars - each bar has 3 segments -->
    <!-- Bar 1 -->
    <rect x="55" y="85" width="30" height="35" rx="0" fill="#3B82F6"/>
    <rect x="55" y="55" width="30" height="30" rx="0" fill="#10B981"/>
    <rect x="55" y="35" width="30" height="20" rx="0" fill="#F59E0B"/>

    <!-- Bar 2 -->
    <rect x="100" y="70" width="30" height="50" rx="0" fill="#3B82F6"/>
    <rect x="100" y="45" width="30" height="25" rx="0" fill="#10B981"/>
    <rect x="100" y="25" width="30" height="20" rx="0" fill="#F59E0B"/>

    <!-- Bar 3 -->
    <rect x="145" y="75" width="30" height="45" rx="0" fill="#3B82F6"/>
    <rect x="145" y="50" width="30" height="25" rx="0" fill="#10B981"/>
    <rect x="145" y="40" width="30" height="10" rx="0" fill="#F59E0B"/>

    <!-- Bar 4 -->
    <rect x="190" y="60" width="30" height="60" rx="0" fill="#3B82F6"/>
    <rect x="190" y="35" width="30" height="25" rx="0" fill="#10B981"/>
    <rect x="190" y="20" width="30" height="15" rx="0" fill="#F59E0B"/>

    <!-- Legend -->
    <g transform="translate(235, 25)">
      <rect x="0" y="0" width="10" height="10" fill="#3B82F6"/>
      <rect x="0" y="14" width="10" height="10" fill="#10B981"/>
      <rect x="0" y="28" width="10" height="10" fill="#F59E0B"/>
    </g>

    <!-- X-axis label -->
    <text x="150" y="145" text-anchor="middle" class="axis-label">CATEGORIES</text>
  </svg>
</template>

<style scoped>
.axis-label {
  font-size: 10px;
  font-weight: 600;
  fill: #6B7280;
  font-family: system-ui, -apple-system, sans-serif;
  letter-spacing: 0.05em;
}
</style>

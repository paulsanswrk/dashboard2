<template>
  <svg width="240" height="160" viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Axes -->
    <line x1="40" y1="130" x2="220" y2="130" stroke="#9CA3AF" stroke-width="2"/>
    <line x1="40" y1="20" x2="40" y2="130" stroke="#9CA3AF" stroke-width="2"/>

    <!-- Axis labels -->
    <text x="15" y="75" text-anchor="middle" class="axis-label" transform="rotate(-90, 15, 75)">Y VALUES</text>
    <text x="130" y="150" text-anchor="middle" class="axis-label">X VALUES</text>

    <!-- Scatter points -->
    <circle cx="70" cy="90" r="6" fill="#3B82F6"/>
    <circle cx="85" cy="60" r="6" fill="#3B82F6"/>
    <circle cx="100" cy="75" r="6" fill="#3B82F6"/>
    <circle cx="120" cy="45" r="6" fill="#3B82F6"/>
    <circle cx="140" cy="85" r="6" fill="#3B82F6"/>
    <circle cx="155" cy="50" r="6" fill="#3B82F6"/>
    <circle cx="175" cy="65" r="6" fill="#3B82F6"/>
    <circle cx="190" cy="35" r="6" fill="#3B82F6"/>
    <circle cx="95" cy="100" r="6" fill="#3B82F6"/>
    <circle cx="165" cy="95" r="6" fill="#3B82F6"/>

    <!-- Trend line (optional) -->
    <line x1="60" y1="100" x2="200" y2="40" stroke="#EF4444" stroke-width="2" stroke-dasharray="4 4" opacity="0.5"/>
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

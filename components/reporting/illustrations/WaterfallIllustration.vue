<template>
  <svg width="280" height="160" viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Axes -->
    <line x1="40" y1="120" x2="260" y2="120" stroke="#9CA3AF" stroke-width="2"/>
    <line x1="40" y1="20" x2="40" y2="120" stroke="#9CA3AF" stroke-width="2"/>

    <!-- Baseline reference -->
    <line x1="40" y1="80" x2="260" y2="80" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4 4"/>

    <!-- Connectors between bars -->
    <line x1="75" y1="50" x2="95" y2="50" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="2 2"/>
    <line x1="125" y1="70" x2="145" y2="70" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="2 2"/>
    <line x1="175" y1="55" x2="195" y2="55" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="2 2"/>
    <line x1="225" y1="95" x2="245" y2="95" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="2 2"/>

    <!-- Starting value (positive) -->
    <rect x="50" y="50" width="25" height="30" rx="2" fill="#3B82F6"/>
    <text x="62" y="68" text-anchor="middle" class="bar-label">100</text>

    <!-- Increase (green) -->
    <rect x="95" y="50" width="25" height="20" rx="2" fill="#10B981"/>
    <text x="107" y="44" text-anchor="middle" class="change-label">+20</text>

    <!-- Decrease (red) -->
    <rect x="145" y="70" width="25" height="15" rx="2" fill="#EF4444"/>
    <text x="157" y="93" text-anchor="middle" class="change-label">-15</text>

    <!-- Increase (green) -->
    <rect x="195" y="55" width="25" height="40" rx="2" fill="#10B981"/>
    <text x="207" y="49" text-anchor="middle" class="change-label">+40</text>

    <!-- Final total -->
    <rect x="245" y="35" width="25" height="60" rx="2" fill="#3B82F6"/>
    <text x="257" y="68" text-anchor="middle" class="bar-label">145</text>

    <!-- X-axis label -->
    <text x="150" y="145" text-anchor="middle" class="axis-label">PROGRESSION</text>
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

.bar-label {
  font-size: 8px;
  fill: white;
  font-weight: 600;
  font-family: system-ui, -apple-system, sans-serif;
}

.change-label {
  font-size: 8px;
  fill: #6B7280;
  font-weight: 500;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

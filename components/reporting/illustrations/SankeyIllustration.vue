<template>
  <svg width="280" height="160" viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Source nodes -->
    <rect x="20" y="20" width="50" height="30" rx="4" fill="#3B82F6"/>
    <rect x="20" y="60" width="50" height="40" rx="4" fill="#10B981"/>
    <rect x="20" y="110" width="50" height="25" rx="4" fill="#F59E0B"/>

    <!-- Target nodes -->
    <rect x="200" y="25" width="50" height="35" rx="4" fill="#8B5CF6"/>
    <rect x="200" y="70" width="50" height="30" rx="4" fill="#EF4444"/>
    <rect x="200" y="110" width="50" height="25" rx="4" fill="#EC4899"/>

    <!-- Flow paths (curved beziers) -->
    <!-- Source A to Target 1 -->
    <path d="M 70 35 C 120 35, 160 42, 200 42" stroke="#3B82F6" stroke-width="8" fill="none" opacity="0.4"/>
    <!-- Source A to Target 2 -->
    <path d="M 70 35 C 120 45, 160 80, 200 85" stroke="#3B82F6" stroke-width="4" fill="none" opacity="0.3"/>

    <!-- Source B to Target 1 -->
    <path d="M 70 80 C 120 75, 160 48, 200 48" stroke="#10B981" stroke-width="6" fill="none" opacity="0.4"/>
    <!-- Source B to Target 2 -->
    <path d="M 70 80 C 120 85, 160 85, 200 85" stroke="#10B981" stroke-width="10" fill="none" opacity="0.3"/>

    <!-- Source C to Target 3 -->
    <path d="M 70 122 C 120 122, 160 122, 200 122" stroke="#F59E0B" stroke-width="6" fill="none" opacity="0.4"/>

    <!-- Labels -->
    <text x="45" y="39" text-anchor="middle" class="node-label">A</text>
    <text x="45" y="84" text-anchor="middle" class="node-label">B</text>
    <text x="45" y="126" text-anchor="middle" class="node-label">C</text>

    <text x="225" y="47" text-anchor="middle" class="node-label">X</text>
    <text x="225" y="89" text-anchor="middle" class="node-label">Y</text>
    <text x="225" y="126" text-anchor="middle" class="node-label">Z</text>

    <!-- Axis labels -->
    <text x="45" y="150" text-anchor="middle" class="axis-label">Sources</text>
    <text x="225" y="150" text-anchor="middle" class="axis-label">Targets</text>
  </svg>
</template>

<style scoped>
.node-label {
  font-size: 12px;
  fill: white;
  font-weight: 600;
  font-family: system-ui, -apple-system, sans-serif;
}

.axis-label {
  font-size: 10px;
  fill: #6B7280;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

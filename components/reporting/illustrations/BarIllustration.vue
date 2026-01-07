<template>
  <svg width="280" height="160" viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Axes -->
    <line x1="60" y1="20" x2="60" y2="130" stroke="#9CA3AF" stroke-width="2"/>
    <line x1="60" y1="130" x2="260" y2="130" stroke="#9CA3AF" stroke-width="2"/>

    <!-- Y-axis labels -->
    <text x="50" y="38" text-anchor="end" class="category-label">Category A</text>
    <text x="50" y="63" text-anchor="end" class="category-label">Category B</text>
    <text x="50" y="88" text-anchor="end" class="category-label">Category C</text>
    <text x="50" y="113" text-anchor="end" class="category-label">Category D</text>

    <!-- Horizontal bars -->
    <rect x="60" y="28" width="160" height="16" rx="2" fill="#3B82F6"/>
    <rect x="60" y="53" width="120" height="16" rx="2" fill="#3B82F6"/>
    <rect x="60" y="78" width="180" height="16" rx="2" fill="#3B82F6"/>
    <rect x="60" y="103" width="90" height="16" rx="2" fill="#3B82F6"/>

    <!-- X-axis label -->
    <text x="160" y="150" text-anchor="middle" class="axis-label">VALUES →</text>
  </svg>
</template>

<style scoped>
.category-label {
  font-size: 9px;
  fill: #6B7280;
  font-family: system-ui, -apple-system, sans-serif;
}

.axis-label {
  font-size: 10px;
  font-weight: 600;
  fill: #6B7280;
  font-family: system-ui, -apple-system, sans-serif;
  letter-spacing: 0.05em;
}
</style>

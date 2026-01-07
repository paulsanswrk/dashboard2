<template>
  <svg width="260" height="160" viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Axes -->
    <line x1="40" y1="130" x2="240" y2="130" stroke="#9CA3AF" stroke-width="2"/>
    <line x1="40" y1="20" x2="40" y2="130" stroke="#9CA3AF" stroke-width="2"/>

    <!-- Box plot 1 -->
    <g transform="translate(70, 0)">
      <!-- Whisker line -->
      <line x1="0" y1="30" x2="0" y2="110" stroke="#3B82F6" stroke-width="2"/>
      <!-- Min whisker cap -->
      <line x1="-8" y1="110" x2="8" y2="110" stroke="#3B82F6" stroke-width="2"/>
      <!-- Max whisker cap -->
      <line x1="-8" y1="30" x2="8" y2="30" stroke="#3B82F6" stroke-width="2"/>
      <!-- Box (IQR) -->
      <rect x="-15" y="50" width="30" height="40" fill="#3B82F6" opacity="0.3" stroke="#3B82F6" stroke-width="2"/>
      <!-- Median line -->
      <line x1="-15" y1="70" x2="15" y2="70" stroke="#3B82F6" stroke-width="3"/>
    </g>

    <!-- Box plot 2 -->
    <g transform="translate(130, 0)">
      <line x1="0" y1="40" x2="0" y2="115" stroke="#10B981" stroke-width="2"/>
      <line x1="-8" y1="115" x2="8" y2="115" stroke="#10B981" stroke-width="2"/>
      <line x1="-8" y1="40" x2="8" y2="40" stroke="#10B981" stroke-width="2"/>
      <rect x="-15" y="55" width="30" height="45" fill="#10B981" opacity="0.3" stroke="#10B981" stroke-width="2"/>
      <line x1="-15" y1="80" x2="15" y2="80" stroke="#10B981" stroke-width="3"/>
    </g>

    <!-- Box plot 3 -->
    <g transform="translate(190, 0)">
      <line x1="0" y1="25" x2="0" y2="100" stroke="#F59E0B" stroke-width="2"/>
      <line x1="-8" y1="100" x2="8" y2="100" stroke="#F59E0B" stroke-width="2"/>
      <line x1="-8" y1="25" x2="8" y2="25" stroke="#F59E0B" stroke-width="2"/>
      <rect x="-15" y="45" width="30" height="35" fill="#F59E0B" opacity="0.3" stroke="#F59E0B" stroke-width="2"/>
      <line x1="-15" y1="60" x2="15" y2="60" stroke="#F59E0B" stroke-width="3"/>
    </g>

    <!-- Labels -->
    <text x="70" y="145" text-anchor="middle" class="category-label">A</text>
    <text x="130" y="145" text-anchor="middle" class="category-label">B</text>
    <text x="190" y="145" text-anchor="middle" class="category-label">C</text>
  </svg>
</template>

<style scoped>
.category-label {
  font-size: 11px;
  font-weight: 600;
  fill: #6B7280;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

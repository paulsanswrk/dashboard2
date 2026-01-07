<template>
  <svg width="240" height="160" viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Axes -->
    <line x1="40" y1="130" x2="220" y2="130" stroke="#9CA3AF" stroke-width="2"/>
    <line x1="40" y1="20" x2="40" y2="130" stroke="#9CA3AF" stroke-width="2"/>

    <!-- Axis labels -->
    <text x="15" y="75" text-anchor="middle" class="axis-label" transform="rotate(-90, 15, 75)">Y VALUES</text>
    <text x="130" y="150" text-anchor="middle" class="axis-label">X VALUES</text>

    <!-- Bubbles with varying sizes (3rd dimension) -->
    <circle cx="70" cy="95" r="12" fill="#3B82F6" opacity="0.7"/>
    <circle cx="90" cy="55" r="18" fill="#3B82F6" opacity="0.7"/>
    <circle cx="120" cy="75" r="8" fill="#3B82F6" opacity="0.7"/>
    <circle cx="145" cy="40" r="22" fill="#3B82F6" opacity="0.7"/>
    <circle cx="165" cy="90" r="10" fill="#3B82F6" opacity="0.7"/>
    <circle cx="185" cy="50" r="15" fill="#3B82F6" opacity="0.7"/>
    <circle cx="200" cy="35" r="9" fill="#3B82F6" opacity="0.7"/>
    <circle cx="105" cy="105" r="14" fill="#3B82F6" opacity="0.7"/>

    <!-- Legend for size -->
    <g transform="translate(200, 105)">
      <circle cx="0" cy="0" r="4" fill="#3B82F6" opacity="0.7"/>
      <circle cx="0" cy="12" r="7" fill="#3B82F6" opacity="0.7"/>
      <text x="12" y="3" class="size-label">Small</text>
      <text x="12" y="15" class="size-label">Large</text>
    </g>
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

.size-label {
  font-size: 8px;
  fill: #9CA3AF;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

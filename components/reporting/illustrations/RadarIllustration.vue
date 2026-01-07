<template>
  <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(100, 80)">
      <!-- Radar grid (pentagon for 5 axes) -->
      <!-- Outer ring -->
      <polygon points="0,-55 52,-17 32,45 -32,45 -52,-17" fill="none" stroke="#E5E7EB" stroke-width="1"/>
      <!-- Middle ring -->
      <polygon points="0,-36 34,-11 21,29 -21,29 -34,-11" fill="none" stroke="#E5E7EB" stroke-width="1"/>
      <!-- Inner ring -->
      <polygon points="0,-18 17,-6 11,15 -11,15 -17,-6" fill="none" stroke="#E5E7EB" stroke-width="1"/>

      <!-- Axis lines from center -->
      <line x1="0" y1="0" x2="0" y2="-55" stroke="#E5E7EB" stroke-width="1"/>
      <line x1="0" y1="0" x2="52" y2="-17" stroke="#E5E7EB" stroke-width="1"/>
      <line x1="0" y1="0" x2="32" y2="45" stroke="#E5E7EB" stroke-width="1"/>
      <line x1="0" y1="0" x2="-32" y2="45" stroke="#E5E7EB" stroke-width="1"/>
      <line x1="0" y1="0" x2="-52" y2="-17" stroke="#E5E7EB" stroke-width="1"/>

      <!-- Data polygon -->
      <polygon 
        points="0,-45 42,-8 20,38 -28,30 -38,-14" 
        fill="#3B82F6" 
        fill-opacity="0.3" 
        stroke="#3B82F6" 
        stroke-width="2"
      />

      <!-- Data points -->
      <circle cx="0" cy="-45" r="4" fill="#3B82F6"/>
      <circle cx="42" cy="-8" r="4" fill="#3B82F6"/>
      <circle cx="20" cy="38" r="4" fill="#3B82F6"/>
      <circle cx="-28" cy="30" r="4" fill="#3B82F6"/>
      <circle cx="-38" cy="-14" r="4" fill="#3B82F6"/>

      <!-- Axis labels -->
      <text x="0" y="-62" text-anchor="middle" class="axis-label">Speed</text>
      <text x="62" y="-14" text-anchor="start" class="axis-label">Power</text>
      <text x="38" y="55" text-anchor="start" class="axis-label">Range</text>
      <text x="-38" y="55" text-anchor="end" class="axis-label">Armor</text>
      <text x="-62" y="-14" text-anchor="end" class="axis-label">Agility</text>
    </g>
  </svg>
</template>

<style scoped>
.axis-label {
  font-size: 9px;
  fill: #6B7280;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

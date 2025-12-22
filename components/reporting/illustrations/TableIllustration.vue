<template>
  <svg width="280" height="140" viewBox="0 0 280 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Table outline -->
    <rect x="20" y="20" width="240" height="100" rx="4" stroke="#9CA3AF" stroke-width="2" fill="#F9FAFB"/>

    <!-- Header row -->
    <rect x="20" y="20" width="240" height="24" rx="4" fill="#E5E7EB"/>
    <line x1="80" y1="20" x2="80" y2="120" stroke="#D1D5DB" stroke-width="1"/>
    <line x1="140" y1="20" x2="140" y2="120" stroke="#D1D5DB" stroke-width="1"/>
    <line x1="200" y1="20" x2="200" y2="120" stroke="#D1D5DB" stroke-width="1"/>

    <!-- Header text placeholders -->
    <rect x="30" y="28" width="40" height="8" rx="2" fill="#9CA3AF"/>
    <rect x="90" y="28" width="40" height="8" rx="2" fill="#9CA3AF"/>
    <rect x="150" y="28" width="40" height="8" rx="2" fill="#9CA3AF"/>
    <rect x="210" y="28" width="40" height="8" rx="2" fill="#9CA3AF"/>

    <!-- Row lines -->
    <line x1="20" y1="44" x2="260" y2="44" stroke="#E5E7EB" stroke-width="1"/>
    <line x1="20" y1="68" x2="260" y2="68" stroke="#E5E7EB" stroke-width="1"/>
    <line x1="20" y1="92" x2="260" y2="92" stroke="#E5E7EB" stroke-width="1"/>

    <!-- Data cell placeholders -->
    <rect x="30" y="52" width="30" height="6" rx="2" fill="#D1D5DB"/>
    <rect x="90" y="52" width="35" height="6" rx="2" fill="#D1D5DB"/>
    <rect x="150" y="52" width="28" height="6" rx="2" fill="#3B82F6"/>
    <rect x="210" y="52" width="32" height="6" rx="2" fill="#3B82F6"/>

    <rect x="30" y="76" width="35" height="6" rx="2" fill="#D1D5DB"/>
    <rect x="90" y="76" width="30" height="6" rx="2" fill="#D1D5DB"/>
    <rect x="150" y="76" width="35" height="6" rx="2" fill="#3B82F6"/>
    <rect x="210" y="76" width="28" height="6" rx="2" fill="#3B82F6"/>

    <rect x="30" y="100" width="28" height="6" rx="2" fill="#D1D5DB"/>
    <rect x="90" y="100" width="38" height="6" rx="2" fill="#D1D5DB"/>
    <rect x="150" y="100" width="30" height="6" rx="2" fill="#3B82F6"/>
    <rect x="210" y="100" width="35" height="6" rx="2" fill="#3B82F6"/>

    <!-- Labels -->
    <text x="140" y="138" text-anchor="middle" class="label">Simple Table</text>
  </svg>
</template>

<style scoped>
.label {
  font-size: 11px;
  fill: #6B7280;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

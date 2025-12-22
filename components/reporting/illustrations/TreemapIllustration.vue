<template>
  <svg width="240" height="160" viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Main rectangle -->
    <rect x="20" y="20" width="200" height="120" rx="4" fill="#3B82F6"/>

    <!-- Sub-rectangles representing hierarchy -->
    <rect x="22" y="22" width="118" height="70" rx="2" fill="#60A5FA"/>
    <rect x="142" y="22" width="76" height="70" rx="2" fill="#10B981"/>

    <rect x="22" y="94" width="76" height="44" rx="2" fill="#F59E0B"/>
    <rect x="100" y="94" width="58" height="44" rx="2" fill="#EF4444"/>
    <rect x="160" y="94" width="58" height="44" rx="2" fill="#8B5CF6"/>

    <!-- Labels inside boxes -->
    <text x="81" y="60" text-anchor="middle" class="box-label">Category A</text>
    <text x="180" y="60" text-anchor="middle" class="box-label-small">Cat B</text>
    <text x="60" y="118" text-anchor="middle" class="box-label-small">C</text>
    <text x="129" y="118" text-anchor="middle" class="box-label-small">D</text>
    <text x="189" y="118" text-anchor="middle" class="box-label-small">E</text>

    <!-- Bottom label -->
    <text x="120" y="155" text-anchor="middle" class="label">Hierarchy by Size</text>
  </svg>
</template>

<style scoped>
.box-label {
  font-size: 12px;
  fill: white;
  font-weight: 600;
  font-family: system-ui, -apple-system, sans-serif;
}

.box-label-small {
  font-size: 10px;
  fill: white;
  font-weight: 500;
  font-family: system-ui, -apple-system, sans-serif;
}

.label {
  font-size: 11px;
  fill: #6B7280;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

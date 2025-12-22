<template>
  <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Funnel shape -->
    <path d="M 20 20 L 180 20 L 150 50 L 150 50 L 50 50 Z" fill="#3B82F6"/>
    <path d="M 50 55 L 150 55 L 135 85 L 65 85 Z" fill="#60A5FA"/>
    <path d="M 65 90 L 135 90 L 120 120 L 80 120 Z" fill="#93C5FD"/>
    <path d="M 80 125 L 120 125 L 110 150 L 90 150 Z" fill="#BFDBFE"/>

    <!-- Stage labels -->
    <text x="100" y="38" text-anchor="middle" class="stage-label">Stage 1</text>
    <text x="100" y="73" text-anchor="middle" class="stage-label">Stage 2</text>
    <text x="100" y="108" text-anchor="middle" class="stage-label">Stage 3</text>
    <text x="100" y="142" text-anchor="middle" class="stage-label">Stage 4</text>
  </svg>
</template>

<style scoped>
.stage-label {
  font-size: 10px;
  fill: white;
  font-weight: 600;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

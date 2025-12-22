<template>
  <svg width="280" height="160" viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Large KPI number -->
    <text x="140" y="70" text-anchor="middle" class="kpi-value">1,234</text>

    <!-- Variance indicator -->
    <g transform="translate(140, 95)">
      <rect x="-35" y="-12" width="70" height="24" rx="12" fill="#DCFCE7"/>
      <text x="0" y="5" text-anchor="middle" class="variance-text">+12.5%</text>
      <!-- Up arrow -->
      <path d="M22 2 L26 -3 L30 2" stroke="#16A34A" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>

    <!-- Label -->
    <text x="140" y="130" text-anchor="middle" class="label">Measure</text>

    <!-- Target indicator line -->
    <line x1="60" y1="145" x2="220" y2="145" stroke="#E5E7EB" stroke-width="2" stroke-dasharray="4 4"/>
    <text x="140" y="156" text-anchor="middle" class="target-label">Target Value (optional)</text>
  </svg>
</template>

<style scoped>
.kpi-value {
  font-size: 48px;
  font-weight: 700;
  fill: #1F2937;
  font-family: system-ui, -apple-system, sans-serif;
}

.variance-text {
  font-size: 14px;
  font-weight: 600;
  fill: #16A34A;
  font-family: system-ui, -apple-system, sans-serif;
}

.label {
  font-size: 12px;
  fill: #6B7280;
  font-family: system-ui, -apple-system, sans-serif;
}

.target-label {
  font-size: 10px;
  fill: #9CA3AF;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

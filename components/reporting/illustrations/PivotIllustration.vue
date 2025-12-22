<template>
  <svg width="280" height="160" viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Grid background -->
    <rect x="40" y="20" width="200" height="120" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="1"/>

    <!-- Header row -->
    <rect x="40" y="20" width="40" height="24" fill="#E5E7EB"/>
    <rect x="80" y="20" width="53" height="24" fill="#DBEAFE"/>
    <rect x="133" y="20" width="53" height="24" fill="#DBEAFE"/>
    <rect x="186" y="20" width="54" height="24" fill="#DBEAFE"/>

    <!-- Row headers -->
    <rect x="40" y="44" width="40" height="24" fill="#DBEAFE"/>
    <rect x="40" y="68" width="40" height="24" fill="#DBEAFE"/>
    <rect x="40" y="92" width="40" height="24" fill="#DBEAFE"/>
    <rect x="40" y="116" width="40" height="24" fill="#DBEAFE"/>

    <!-- Data cells with color intensity -->
    <rect x="80" y="44" width="53" height="24" fill="#93C5FD"/>
    <rect x="133" y="44" width="53" height="24" fill="#60A5FA"/>
    <rect x="186" y="44" width="54" height="24" fill="#3B82F6"/>

    <rect x="80" y="68" width="53" height="24" fill="#BFDBFE"/>
    <rect x="133" y="68" width="53" height="24" fill="#93C5FD"/>
    <rect x="186" y="68" width="54" height="24" fill="#60A5FA"/>

    <rect x="80" y="92" width="53" height="24" fill="#60A5FA"/>
    <rect x="133" y="92" width="53" height="24" fill="#3B82F6"/>
    <rect x="186" y="92" width="54" height="24" fill="#2563EB"/>

    <rect x="80" y="116" width="53" height="24" fill="#DBEAFE"/>
    <rect x="133" y="116" width="53" height="24" fill="#BFDBFE"/>
    <rect x="186" y="116" width="54" height="24" fill="#93C5FD"/>

    <!-- Grid lines -->
    <line x1="80" y1="20" x2="80" y2="140" stroke="#D1D5DB" stroke-width="1"/>
    <line x1="133" y1="20" x2="133" y2="140" stroke="#D1D5DB" stroke-width="1"/>
    <line x1="186" y1="20" x2="186" y2="140" stroke="#D1D5DB" stroke-width="1"/>
    <line x1="40" y1="44" x2="240" y2="44" stroke="#D1D5DB" stroke-width="1"/>
    <line x1="40" y1="68" x2="240" y2="68" stroke="#D1D5DB" stroke-width="1"/>
    <line x1="40" y1="92" x2="240" y2="92" stroke="#D1D5DB" stroke-width="1"/>
    <line x1="40" y1="116" x2="240" y2="116" stroke="#D1D5DB" stroke-width="1"/>

    <!-- Column labels -->
    <text x="60" y="36" text-anchor="middle" class="header-text"></text>
    <text x="106" y="36" text-anchor="middle" class="header-text">A</text>
    <text x="159" y="36" text-anchor="middle" class="header-text">B</text>
    <text x="213" y="36" text-anchor="middle" class="header-text">C</text>

    <!-- Row labels -->
    <text x="60" y="60" text-anchor="middle" class="row-text">1</text>
    <text x="60" y="84" text-anchor="middle" class="row-text">2</text>
    <text x="60" y="108" text-anchor="middle" class="row-text">3</text>
    <text x="60" y="132" text-anchor="middle" class="row-text">4</text>

    <!-- Sample values -->
    <text x="106" y="60" text-anchor="middle" class="value-text">45</text>
    <text x="159" y="60" text-anchor="middle" class="value-text">78</text>
    <text x="213" y="60" text-anchor="middle" class="value-text">92</text>
    <text x="106" y="84" text-anchor="middle" class="value-text">23</text>
    <text x="159" y="84" text-anchor="middle" class="value-text">56</text>
    <text x="213" y="84" text-anchor="middle" class="value-text">67</text>
    <text x="106" y="108" text-anchor="middle" class="value-text">89</text>
    <text x="159" y="108" text-anchor="middle" class="value-text">94</text>
    <text x="213" y="108" text-anchor="middle" class="value-text">99</text>
    <text x="106" y="132" text-anchor="middle" class="value-text">12</text>
    <text x="159" y="132" text-anchor="middle" class="value-text">34</text>
    <text x="213" y="132" text-anchor="middle" class="value-text">56</text>
  </svg>
</template>

<style scoped>
.header-text {
  font-size: 11px;
  font-weight: 600;
  fill: #374151;
  font-family: system-ui, -apple-system, sans-serif;
}

.row-text {
  font-size: 11px;
  font-weight: 600;
  fill: #374151;
  font-family: system-ui, -apple-system, sans-serif;
}

.value-text {
  font-size: 10px;
  fill: #1F2937;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

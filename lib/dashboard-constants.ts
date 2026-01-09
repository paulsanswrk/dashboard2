/**
 * Dashboard layout constants
 *
 * DASHBOARD_WIDTH is the fixed canvas width for dashboards.
 * When displaying in the UI, dashboards are scaled to fit available space.
 * When rendering PDFs, the original width is used.
 */

/** Fixed dashboard canvas width in pixels */
export const DASHBOARD_WIDTH = 1200

/** PDF margin configuration in pixels */
export const DASHBOARD_PDF_MARGINS = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
} as const

/** Device preview widths for tablet/mobile simulation */
export const DEVICE_PREVIEW_WIDTHS = {
    desktop: DASHBOARD_WIDTH,
    tablet: 768,
    mobile: 390
} as const

/** Available dashboard width presets for user selection */
export const DASHBOARD_WIDTH_PRESETS = [
    { label: 'Default (1200px)', value: 1200 },
    { label: 'Wide (1400px)', value: 1400 },
    { label: 'Extra Wide (1600px)', value: 1600 },
    { label: 'Full HD (1920px)', value: 1920 },
] as const

/** Timeout for chart data requests in milliseconds (60 seconds) */
export const CHART_DATA_TIMEOUT_MS = 60000

/** Maximum concurrent chart data requests per dashboard (prevents overwhelming the database) */
export const MAX_CONCURRENT_CHART_REQUESTS = 2

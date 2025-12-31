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

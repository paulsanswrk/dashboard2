import { DASHBOARD_WIDTH } from './dashboard-constants'

export interface PixelPosition {
    left: number
    top: number
    width: number
    height: number
}

/**
 * Free-positioning Auto Layout algorithm.
 * Arranges widgets in a flow-like manner, left-to-right, wrapping to next row when width is exceeded.
 */
export function calculateAutoLayout(
    widgets: Array<{ id: string; position: PixelPosition }>,
    containerWidth: number = DASHBOARD_WIDTH,
    gap: number = 20
): Array<{ id: string; position: PixelPosition }> {
    // Sort widgets by their current vertical position, then horizontal
    const sorted = [...widgets].sort((a, b) =>
        a.position.top - b.position.top || a.position.left - b.position.left
    )

    let currentLeft = gap
    let currentTop = gap
    let rowMaxHeight = 0
    const result: Array<{ id: string; position: PixelPosition }> = []

    sorted.forEach(widget => {
        // If widget doesn't fit in current row, move to next row
        if (currentLeft + widget.position.width > containerWidth - gap) {
            currentLeft = gap
            currentTop += rowMaxHeight + gap
            rowMaxHeight = 0
        }

        result.push({
            id: widget.id,
            position: {
                left: currentLeft,
                top: currentTop,
                width: widget.position.width,
                height: widget.position.height
            }
        })

        currentLeft += widget.position.width + gap
        rowMaxHeight = Math.max(rowMaxHeight, widget.position.height)
    })

    return result
}

/**
 * Helper to ensure a widget stays within dashboard bounds
 */
export function clampToDashboard(
    pos: PixelPosition,
    dashboardWidth: number = DASHBOARD_WIDTH
): PixelPosition {
    const width = Math.min(pos.width, dashboardWidth)
    const left = Math.max(0, Math.min(pos.left, dashboardWidth - width))
    const top = Math.max(0, pos.top)

    return {
        left,
        top,
        width,
        height: Math.max(20, pos.height)
    }
}

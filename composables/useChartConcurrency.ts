import { MAX_CONCURRENT_CHART_REQUESTS } from '~/lib/dashboard-constants'

/**
 * Simple semaphore implementation for limiting concurrent operations.
 * Used to prevent overwhelming databases when loading multiple charts in parallel.
 */
class Semaphore {
    private permits: number
    private waiting: Array<() => void> = []

    constructor(permits: number) {
        this.permits = permits
    }

    async acquire(): Promise<void> {
        if (this.permits > 0) {
            this.permits--
            return
        }
        return new Promise<void>((resolve) => {
            this.waiting.push(resolve)
        })
    }

    release(): void {
        const next = this.waiting.shift()
        if (next) {
            next()
        } else {
            this.permits++
        }
    }
}

// Global semaphore instances per dashboard ID
const dashboardSemaphores = new Map<string, Semaphore>()

/**
 * Get or create a semaphore for the given dashboard.
 * All charts in the same dashboard share the same semaphore to limit concurrent requests.
 */
function getSemaphore(dashboardId: string): Semaphore {
    let sem = dashboardSemaphores.get(dashboardId)
    if (!sem) {
        sem = new Semaphore(MAX_CONCURRENT_CHART_REQUESTS)
        dashboardSemaphores.set(dashboardId, sem)
    }
    return sem
}

/**
 * Execute a function with concurrency control for the given dashboard.
 * Limits the number of concurrent chart data requests to prevent overwhelming the database.
 */
export async function withChartDataConcurrency<T>(
    dashboardId: string,
    fn: () => Promise<T>
): Promise<T> {
    const sem = getSemaphore(dashboardId)
    await sem.acquire()
    try {
        return await fn()
    } finally {
        sem.release()
    }
}

/**
 * Clean up semaphore for a dashboard (call when dashboard is unmounted).
 */
export function cleanupDashboardSemaphore(dashboardId: string): void {
    dashboardSemaphores.delete(dashboardId)
}

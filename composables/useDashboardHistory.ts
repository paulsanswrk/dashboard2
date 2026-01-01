import {computed, ref} from 'vue'

export interface DashboardAction {
    type: string
    undo: () => Promise<void>
    redo: () => Promise<void>
    timestamp: number
}

// Singleton state - shared across all invocations
const history = ref<DashboardAction[]>([])
const currentIndex = ref(-1)

export function useDashboardHistory() {

    const canUndo = computed(() => currentIndex.value >= 0)
    const canRedo = computed(() => currentIndex.value < history.value.length - 1)

    function recordAction(action: Omit<DashboardAction, 'timestamp'>) {
        console.log('[DashboardHistory] recordAction called:', action.type)
        console.log('[DashboardHistory] Before: history.length =', history.value.length, 'currentIndex =', currentIndex.value)

        // If we are not at the end of history, discard future actions
        if (currentIndex.value < history.value.length - 1) {
            history.value = history.value.slice(0, currentIndex.value + 1)
        }

        history.value.push({
            ...action,
            timestamp: Date.now()
        })
        currentIndex.value++

        console.log('[DashboardHistory] After: history.length =', history.value.length, 'currentIndex =', currentIndex.value, 'canUndo =', currentIndex.value >= 0)

        // Limit history size if needed (e.g., 50 actions)
        if (history.value.length > 50) {
            history.value.shift()
            currentIndex.value--
        }
    }

    async function undo() {
        if (!canUndo.value) return

        const action = history.value[currentIndex.value]
        try {
            if (action && action.undo) {
                await action.undo()
                currentIndex.value--
            }
        } catch (error) {
            console.error('Failed to undo action:', action.type, error)
        }
    }

    async function redo() {
        if (!canRedo.value) return

        const action = history.value[currentIndex.value + 1]
        try {
            await action.redo()
            currentIndex.value++
        } catch (error) {
            console.error('Failed to redo action:', action.type, error)
        }
    }

    function clear() {
        history.value = []
        currentIndex.value = -1
    }

    return {
        history,
        canUndo,
        canRedo,
        recordAction,
        undo,
        redo,
        clear
    }
}

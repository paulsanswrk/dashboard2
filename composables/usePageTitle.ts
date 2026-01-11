import { computed, isRef, type Ref, type ComputedRef } from 'vue'

/**
 * Composable for setting dynamic page titles with a consistent format.
 * Centralizes title management across the application.
 * 
 * @param baseTitle - The base page title (e.g., "Edit Dashboard", "Chart Builder"). Can be a string, Ref, or ComputedRef.
 * @param objectName - Optional reactive object name to include in the title
 * @returns The computed title
 * 
 * @example
 * // Simple usage
 * usePageTitle('Dashboard')
 * // Result: "Dashboard | Optiqo"
 * 
 * @example
 * // With object name
 * const dashboardName = ref('Sales Report')
 * usePageTitle('Edit Dashboard', dashboardName)
 * // Result: "Sales Report - Edit Dashboard | Optiqo"
 * 
 * @example
 * // Dynamic base title
 * usePageTitle(computed(() => isEditMode.value ? 'Edit Dashboard' : 'Dashboard'), dashboardName)
 */
export function usePageTitle(
    baseTitle: string | Ref<string> | ComputedRef<string>,
    objectName?: Ref<string | null | undefined> | string | null
) {
    const title = computed(() => {
        const base = isRef(baseTitle) ? baseTitle.value : baseTitle
        const name = typeof objectName === 'string'
            ? objectName
            : objectName?.value

        if (name && name.trim()) {
            return `${name} - ${base} | Optiqo`
        }
        return `${base} | Optiqo`
    })

    useHead({ title })

    return { title }
}

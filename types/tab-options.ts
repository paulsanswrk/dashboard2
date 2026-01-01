/**
 * Tab style options type definitions
 */

export interface TabStyleOptions {
    /** Background color for the tab canvas */
    backgroundColor?: string
    /** Primary font family for the tab */
    fontFamily?: string
    /** Array of 8 colors for chart data series */
    seriesColors?: string[]
    /** Background color for chart widgets */
    chartBackground?: string
    /** Active theme name */
    theme?: string
}

export const DEFAULT_SERIES_COLORS = [
    '#FF6384', // Red/Pink
    '#36A2EB', // Blue
    '#FFCE56', // Yellow
    '#4BC0C0', // Teal
    '#9966FF', // Purple
    '#FF9F40', // Orange
    '#7CFC00', // Green
    '#DC143C', // Crimson
]

export const FONT_FAMILY_OPTIONS = [
    {label: 'Inter', value: 'Inter, sans-serif'},
    {label: 'Proxima Nova', value: '"Proxima Nova", sans-serif'},
    {label: 'Arial', value: 'Arial, sans-serif'},
    {label: 'Roboto', value: 'Roboto, sans-serif'},
    {label: 'Open Sans', value: '"Open Sans", sans-serif'},
    {label: 'Lato', value: 'Lato, sans-serif'},
    {label: 'Montserrat', value: 'Montserrat, sans-serif'},
    {label: 'Source Sans 3', value: 'Source Sans 3, sans-serif'},
]

export const PREDEFINED_THEMES: Record<string, Partial<TabStyleOptions>> = {
    'default': {
        backgroundColor: '#ffffff',
        chartBackground: '#ffffff',
        seriesColors: DEFAULT_SERIES_COLORS,
    },
    'dark': {
        backgroundColor: '#1f2937',
        chartBackground: '#111827',
        seriesColors: ['#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#fbbf24', '#f87171', '#22d3ee', '#a3e635'],
    },
    'berry-dream': {
        backgroundColor: '#1a1a2e',
        chartBackground: '#16213e',
        seriesColors: ['#e94560', '#0f3460', '#533483', '#ff6b6b', '#ee5a9a', '#c34a85', '#a3407e', '#8a3676'],
    },
    'aquaman': {
        backgroundColor: '#0a1929',
        chartBackground: '#0d1d31',
        seriesColors: ['#00bcd4', '#26c6da', '#4dd0e1', '#80deea', '#00acc1', '#00838f', '#006064', '#84ffff'],
    },
    'desert-sunrise': {
        backgroundColor: '#fef3e2',
        chartBackground: '#fff8f0',
        seriesColors: ['#ff6b35', '#f7931e', '#ffc107', '#ff5722', '#e65100', '#bf360c', '#ffab91', '#ffe0b2'],
    },
    'forest': {
        backgroundColor: '#1b4332',
        chartBackground: '#2d6a4f',
        seriesColors: ['#95d5b2', '#74c69d', '#52b788', '#40916c', '#2d6a4f', '#1b4332', '#b7e4c7', '#d8f3dc'],
    },
    'midnight': {
        backgroundColor: '#0f0f23',
        chartBackground: '#1a1a3e',
        seriesColors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#fb7185', '#fda4af'],
    },
}

export function getThemeOptions() {
    return Object.keys(PREDEFINED_THEMES).map(key => ({
        label: key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        value: key,
    }))
}

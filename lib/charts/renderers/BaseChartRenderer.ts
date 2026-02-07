/**
 * Base class for all chart renderers.
 * Provides shared utilities for formatting, styling, and common chart configurations.
 */

import type {
    AppearanceConfig,
    ChartRenderContext,
    ChartRenderResult,
    Column,
    FontStyle,
    ReportField,
    SeriesConfig,
    SeriesData
} from './types'

/** Default color palette */
export const DEFAULT_COLORS = [
    '#3366CC', '#DC3912', '#FF9900', '#109618', '#990099',
    '#3B3EAC', '#0099C6', '#DD4477', '#66AA00', '#B82E2E',
    '#316395', '#994499', '#22AA99', '#AAAA11', '#6633CC',
    '#E67300', '#8B0707', '#329262', '#5574A6', '#3B3EAC'
]

/**
 * Abstract base class for chart renderers.
 * Each chart type extends this and implements buildOption().
 */
export abstract class BaseChartRenderer {
    /** Chart types this renderer handles */
    abstract readonly chartTypes: string[]

    /** Build the ECharts option for this chart type */
    abstract buildOption(context: ChartRenderContext): ChartRenderResult

    // ==================== Utility Methods ====================

    /**
     * Format a number with decimal places and thousands separator
     */
    protected formatNumber(value: number, decimalPlaces: number = 0, thousandsSeparator: boolean = true): string {
        const fixed = value.toFixed(decimalPlaces)
        if (!thousandsSeparator) return fixed

        const parts = fixed.split('.')
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        return parts.join('.')
    }

    /**
     * Get the color palette from appearance or use defaults
     */
    protected getPalette(appearance?: AppearanceConfig): string[] {
        return (appearance?.palette && appearance.palette.length > 0)
            ? appearance.palette
            : DEFAULT_COLORS
    }

    /**
     * Get font style object for ECharts
     */
    protected getFontStyle(font?: FontStyle): Record<string, any> {
        return {
            color: font?.color || '#333',
            fontSize: font?.size || 12,
            fontWeight: font?.bold ? 'bold' : 'normal',
            fontStyle: font?.italic ? 'italic' : 'normal'
        }
    }

    /**
     * Get label color based on theme
     */
    protected getLabelColor(isDark: boolean): string {
        return isDark ? '#ffffff' : '#333333'
    }

    /**
     * Get axis label color based on theme
     */
    protected getAxisLabelColor(isDark: boolean): string {
        return isDark ? '#cccccc' : '#666666'
    }

    /**
     * Build title configuration
     */
    protected buildTitleConfig(appearance?: AppearanceConfig): Record<string, any> {
        return {
            text: appearance?.chartTitle || '',
            show: !!appearance?.chartTitle,
            textStyle: {
                fontFamily: appearance?.fontFamily || 'Arial'
            },
            padding: [0, 0, appearance?.titlePaddingBottom ?? 20, 0]
        }
    }

    /**
     * Build legend configuration
     */
    protected buildLegendConfig(seriesNames: string[], appearance?: AppearanceConfig): Record<string, any> {
        const showLegend = appearance?.showLegend ?? true
        const legendFont = this.getFontStyle(appearance?.legendFont)

        return {
            show: showLegend,
            data: seriesNames,
            top: appearance?.legendPosition === 'top' ? 'top' :
                appearance?.legendPosition === 'left' || appearance?.legendPosition === 'right' ? 'middle' : 'bottom',
            left: appearance?.legendPosition === 'left' ? 'left' :
                appearance?.legendPosition === 'right' ? 'right' : 'center',
            orient: appearance?.legendPosition === 'left' || appearance?.legendPosition === 'right' ? 'vertical' : 'horizontal',
            textStyle: legendFont
        }
    }

    /**
     * Build background color configuration
     */
    protected getBackgroundColor(appearance?: AppearanceConfig): string {
        return appearance?.backgroundTransparent ? 'transparent' : (appearance?.backgroundColor || 'transparent')
    }

    /**
     * Get metric aliases from columns (aggregated field keys like sum_value, count_id)
     */
    protected getMetricAliases(columns: Column[]): string[] {
        const aggPrefixes = ['sum_', 'count_', 'avg_', 'min_', 'max_']
        const keys = columns.map(c => c.key)
        return keys.filter(k => aggPrefixes.some(p => k.startsWith(p)))
    }

    /**
     * Get categories from rows based on xDimensions
     */
    protected getCategories(
        rows: Array<Record<string, unknown>>,
        xDimensions: ReportField[],
        columns: Column[]
    ): string[] {
        const xKey = xDimensions?.[0]?.fieldId

        // If we have traditional dimensions, use them
        if (xKey) {
            return rows.map(r => String(r[xKey] ?? ''))
        }

        // Fallback for SQL-based charts: use first column as categories
        if (rows.length > 0 && columns.length > 0) {
            const xCol = columns[0]?.key
            return rows.map(r => String(r[xCol] ?? ''))
        }

        return []
    }

    /**
     * Get series data for charts
     */
    protected getSeriesData(
        rows: Array<Record<string, unknown>>,
        xDimensions: ReportField[],
        breakdowns: ReportField[],
        columns: Column[],
        chartType: string
    ): SeriesData[] {
        const xKey = xDimensions?.[0]?.fieldId
        const bKey = breakdowns?.[0]?.fieldId
        const aliases = this.getMetricAliases(columns)
        const categories = this.getCategories(rows, xDimensions, columns)

        // If we have traditional metric aliases and dimensions, use the original logic
        if (aliases.length && (xKey || xDimensions?.length)) {
            // If breakdown exists, use first metric and split series by breakdown values
            if (bKey) {
                const firstMetric = aliases[0]
                const grouped = new Map<string, number[]>()
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i]
                    const cat = xKey ? String(row[xKey] ?? '') : String(i)
                    const bVal = String(row[bKey] ?? '')
                    const val = Number(row[firstMetric] ?? 0)
                    if (!grouped.has(bVal)) grouped.set(bVal, Array(categories.length).fill(0))
                    const idx = categories.indexOf(cat)
                    if (idx >= 0) grouped.get(bVal)![idx] = val
                }
                return Array.from(grouped.entries()).map(([name, data]) => ({ name, data }))
            }

            // No breakdown: build one series per metric
            return aliases.map(alias => ({
                name: columns.find(c => c.key === alias)?.label || alias,
                data: categories.map((_, i) => Number(rows[i]?.[alias] ?? 0))
            }))
        }

        // Fallback for SQL-based charts without traditional dimensions/metrics setup
        if (rows.length === 0) return []

        // For pie/donut charts, assume first column is names, second is values
        if (chartType === 'pie' || chartType === 'donut') {
            const nameCol = columns[0]?.key
            const valueCol = columns[1]?.key || columns[0]?.key
            if (!nameCol || !valueCol) return []

            return [{
                name: columns.find(c => c.key === valueCol)?.label || valueCol,
                data: rows.map(row => ({
                    name: String(row[nameCol] ?? ''),
                    value: Number(row[valueCol] ?? 0)
                }))
            }]
        }

        // For other chart types, assume first column is X, remaining columns are Y series
        const xCol = columns[0]?.key
        const yCols = columns.slice(1).map(c => c.key)
        if (!xCol || yCols.length === 0) return []

        return yCols.map(yCol => ({
            name: columns.find(c => c.key === yCol)?.label || yCol,
            data: rows.map((row) => Number(row[yCol] ?? 0))
        }))
    }

    /**
     * Get KPI value (first metric of first row)
     */
    protected getKpiValue(rows: Array<Record<string, unknown>>, columns: Column[]): number {
        const aliases = this.getMetricAliases(columns)
        const alias = aliases[0]
        if (!alias) return 0
        const row0 = rows?.[0]
        return row0 ? Number(row0[alias] ?? 0) : 0
    }

    /**
     * Get KPI label
     */
    protected getKpiLabel(columns: Column[]): string {
        const aliases = this.getMetricAliases(columns)
        const alias = aliases[0]
        const col = columns.find(c => c.key === alias)
        return col?.label || 'Value'
    }

    /**
     * Format value with prefix/suffix from appearance
     */
    protected formatValueWithPrefixSuffix(
        value: number,
        appearance?: AppearanceConfig
    ): string {
        const dp = appearance?.numberFormat?.decimalPlaces ?? 0
        const ts = appearance?.numberFormat?.thousandsSeparator ?? true
        const prefix = appearance?.yAxis?.numberFormat?.prefix || ''
        const suffix = appearance?.yAxis?.numberFormat?.suffix || ''
        return `${prefix}${this.formatNumber(value, dp, ts)}${suffix}`
    }

    /**
     * Build grid configuration
     */
    protected buildGridConfig(appearance?: AppearanceConfig): Record<string, any> {
        return {
            left: appearance?.legendPosition === 'left' ? '15%' : '8%',
            right: appearance?.legendPosition === 'right' ? '15%' : '4%',
            bottom: (appearance?.legendPosition === 'bottom' || !appearance?.legendPosition) ? '15%' : '10%',
            top: 60 + (appearance?.titlePaddingBottom ?? 0),
            containLabel: true
        }
    }

    /**
     * Get per-series configuration options
     */
    protected getSeriesConfig(seriesName: string, appearance?: AppearanceConfig): SeriesConfig {
        return appearance?.seriesOptions?.[seriesName] ?? {}
    }

    /**
     * Apply series-specific overrides to a series option object
     */
    protected applySeriesOverrides(
        seriesOption: Record<string, any>,
        seriesName: string,
        appearance?: AppearanceConfig,
        palette?: string[],
        seriesIndex: number = 0
    ): Record<string, any> {
        const config = this.getSeriesConfig(seriesName, appearance)
        const colors = palette || this.getPalette(appearance)

        // Apply color override
        if (config.color) {
            seriesOption.itemStyle = { ...seriesOption.itemStyle, color: config.color }
        } else if (!seriesOption.itemStyle?.color) {
            seriesOption.itemStyle = { ...seriesOption.itemStyle, color: colors[seriesIndex % colors.length] }
        }

        // Apply line-specific options
        if (config.smoothing === 'smooth') {
            seriesOption.smooth = true
        } else if (config.smoothing === 'sharp') {
            seriesOption.smooth = false
        }

        if (config.lineStyle) {
            const lineTypes: Record<string, string> = { solid: 'solid', dashed: 'dashed', dotted: 'dotted' }
            seriesOption.lineStyle = { ...seriesOption.lineStyle, type: lineTypes[config.lineStyle] }
        }

        if (config.markerStyle) {
            const symbols: Record<string, string> = {
                none: 'none', circle: 'circle', square: 'rect',
                diamond: 'diamond', triangle: 'triangle'
            }
            seriesOption.symbol = symbols[config.markerStyle] || 'circle'
        }

        // Apply secondary axis
        if (config.showOnSecondaryAxis) {
            seriesOption.yAxisIndex = 1
        }

        // Apply label overrides
        if (config.showLabels !== undefined || config.showLabelsPercent !== undefined) {
            const showLabels = config.showLabels || config.showLabelsPercent
            seriesOption.label = {
                ...seriesOption.label,
                show: showLabels,
                ...(config.labelFont && this.getFontStyle(config.labelFont)),
                ...(config.showLabelBackground && {
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    padding: [2, 4],
                    borderRadius: 2
                })
            }
        }

        return seriesOption
    }

    /**
     * Compute linear regression (y = mx + b) for a data array.
     * Returns an array of fitted values the same length as the input.
     */
    protected computeLinearRegression(data: number[]): number[] {
        const n = data.length
        if (n < 2) return data.slice()

        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
        for (let i = 0; i < n; i++) {
            sumX += i
            sumY += data[i]
            sumXY += i * data[i]
            sumX2 += i * i
        }
        const denom = n * sumX2 - sumX * sumX
        if (denom === 0) return data.slice()

        const slope = (n * sumXY - sumX * sumY) / denom
        const intercept = (sumY - slope * sumX) / n

        return data.map((_, i) => Math.round((slope * i + intercept) * 100) / 100)
    }
}


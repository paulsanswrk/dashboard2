/**
 * DEV-ONLY API handler for injecting chart configurations
 * 
 * This endpoint returns chart configuration for use by bookmarklets or external tools.
 * The .dev.ts suffix ensures this file is excluded from production builds by Nitro.
 * 
 * Usage:
 *   POST /api/debug/inject-chart
 *   Body: { preset: 'employees-demo' } or { config: {...} }
 * 
 * Returns the chart configuration to be applied client-side.
 */
import { defineEventHandler, readBody, createError } from 'h3';

// Preset chart configurations for demo purposes
const PRESETS: Record<string, object> = {
    'employees-demo': {
        chartType: 'column',
        chartTitle: 'Average Salary by Department & Gender',
        xDimensions: [
            {
                fieldId: 'dept_name',
                name: 'dept_name',
                label: 'Department',
                type: 'varchar',
                table: 'departments'
            }
        ],
        yMetrics: [
            {
                fieldId: 'salary',
                name: 'salary',
                label: 'Avg Salary',
                type: 'int',
                table: 'salaries',
                aggregation: 'AVG',
                isNumeric: true
            }
        ],
        breakdowns: [
            {
                fieldId: 'gender',
                name: 'gender',
                label: 'Gender',
                type: 'enum',
                table: 'employees'
            }
        ],
        filters: [],
        joins: [
            {
                constraintName: 'fk_salaries_dept_emp',
                sourceTable: 'salaries',
                targetTable: 'dept_emp',
                joinType: 'inner',
                columnPairs: [{ position: 1, sourceColumn: 'emp_no', targetColumn: 'emp_no' }]
            },
            {
                constraintName: 'fk_dept_emp_departments',
                sourceTable: 'dept_emp',
                targetTable: 'departments',
                joinType: 'inner',
                columnPairs: [{ position: 1, sourceColumn: 'dept_no', targetColumn: 'dept_no' }]
            },
            {
                constraintName: 'fk_dept_emp_employees',
                sourceTable: 'dept_emp',
                targetTable: 'employees',
                joinType: 'inner',
                columnPairs: [{ position: 1, sourceColumn: 'emp_no', targetColumn: 'emp_no' }]
            }
        ],
        appearance: {
            showLegend: true,
            legendPosition: 'bottom',
            showLabels: false
        }
    },

    'employees-hiring-trend': {
        chartType: 'line',
        chartTitle: 'Hiring Trends (1985-2000)',
        xDimensions: [
            {
                fieldId: 'hire_date',
                name: 'hire_date',
                label: 'Hire Year',
                type: 'date',
                table: 'employees'
            }
        ],
        yMetrics: [
            {
                fieldId: 'emp_no',
                name: 'emp_no',
                label: 'Hires',
                type: 'int',
                table: 'employees',
                aggregation: 'COUNT',
                isNumeric: true
            }
        ],
        breakdowns: [],
        filters: [],
        joins: [],
        appearance: {
            showLegend: false,
            showLabels: false
        }
    },

    'employees-by-department': {
        chartType: 'column',
        chartTitle: 'Employees by Department',
        xDimensions: [
            {
                fieldId: 'dept_name',
                name: 'dept_name',
                label: 'Department',
                type: 'varchar',
                table: 'departments'
            }
        ],
        yMetrics: [
            {
                fieldId: 'emp_no',
                name: 'emp_no',
                label: 'Employee Count',
                type: 'int',
                table: 'dept_emp',
                aggregation: 'COUNT',
                isNumeric: true
            }
        ],
        breakdowns: [],
        filters: [],
        joins: [
            {
                constraintName: 'fk_dept_emp_departments',
                sourceTable: 'dept_emp',
                targetTable: 'departments',
                joinType: 'inner',
                columnPairs: [{ position: 1, sourceColumn: 'dept_no', targetColumn: 'dept_no' }]
            }
        ],
        appearance: {
            showLegend: false,
            showLabels: true
        }
    },

    'employees-gender-pie': {
        chartType: 'pie',
        chartTitle: 'Employees by Gender',
        xDimensions: [
            {
                fieldId: 'gender',
                name: 'gender',
                label: 'Gender',
                type: 'enum',
                table: 'employees'
            }
        ],
        yMetrics: [
            {
                fieldId: 'emp_no',
                name: 'emp_no',
                label: 'Count',
                type: 'int',
                table: 'employees',
                aggregation: 'COUNT',
                isNumeric: true
            }
        ],
        breakdowns: [],
        filters: [],
        joins: [],
        appearance: {
            showLegend: true,
            legendPosition: 'right',
            showLabels: true
        }
    }
};

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    // If a preset name is provided, return that preset
    if (body?.preset && typeof body.preset === 'string') {
        const presetConfig = PRESETS[body.preset];
        if (!presetConfig) {
            throw createError({
                statusCode: 400,
                message: `Unknown preset: ${body.preset}. Available presets: ${Object.keys(PRESETS).join(', ')}`
            });
        }

        return {
            success: true,
            preset: body.preset,
            config: presetConfig
        };
    }

    // If a custom config is provided, validate and return it
    if (body?.config && typeof body.config === 'object') {
        // Basic validation
        if (!body.config.chartType) {
            throw createError({
                statusCode: 400,
                message: 'Config must include chartType'
            });
        }

        return {
            success: true,
            preset: null,
            config: body.config
        };
    }

    // No valid input, list available presets
    return {
        success: true,
        message: 'No preset or config provided. Use { preset: "name" } or { config: {...} }',
        availablePresets: Object.keys(PRESETS)
    };
});

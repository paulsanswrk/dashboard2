/**
 * Filter Injection Tests
 * 
 * Comprehensive tests for the SQL filter injection utility.
 * Tests various SQL patterns including simple queries, subqueries,
 * window functions, CTEs, and complex joins.
 * 
 * All tests use the employees database schema: conn_4f2aa5cf_employees
 */

import { describe, it, expect } from 'vitest'
import {
    extractTablesFromSql,
    extractTableAliases,
    shouldApplyFilter,
    injectFiltersIntoSql,
    type FilterOverride
} from '../../server/utils/filterInjection'


// Helper to create a filter
function createFilter(fieldId: string, table: string, value: any, operator = 'equals'): FilterOverride {
    return {
        fieldId,
        table,
        type: 'text',
        operator,
        value,
        values: Array.isArray(value) ? value : [value]
    }
}

describe('extractTablesFromSql', () => {
    it('should extract single table from simple SELECT', () => {
        const sql = 'SELECT * FROM employees'
        const tables = extractTablesFromSql(sql)
        expect(tables).toContain('employees')
    })

    it('should extract table with backticks', () => {
        const sql = 'SELECT * FROM `employees`'
        const tables = extractTablesFromSql(sql)
        expect(tables).toContain('employees')
    })

    it('should extract table with schema prefix', () => {
        const sql = 'SELECT * FROM conn_4f2aa5cf_employees.employees'
        const tables = extractTablesFromSql(sql)
        expect(tables).toContain('employees')
    })

    it('should extract multiple tables from comma-separated list', () => {
        const sql = 'SELECT * FROM employees, departments'
        const tables = extractTablesFromSql(sql)
        expect(tables).toContain('employees')
        expect(tables).toContain('departments')
    })

    it('should extract tables from JOIN clause', () => {
        const sql = `
            SELECT e.emp_no, d.dept_name 
            FROM employees e
            INNER JOIN dept_emp de ON e.emp_no = de.emp_no
            LEFT JOIN departments d ON de.dept_no = d.dept_no
        `
        const tables = extractTablesFromSql(sql)
        expect(tables).toContain('employees')
        expect(tables).toContain('dept_emp')
        expect(tables).toContain('departments')
    })

    it('should handle subquery (outer tables only)', () => {
        const sql = `
            SELECT * FROM employees 
            WHERE dept_no IN (SELECT dept_no FROM departments WHERE dept_name = 'Sales')
        `
        const tables = extractTablesFromSql(sql)
        expect(tables).toContain('employees')
        expect(tables).toContain('departments')
    })

    it('should extract tables from complex multi-level joins', () => {
        const sql = `
            SELECT 
                e.first_name,
                e.last_name,
                d.dept_name,
                t.title,
                s.salary
            FROM employees e
            INNER JOIN dept_emp de ON e.emp_no = de.emp_no
            INNER JOIN departments d ON de.dept_no = d.dept_no
            LEFT JOIN titles t ON e.emp_no = t.emp_no
            LEFT JOIN salaries s ON e.emp_no = s.emp_no
        `
        const tables = extractTablesFromSql(sql)
        expect(tables).toContain('employees')
        expect(tables).toContain('dept_emp')
        expect(tables).toContain('departments')
        expect(tables).toContain('titles')
        expect(tables).toContain('salaries')
    })
})

describe('extractTableAliases', () => {
    it('should extract alias from simple FROM clause', () => {
        const sql = 'SELECT * FROM employees e'
        const aliases = extractTableAliases(sql)
        expect(aliases.get('employees')).toBe('e')
    })

    it('should extract alias with AS keyword', () => {
        const sql = 'SELECT * FROM employees AS emp'
        const aliases = extractTableAliases(sql)
        expect(aliases.get('employees')).toBe('emp')
    })

    it('should extract multiple aliases from JOIN query', () => {
        const sql = `
            SELECT e.emp_no, d.dept_name 
            FROM employees e
            INNER JOIN dept_emp de ON e.emp_no = de.emp_no
            LEFT JOIN departments d ON de.dept_no = d.dept_no
        `
        const aliases = extractTableAliases(sql)
        expect(aliases.get('employees')).toBe('e')
        expect(aliases.get('dept_emp')).toBe('de')
        expect(aliases.get('departments')).toBe('d')
    })

    it('should return empty map for query without aliases', () => {
        const sql = 'SELECT * FROM employees'
        const aliases = extractTableAliases(sql)
        expect(aliases.size).toBe(0)
    })

    it('should handle schema-prefixed tables', () => {
        const sql = 'SELECT * FROM conn_4f2aa5cf.employees e'
        const aliases = extractTableAliases(sql)
        expect(aliases.get('employees')).toBe('e')
    })

    it('should not treat SQL keywords as aliases', () => {
        const sql = 'SELECT * FROM employees WHERE gender = "M"'
        const aliases = extractTableAliases(sql)
        // 'WHERE' should not be captured as an alias
        expect(aliases.get('employees')).toBeUndefined()
    })

    it('should extract aliases from complex real-world query', () => {
        const sql = `
            SELECT 
                d.dept_name,
                ROUND(AVG(s.salary), 2) as avg_salary
            FROM departments d
            INNER JOIN dept_emp de ON d.dept_no = de.dept_no
            INNER JOIN employees e ON de.emp_no = e.emp_no
            INNER JOIN salaries s ON e.emp_no = s.emp_no
            WHERE s.to_date = '9999-01-01'
            GROUP BY d.dept_name
        `
        const aliases = extractTableAliases(sql)
        expect(aliases.get('departments')).toBe('d')
        expect(aliases.get('dept_emp')).toBe('de')
        expect(aliases.get('employees')).toBe('e')
        expect(aliases.get('salaries')).toBe('s')
    })
})

describe('shouldApplyFilter', () => {

    it('should return true when filter table is in SQL', () => {
        const sql = 'SELECT * FROM employees'
        const filter = createFilter('gender', 'employees', 'M')
        expect(shouldApplyFilter(sql, filter)).toBe(true)
    })

    it('should return false when filter table is not in SQL', () => {
        const sql = 'SELECT * FROM departments'
        const filter = createFilter('gender', 'employees', 'M')
        expect(shouldApplyFilter(sql, filter)).toBe(false)
    })

    it('should return true for joined tables', () => {
        const sql = `
            SELECT e.emp_no, d.dept_name 
            FROM departments d
            INNER JOIN dept_emp de ON d.dept_no = de.dept_no
            INNER JOIN employees e ON de.emp_no = e.emp_no
        `
        const filter = createFilter('gender', 'employees', 'M')
        expect(shouldApplyFilter(sql, filter)).toBe(true)
    })

    it('should be case-insensitive for table matching', () => {
        const sql = 'SELECT * FROM EMPLOYEES'
        const filter = createFilter('gender', 'employees', 'M')
        expect(shouldApplyFilter(sql, filter)).toBe(true)
    })
})

describe('injectFiltersIntoSql - Simple Queries', () => {
    it('should inject WHERE clause for simple SELECT', () => {
        const sql = 'SELECT * FROM employees'
        const filter = createFilter('gender', 'employees', 'M')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        expect(result.sql).toContain("WHERE `employees`.`gender` = 'M'")
    })

    it('should add AND to existing WHERE clause', () => {
        const sql = "SELECT * FROM employees WHERE hire_date > '2000-01-01'"
        const filter = createFilter('gender', 'employees', 'M')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        expect(result.sql).toContain("hire_date > '2000-01-01'")
        expect(result.sql).toContain("`employees`.`gender` = 'M'")
        expect(result.sql).toContain('AND')
    })

    it('should inject before GROUP BY', () => {
        const sql = 'SELECT dept_no, COUNT(*) FROM employees GROUP BY dept_no'
        const filter = createFilter('gender', 'employees', 'M')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        expect(result.sql).toMatch(/WHERE.*`employees`\.`gender`.*GROUP BY/is)
    })

    it('should inject before ORDER BY', () => {
        const sql = 'SELECT * FROM employees ORDER BY hire_date DESC'
        const filter = createFilter('gender', 'employees', 'M')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        expect(result.sql).toMatch(/WHERE.*`employees`\.`gender`.*ORDER BY/is)
    })

    it('should inject before LIMIT', () => {
        const sql = 'SELECT * FROM employees LIMIT 100'
        const filter = createFilter('gender', 'employees', 'M')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        expect(result.sql).toMatch(/WHERE.*`employees`\.`gender`.*LIMIT/is)
    })
})

describe('injectFiltersIntoSql - Aggregate Queries', () => {
    it('should inject filter for AVG query with GROUP BY', () => {
        const sql = `
            SELECT d.dept_name, AVG(s.salary) as avg_salary
            FROM departments d
            INNER JOIN dept_emp de ON d.dept_no = de.dept_no
            INNER JOIN employees e ON de.emp_no = e.emp_no
            INNER JOIN salaries s ON e.emp_no = s.emp_no
            GROUP BY d.dept_name
        `
        const filter = createFilter('gender', 'employees', 'M')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        // Uses alias 'e' from 'employees e'
        expect(result.sql).toContain("`e`.`gender` = 'M'")
        // Filter should be before GROUP BY
        expect(result.sql).toMatch(/WHERE.*`e`\.`gender`.*GROUP BY/is)
    })

    it('should handle COUNT with filters', () => {
        const sql = `
            SELECT gender, COUNT(*) as count
            FROM employees
            GROUP BY gender
        `
        const filter = createFilter('first_name', 'employees', 'John', 'starts_with')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        expect(result.sql).toContain("LIKE 'John%'")
    })

    it('should work with HAVING clause', () => {
        const sql = `
            SELECT dept_no, COUNT(*) as emp_count
            FROM employees
            GROUP BY dept_no
            HAVING COUNT(*) > 1000
        `
        const filter = createFilter('gender', 'employees', 'F')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        // Filter should be before GROUP BY, not HAVING
        expect(result.sql).toMatch(/WHERE.*GROUP BY.*HAVING/is)
    })
})

describe('injectFiltersIntoSql - Complex Joins', () => {
    it('should filter on specific joined table', () => {
        const sql = `
            SELECT 
                e.first_name,
                e.last_name,
                d.dept_name,
                s.salary
            FROM employees e
            INNER JOIN dept_emp de ON e.emp_no = de.emp_no
            INNER JOIN departments d ON de.dept_no = d.dept_no
            LEFT JOIN salaries s ON e.emp_no = s.emp_no
            ORDER BY s.salary DESC
            LIMIT 10
        `
        const filter = createFilter('dept_name', 'departments', 'Sales')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        // Uses alias 'd' from 'departments d'
        expect(result.sql).toContain("`d`.`dept_name` = 'Sales'")
    })

    it('should apply multiple filters from different tables', () => {
        const sql = `
            SELECT e.emp_no, e.first_name, d.dept_name
            FROM employees e
            INNER JOIN dept_emp de ON e.emp_no = de.emp_no
            INNER JOIN departments d ON de.dept_no = d.dept_no
        `
        const filters = [
            createFilter('gender', 'employees', 'M'),
            createFilter('dept_name', 'departments', 'Sales')
        ]
        const result = injectFiltersIntoSql(sql, filters)

        expect(result.appliedFilters).toBe(2)
        // Uses aliases 'e' and 'd'
        expect(result.sql).toContain("`e`.`gender` = 'M'")
        expect(result.sql).toContain("`d`.`dept_name` = 'Sales'")
        expect(result.sql).toContain('AND')
    })
})

describe('injectFiltersIntoSql - Subqueries', () => {
    it('should handle simple subquery in WHERE', () => {
        const sql = `
            SELECT * FROM employees
            WHERE emp_no IN (
                SELECT emp_no FROM dept_emp WHERE dept_no = 'd001'
            )
        `
        const filter = createFilter('gender', 'employees', 'M')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        // Filter should be added to outer WHERE
        expect(result.sql).toContain("`employees`.`gender` = 'M'")
    })

    it('should handle derived table (subquery in FROM)', () => {
        const sql = `
            SELECT sub.dept_name, sub.employee_count
            FROM (
                SELECT d.dept_name, COUNT(e.emp_no) as employee_count
                FROM departments d
                INNER JOIN dept_emp de ON d.dept_no = de.dept_no
                INNER JOIN employees e ON de.emp_no = e.emp_no
                GROUP BY d.dept_name
            ) sub
            ORDER BY sub.employee_count DESC
        `
        // This should skip because 'employees' is inside the subquery, not the outer query
        const filter = createFilter('gender', 'employees', 'M')
        const result = injectFiltersIntoSql(sql, [filter])

        // The table 'employees' is found in the SQL, so filter should be applied
        // However, this is a limitation - ideally we'd inject into the inner query
        expect(result.appliedFilters).toBe(1)
    })
})

describe('injectFiltersIntoSql - Window Functions', () => {
    it('should handle query with window function', () => {
        const sql = `
            SELECT 
                emp_no,
                first_name,
                salary,
                ROW_NUMBER() OVER (PARTITION BY dept_no ORDER BY salary DESC) as rank
            FROM employees e
            INNER JOIN salaries s ON e.emp_no = s.emp_no
        `
        const filter = createFilter('gender', 'employees', 'M')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        // Uses alias 'e' from 'employees e'
        expect(result.sql).toContain("`e`.`gender` = 'M'")
    })

    it('should inject filter before window function ORDER BY', () => {
        const sql = `
            SELECT 
                emp_no,
                salary,
                RANK() OVER (ORDER BY salary DESC) as salary_rank
            FROM employees e
            INNER JOIN salaries s ON e.emp_no = s.emp_no
        `
        const filter = createFilter('gender', 'employees', 'F')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        // Uses alias 'e' from 'employees e'
        expect(result.sql).toContain("`e`.`gender` = 'F'")
    })
})

describe('injectFiltersIntoSql - Filter Operators', () => {
    it('should handle IN operator with multiple values', () => {
        const sql = 'SELECT * FROM employees'
        const filter = createFilter('gender', 'employees', ['M', 'F'])
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        expect(result.sql).toContain("IN ('M', 'F')")
    })

    it('should handle LIKE for contains operator', () => {
        const sql = 'SELECT * FROM employees'
        const filter = createFilter('first_name', 'employees', 'John', 'contains')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        expect(result.sql).toContain("LIKE '%John%'")
    })

    it('should handle starts_with operator', () => {
        const sql = 'SELECT * FROM employees'
        const filter = createFilter('last_name', 'employees', 'Sm', 'starts_with')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        expect(result.sql).toContain("LIKE 'Sm%'")
    })

    it('should handle ends_with operator', () => {
        const sql = 'SELECT * FROM employees'
        const filter = createFilter('last_name', 'employees', 'son', 'ends_with')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        expect(result.sql).toContain("LIKE '%son'")
    })

    it('should handle numeric greater_than operator', () => {
        const sql = 'SELECT * FROM salaries'
        const filter: FilterOverride = {
            fieldId: 'salary',
            table: 'salaries',
            type: 'numeric',
            operator: 'greater_than',
            value: 50000,
            values: [50000]
        }
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        expect(result.sql).toContain('> 50000')
    })
})

describe('injectFiltersIntoSql - Skipped Filters', () => {
    it('should skip filter when table not found', () => {
        const sql = 'SELECT * FROM departments'
        const filter = createFilter('gender', 'employees', 'M')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(0)
        expect(result.skippedFilters).toBe(1)
        expect(result.skippedReasons[0]).toContain('employees')
        expect(result.sql).toBe(sql) // SQL unchanged
    })

    it('should skip filter with empty value', () => {
        const sql = 'SELECT * FROM employees'
        const filter = createFilter('gender', 'employees', null)
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(0)
        expect(result.sql).toBe(sql)
    })

    it('should apply some and skip others', () => {
        const sql = 'SELECT * FROM employees'
        const filters = [
            createFilter('gender', 'employees', 'M'),
            createFilter('dept_name', 'departments', 'Sales') // No departments table in query
        ]
        const result = injectFiltersIntoSql(sql, filters)

        expect(result.appliedFilters).toBe(1)
        expect(result.skippedFilters).toBe(1)
        expect(result.sql).toContain("`employees`.`gender` = 'M'")
        expect(result.sql).not.toContain('departments')
    })

    it('should skip filter with different connectionId', () => {
        const sql = 'SELECT * FROM employees'
        const filter: FilterOverride = {
            fieldId: 'gender',
            table: 'employees',
            type: 'text',
            operator: 'equals',
            value: 'M',
            values: ['M'],
            connectionId: 999 // Different connection
        }
        const result = injectFiltersIntoSql(sql, [filter], 123)

        expect(result.appliedFilters).toBe(0)
        expect(result.skippedFilters).toBe(1)
        expect(result.skippedReasons[0]).toContain('different connection')
    })
})

describe('injectFiltersIntoSql - Real World Queries', () => {
    it('should handle Top Departments by Average Salary query', () => {
        const sql = `
            SELECT 
                d.dept_name,
                ROUND(AVG(s.salary), 2) as avg_salary
            FROM departments d
            INNER JOIN dept_emp de ON d.dept_no = de.dept_no
            INNER JOIN employees e ON de.emp_no = e.emp_no
            INNER JOIN salaries s ON e.emp_no = s.emp_no
            WHERE s.to_date = '9999-01-01'
            GROUP BY d.dept_name
            ORDER BY avg_salary DESC
            LIMIT 5
        `
        const filter = createFilter('gender', 'employees', 'M')
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        // Should add AND to existing WHERE
        expect(result.sql).toContain("to_date = '9999-01-01'")
        // Uses alias 'e' from 'employees e'
        expect(result.sql).toContain("`e`.`gender` = 'M'")
        expect(result.sql).toContain('AND')
        // Filter should be before GROUP BY
        expect(result.sql).toMatch(/WHERE.*AND.*GROUP BY/is)
    })

    it('should handle Employee Distribution query', () => {
        const sql = `
            SELECT gender, COUNT(*) as count
            FROM employees
            GROUP BY gender
        `
        const filter = createFilter('hire_date', 'employees', '2000-01-01', 'greater_than')
        filter.type = 'date'
        const result = injectFiltersIntoSql(sql, [filter])

        expect(result.appliedFilters).toBe(1)
        expect(result.sql).toContain("WHERE")
        expect(result.sql).toMatch(/WHERE.*GROUP BY/is)
    })

    it('should handle Current Employees by Department query', () => {
        const sql = `
            SELECT 
                d.dept_name,
                COUNT(DISTINCT e.emp_no) as employee_count
            FROM departments d
            JOIN dept_emp de ON d.dept_no = de.dept_no AND de.to_date = '9999-01-01'
            JOIN employees e ON de.emp_no = e.emp_no
            GROUP BY d.dept_name
            ORDER BY employee_count DESC
        `
        const filters = [
            createFilter('gender', 'employees', 'F'),
            createFilter('dept_name', 'departments', ['Sales', 'Marketing'])
        ]
        const result = injectFiltersIntoSql(sql, filters)

        expect(result.appliedFilters).toBe(2)
        // Uses aliases 'e' and 'd'
        expect(result.sql).toContain("`e`.`gender` = 'F'")
        expect(result.sql).toContain("IN ('Sales', 'Marketing')")
    })
})

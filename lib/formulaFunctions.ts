// Formula functions available for calculated custom fields
// Based on original Optiqo app function list

export type FunctionCategory = 'Aggregation' | 'Date' | 'Text' | 'Number' | 'Logic'

export interface FormulaFunction {
    name: string
    category: FunctionCategory
    signature: string
    description: string
    examples: string[]
}

export const formulaFunctions: FormulaFunction[] = [
    // Aggregation Functions
    {
        name: 'AVG',
        category: 'Aggregation',
        signature: 'AVG(expression)',
        description: 'Returns the average of all the values. NULLs are ignored.',
        examples: ['AVG([Sales])', 'AVG([Price] * [Quantity])']
    },
    {
        name: 'COUNT',
        category: 'Aggregation',
        signature: 'COUNT(expression)',
        description: 'Returns the count of items in a group.',
        examples: ['COUNT([OrderID])', 'COUNT(*)']
    },
    {
        name: 'COUNTD',
        category: 'Aggregation',
        signature: 'COUNTD(expression)',
        description: 'Returns the count of distinct items in a group.',
        examples: ['COUNTD([CustomerID])', 'COUNTD([Category])']
    },
    {
        name: 'SUM',
        category: 'Aggregation',
        signature: 'SUM(expression)',
        description: 'Returns the sum of all values. NULLs are ignored.',
        examples: ['SUM([Sales])', 'SUM([Quantity] * [UnitPrice])']
    },
    {
        name: 'MIN',
        category: 'Aggregation',
        signature: 'MIN(expression)',
        description: 'Returns the minimum value.',
        examples: ['MIN([Price])', 'MIN([OrderDate])']
    },
    {
        name: 'MAX',
        category: 'Aggregation',
        signature: 'MAX(expression)',
        description: 'Returns the maximum value.',
        examples: ['MAX([Price])', 'MAX([OrderDate])']
    },
    {
        name: 'SUMIF',
        category: 'Aggregation',
        signature: 'SUMIF(expression, condition)',
        description: 'Returns the sum of values that meet the condition.',
        examples: ['SUMIF([Sales], [Region] = "West")']
    },
    {
        name: 'AVERAGEIF',
        category: 'Aggregation',
        signature: 'AVERAGEIF(expression, condition)',
        description: 'Returns the average of values that meet the condition.',
        examples: ['AVERAGEIF([Sales], [Status] = "Complete")']
    },

    // Date Functions
    {
        name: 'DATE',
        category: 'Date',
        signature: 'DATE(year, month, day)',
        description: 'Creates a date from year, month, and day components.',
        examples: ['DATE(2024, 12, 25)', 'DATE([Year], [Month], 1)']
    },
    {
        name: 'DATEADD',
        category: 'Date',
        signature: 'DATEADD(date, interval, number)',
        description: 'Adds an interval to a date. Interval can be: year, quarter, month, week, day, hour, minute, second.',
        examples: ['DATEADD([OrderDate], "month", 1)', 'DATEADD(NOW(), "day", -7)']
    },
    {
        name: 'DATEDIFF',
        category: 'Date',
        signature: 'DATEDIFF(date1, date2, interval)',
        description: 'Returns the difference between two dates in the specified interval.',
        examples: ['DATEDIFF([StartDate], [EndDate], "day")', 'DATEDIFF([OrderDate], NOW(), "month")']
    },
    {
        name: 'DATEPART',
        category: 'Date',
        signature: 'DATEPART(interval, date)',
        description: 'Returns an integer representing the specified part of a date.',
        examples: ['DATEPART("year", [OrderDate])', 'DATEPART("month", NOW())']
    },
    {
        name: 'DAY',
        category: 'Date',
        signature: 'DAY(date)',
        description: 'Returns the day of the month as an integer from 1 to 31.',
        examples: ['DAY([OrderDate])', 'DAY(NOW())']
    },
    {
        name: 'MONTH',
        category: 'Date',
        signature: 'MONTH(date)',
        description: 'Returns the month as an integer from 1 to 12.',
        examples: ['MONTH([OrderDate])', 'MONTH(NOW())']
    },
    {
        name: 'YEAR',
        category: 'Date',
        signature: 'YEAR(date)',
        description: 'Returns the year as an integer.',
        examples: ['YEAR([OrderDate])', 'YEAR(NOW())']
    },
    {
        name: 'NOW',
        category: 'Date',
        signature: 'NOW()',
        description: 'Returns the current date and time.',
        examples: ['NOW()', 'DATEDIFF([OrderDate], NOW(), "day")']
    },
    {
        name: 'TODAY',
        category: 'Date',
        signature: 'TODAY()',
        description: 'Returns the current date without time.',
        examples: ['TODAY()', 'DATEDIFF([OrderDate], TODAY(), "day")']
    },

    // Text Functions
    {
        name: 'CONCAT',
        category: 'Text',
        signature: 'CONCAT(string1, string2, ...)',
        description: 'Concatenates two or more strings.',
        examples: ['CONCAT([FirstName], " ", [LastName])', 'CONCAT([City], ", ", [Country])']
    },
    {
        name: 'CONTAINS',
        category: 'Text',
        signature: 'CONTAINS(string, substring)',
        description: 'Returns true if the string contains the substring.',
        examples: ['CONTAINS([ProductName], "Pro")', 'CONTAINS([Email], "@gmail.com")']
    },
    {
        name: 'LEFT',
        category: 'Text',
        signature: 'LEFT(string, number)',
        description: 'Returns the leftmost characters from a string.',
        examples: ['LEFT([ProductCode], 3)', 'LEFT([Name], 1)']
    },
    {
        name: 'RIGHT',
        category: 'Text',
        signature: 'RIGHT(string, number)',
        description: 'Returns the rightmost characters from a string.',
        examples: ['RIGHT([ProductCode], 4)', 'RIGHT([Phone], 4)']
    },
    {
        name: 'LENGTH',
        category: 'Text',
        signature: 'LENGTH(string)',
        description: 'Returns the number of characters in a string.',
        examples: ['LENGTH([Name])', 'LENGTH([Description])']
    },
    {
        name: 'LOWER',
        category: 'Text',
        signature: 'LOWER(string)',
        description: 'Converts a string to lowercase.',
        examples: ['LOWER([Email])', 'LOWER([Category])']
    },
    {
        name: 'UPPER',
        category: 'Text',
        signature: 'UPPER(string)',
        description: 'Converts a string to uppercase.',
        examples: ['UPPER([State])', 'UPPER([ProductCode])']
    },
    {
        name: 'TRIM',
        category: 'Text',
        signature: 'TRIM(string)',
        description: 'Removes leading and trailing whitespace.',
        examples: ['TRIM([Name])', 'TRIM([Address])']
    },
    {
        name: 'REPLACE',
        category: 'Text',
        signature: 'REPLACE(string, old, new)',
        description: 'Replaces occurrences of a substring with another string.',
        examples: ['REPLACE([Phone], "-", "")', 'REPLACE([Name], "Corp", "Corporation")']
    },
    {
        name: 'SPLIT',
        category: 'Text',
        signature: 'SPLIT(string, delimiter, index)',
        description: 'Splits a string by delimiter and returns the part at the specified index.',
        examples: ['SPLIT([FullName], " ", 0)', 'SPLIT([Address], ",", 1)']
    },

    // Number Functions
    {
        name: 'ABS',
        category: 'Number',
        signature: 'ABS(number)',
        description: 'Returns the absolute value of a number.',
        examples: ['ABS([Profit])', 'ABS([Quantity] - [Sold])']
    },
    {
        name: 'CEIL',
        category: 'Number',
        signature: 'CEIL(number)',
        description: 'Rounds a number up to the nearest integer.',
        examples: ['CEIL([Price])', 'CEIL([Discount] / 10)']
    },
    {
        name: 'FLOOR',
        category: 'Number',
        signature: 'FLOOR(number)',
        description: 'Rounds a number down to the nearest integer.',
        examples: ['FLOOR([Price])', 'FLOOR([Quantity] / 12)']
    },
    {
        name: 'ROUND',
        category: 'Number',
        signature: 'ROUND(number, decimals)',
        description: 'Rounds a number to the specified number of decimal places.',
        examples: ['ROUND([Price], 2)', 'ROUND([Percentage], 1)']
    },
    {
        name: 'POWER',
        category: 'Number',
        signature: 'POWER(base, exponent)',
        description: 'Returns the result of raising a number to a power.',
        examples: ['POWER([Value], 2)', 'POWER(10, [Exponent])']
    },
    {
        name: 'SQRT',
        category: 'Number',
        signature: 'SQRT(number)',
        description: 'Returns the square root of a number.',
        examples: ['SQRT([Value])', 'SQRT([Area])']
    },
    {
        name: 'MOD',
        category: 'Number',
        signature: 'MOD(dividend, divisor)',
        description: 'Returns the remainder after division.',
        examples: ['MOD([Quantity], 12)', 'MOD([Row], 2)']
    },
    {
        name: 'LOG',
        category: 'Number',
        signature: 'LOG(number, base)',
        description: 'Returns the logarithm of a number to the specified base.',
        examples: ['LOG([Value], 10)', 'LOG([Count], 2)']
    },
    {
        name: 'SIN',
        category: 'Number',
        signature: 'SIN(number)',
        description: 'Returns the sine of an angle (in radians).',
        examples: ['SIN([Angle])', 'SIN(3.14159)']
    },
    {
        name: 'COS',
        category: 'Number',
        signature: 'COS(number)',
        description: 'Returns the cosine of an angle (in radians).',
        examples: ['COS([Angle])', 'COS(0)']
    },
    {
        name: 'TAN',
        category: 'Number',
        signature: 'TAN(number)',
        description: 'Returns the tangent of an angle (in radians).',
        examples: ['TAN([Angle])', 'TAN(0.785)']
    },

    // Logic Functions
    {
        name: 'AND',
        category: 'Logic',
        signature: 'AND(condition1, condition2, ...)',
        description: 'Returns true if all conditions are true.',
        examples: ['AND([Sales] > 1000, [Region] = "West")', 'AND([Status] = "Active", [Type] = "Premium")']
    },
    {
        name: 'OR',
        category: 'Logic',
        signature: 'OR(condition1, condition2, ...)',
        description: 'Returns true if any condition is true.',
        examples: ['OR([Status] = "New", [Status] = "Pending")', 'OR([Region] = "East", [Region] = "West")']
    },
    {
        name: 'NOT',
        category: 'Logic',
        signature: 'NOT(condition)',
        description: 'Returns the logical opposite of the condition.',
        examples: ['NOT([IsActive])', 'NOT([Status] = "Cancelled")']
    },
    {
        name: 'IF',
        category: 'Logic',
        signature: 'IF(condition, then_value, else_value)',
        description: 'Returns one value if the condition is true, another if false.',
        examples: ['IF([Sales] > 1000, "High", "Low")', 'IF([Discount] > 0, [Price] * (1 - [Discount]), [Price])']
    },
    {
        name: 'IIF',
        category: 'Logic',
        signature: 'IIF(condition, then_value, else_value)',
        description: 'Alias for IF. Returns one value if the condition is true, another if false.',
        examples: ['IIF([Quantity] > 0, "In Stock", "Out of Stock")']
    },
    {
        name: 'CASE',
        category: 'Logic',
        signature: 'CASE WHEN condition1 THEN value1 WHEN condition2 THEN value2 ELSE default END',
        description: 'Evaluates multiple conditions and returns corresponding values.',
        examples: ['CASE WHEN [Score] >= 90 THEN "A" WHEN [Score] >= 80 THEN "B" ELSE "C" END']
    },
    {
        name: 'IFNULL',
        category: 'Logic',
        signature: 'IFNULL(expression, replacement)',
        description: 'Returns the replacement value if the expression is NULL.',
        examples: ['IFNULL([Discount], 0)', 'IFNULL([MiddleName], "")']
    },
    {
        name: 'ISNULL',
        category: 'Logic',
        signature: 'ISNULL(expression)',
        description: 'Returns true if the expression is NULL.',
        examples: ['ISNULL([MiddleName])', 'ISNULL([EndDate])']
    },
    {
        name: 'IN',
        category: 'Logic',
        signature: 'IN(value, list)',
        description: 'Returns true if the value is in the list.',
        examples: ['IN([Status], ["Active", "Pending", "Processing"])', 'IN([Category], [SelectedCategories])']
    }
]

export const functionCategories: FunctionCategory[] = ['Aggregation', 'Date', 'Text', 'Number', 'Logic']

export function getFunctionsByCategory(category: FunctionCategory): FormulaFunction[] {
    return formulaFunctions.filter(f => f.category === category)
}

export function searchFunctions(query: string): FormulaFunction[] {
    const q = query.toLowerCase().trim()
    if (!q) return formulaFunctions
    return formulaFunctions.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
    )
}

# Chart Builder Debug Panel

## Overview

The Chart Builder includes a debug panel that allows developers to test chart configurations by pasting JSON directly into the builder. This is useful for:

- Testing specific chart configurations without manual UI setup
- Reproducing reported chart issues
- Validating chart builder functionality across different chart types
- Rapid iteration during development

## Enabling the Debug Panel

The debug panel is only visible when `DEBUG_ENV=true` is set in your `.env` file:

```bash
# .env
DEBUG_ENV=true
```

After changing this value, restart the Nuxt development server.

## Accessing the Debug Panel

1. Navigate to the Chart Builder: `/reporting/builder`
2. Disable **AI Mode** (the debug panel is not available in AI mode)
3. Look for the **"Debug: JSON Chart Config"** expandable section below the chart type selector
4. Click to expand the panel

## Using the Debug Panel

### Panel Features

| Button | Description |
|--------|-------------|
| **Apply Config** | Parses the JSON and applies it to the chart builder, then runs a preview |
| **Export Current** | Exports the current chart state as JSON to the textarea |

### JSON Configuration Format

The debug panel accepts a JSON object with the following structure:

```json
{
  "chartType": "column",
  "chartTitle": "My Chart Title",
  "xDimensions": [
    {
      "fieldId": "column_name",
      "name": "column_name",
      "label": "Display Label",
      "type": "varchar",
      "table": "table_name"
    }
  ],
  "yMetrics": [
    {
      "fieldId": "metric_column",
      "name": "metric_column",
      "label": "Metric Label",
      "type": "int",
      "table": "table_name",
      "aggregation": "COUNT",
      "isNumeric": true
    }
  ],
  "breakdowns": [
    {
      "fieldId": "breakdown_column",
      "name": "breakdown_column",
      "label": "Breakdown Label",
      "type": "varchar",
      "table": "table_name"
    }
  ],
  "filters": [],
  "joins": [
    {
      "constraintName": "fk_name",
      "sourceTable": "source_table",
      "targetTable": "target_table",
      "joinType": "inner",
      "columnPairs": [
        {
          "position": 1,
          "sourceColumn": "source_col",
          "targetColumn": "target_col"
        }
      ]
    }
  ],
  "appearance": {
    "showLegend": true,
    "legendPosition": "top",
    "showLabels": true
  }
}
```

### Supported Chart Types

- `table` - Data table
- `number` - Single number/KPI
- `column` - Vertical bar chart
- `bar` - Horizontal bar chart
- `stacked` - Stacked column chart
- `line` - Line chart
- `area` - Area chart
- `pie` - Pie chart
- `donut` - Donut chart
- `funnel` - Funnel chart
- `gauge` - Gauge chart
- `kpi` - KPI card
- `radar` - Radar chart
- `scatter` - Scatter plot
- `bubble` - Bubble chart
- `boxplot` - Box plot
- `waterfall` - Waterfall chart
- `treemap` - Treemap
- `sankey` - Sankey diagram
- `pivot` - Pivot table
- `wordcloud` - Word cloud

### Field Types

Common field types for dimensions and metrics:

- `varchar` - String/text
- `int`, `smallint`, `tinyint`, `bigint` - Integer types
- `decimal`, `float`, `double` - Numeric types
- `datetime`, `timestamp`, `date` - Date/time types
- `enum` - Enumerated values

### Aggregation Types

Available aggregations for metrics:

- `COUNT` - Count of rows
- `SUM` - Sum of values
- `AVG` - Average
- `MIN` - Minimum value
- `MAX` - Maximum value
- `COUNT_DISTINCT` - Count of unique values

## Sample Configurations

Pre-built sample configurations are available at:

```
docs/examples/chart-configs/sakila-sample-configs.json
```

### Using Sample Configs

1. Open the sample configs file
2. Find the config you want to test
3. Copy the **inner `config` object** (not the wrapper)
4. Paste into the debug panel textarea
5. Click **Apply Config**

**Important:** Copy only the `config` object, not the full JSON with `name` and `description` wrappers.

### Example: Column Chart

```json
{
  "chartType": "column",
  "chartTitle": "Films by Category",
  "xDimensions": [
    {
      "fieldId": "name",
      "name": "name",
      "label": "Category",
      "type": "varchar",
      "table": "category"
    }
  ],
  "yMetrics": [
    {
      "fieldId": "film_id",
      "name": "film_id",
      "label": "Film Count",
      "type": "smallint",
      "table": "film_category",
      "aggregation": "COUNT",
      "isNumeric": true
    }
  ],
  "breakdowns": [],
  "filters": [],
  "joins": [
    {
      "constraintName": "fk_film_category_category",
      "sourceTable": "film_category",
      "targetTable": "category",
      "joinType": "inner",
      "columnPairs": [{"position": 1, "sourceColumn": "category_id", "targetColumn": "category_id"}]
    }
  ],
  "appearance": {
    "showLegend": false,
    "showLabels": true
  }
}
```

### Example: Column Chart with Breakdown

```json
{
  "chartType": "column",
  "chartTitle": "Films by Rental Duration & Rating",
  "xDimensions": [
    {
      "fieldId": "rental_duration",
      "name": "rental_duration",
      "label": "Rental Duration",
      "type": "tinyint",
      "table": "film"
    }
  ],
  "yMetrics": [
    {
      "fieldId": "film_id",
      "name": "film_id",
      "label": "Film Count",
      "type": "smallint",
      "table": "film",
      "aggregation": "COUNT",
      "isNumeric": true
    }
  ],
  "breakdowns": [
    {
      "fieldId": "rating",
      "name": "rating",
      "label": "Rating",
      "type": "enum",
      "table": "film"
    }
  ],
  "filters": [],
  "joins": [],
  "appearance": {
    "showLegend": true,
    "legendPosition": "top",
    "showLabels": false
  }
}
```

### Example: Pie Chart

```json
{
  "chartType": "pie",
  "chartTitle": "Films by Rating",
  "xDimensions": [
    {
      "fieldId": "rating",
      "name": "rating",
      "label": "Rating",
      "type": "enum",
      "table": "film"
    }
  ],
  "yMetrics": [
    {
      "fieldId": "film_id",
      "name": "film_id",
      "label": "Film Count",
      "type": "smallint",
      "table": "film",
      "aggregation": "COUNT",
      "isNumeric": true
    }
  ],
  "breakdowns": [],
  "filters": [],
  "joins": [],
  "appearance": {
    "showLegend": true,
    "legendPosition": "right",
    "showLabels": true
  }
}
```

## Troubleshooting

### "Config applied successfully!" but no chart appears

1. **Check Data Connection:** Ensure a data connection is selected in the sidebar
2. **Check Console:** Open browser DevTools and look for `[Debug Config]` log messages
3. **Verify Table Names:** Ensure table names in the config match your data source

### Join Errors

If you see errors like "Unknown column 'table.column' in 'ON'":

1. **Simplify Joins:** Try using configs that use a single table (no joins required)
2. **Check Join Order:** Ensure source and target tables are correctly specified
3. **Verify Column Names:** Check that column names match the actual database schema

### Invalid JSON Error

1. Use a JSON validator to check syntax
2. Ensure all strings are properly quoted
3. Check for trailing commas

## Console Logging

When a config is applied, the following messages appear in the browser console:

```
[Debug Config] Applied config: [object Object]
[Debug Config] Running preview...
[Debug Config] Preview complete, rows: 16
```

This helps verify that:
1. The config was parsed successfully
2. The preview query was executed
3. How many rows were returned

## Implementation Details

The debug panel is implemented in:

- **Component:** `components/reporting/ReportingBuilder.vue`
- **Functions:** `applyDebugConfig()`, `exportCurrentConfig()`
- **State:** `debugJsonConfig`, `debugConfigError`, `debugConfigSuccess`

The panel uses the `UAccordion` component from NuxtUI for the expandable interface.


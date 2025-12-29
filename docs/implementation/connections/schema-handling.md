# Database Schema Handling

This document describes the implementation of database schema handling in Optiqo, including custom views, custom fields, and related functionality.

## Overview

The schema handling system allows users to:

1. Connect to external databases (MySQL, PostgreSQL, etc.)
2. Browse and select tables/columns from the connected database
3. Create **custom views** (SQL-based virtual tables)
4. Create **custom fields** (calculated expressions or merged dimensions)

## Data Model

### data_connections Table

The `data_connections` table stores all database connection information and schema metadata.

```typescript
// Key schema-related columns in data_connections:
schemaJson: jsonb('schema_json')           // Selected tables/columns
autoJoinInfo: jsonb('auto_join_info')      // Auto-computed join paths
customViews: jsonb('custom_views')         // SQL-based virtual tables
customFields: jsonb('custom_fields')       // Calculated/merged fields
```

#### schemaJson Structure

```json
{
  "tables": [
    {
      "tableId": "orders",
      "columns": [
        {
          "fieldId": "id",
          "name": "id",
          "type": "integer"
        },
        {
          "fieldId": "customer_id",
          "name": "customer_id",
          "type": "integer"
        }
      ]
    }
  ]
}
```

#### customViews Structure

```json
[
  {
    "id": "cv_unique_id",
    "name": "Monthly Sales Summary",
    "sql": "SELECT month, SUM(amount) as total FROM orders GROUP BY month",
    "columns": [
      {
        "name": "month",
        "type": "text"
      },
      {
        "name": "total",
        "type": "number"
      }
    ]
  }
]
```

#### customFields Structure

```json
[
  {
    "id": "cf_unique_id",
    "name": "Profit Margin",
    "type": "calculated",
    "formula": "([Revenue] - [Cost]) / [Revenue] * 100",
    "resultType": "number"
  },
  {
    "id": "cf_merged_id",
    "name": "Full Location",
    "type": "merged",
    "sourceFields": [
      {
        "tableName": "customers",
        "fieldName": "city"
      },
      {
        "tableName": "customers",
        "fieldName": "state"
      }
    ],
    "joinType": "cross",
    "resultType": "text"
  }
]
```

#### customReferences Structure

Custom references allow users to define additional table relationships beyond the database's foreign keys. These are stored within `schemaJson.customReferences`:

```json
[
  {
    "id": "custom_1735123456789_abc123",
    "sourceTable": "orders",
    "sourceColumn": "product_code",
    "targetTable": "products",
    "targetColumn": "sku",
    "isCustom": true
  }
]
```

Custom references are automatically merged with database foreign keys when computing `auto_join_info`, enabling joins between tables that lack formal foreign key constraints.

---

## Components

### Schema Editor Page

**File:** `pages/schema-editor.vue`

Entry point for schema configuration. Loads full schema from connected database, displays SchemaSelector component, and handles saving. Navigates to References Editor on completion.

```
/schema-editor?id=<connection_id>
```

### References Editor Page

**File:** `pages/references-editor.vue`

Allows users to view existing foreign keys and add custom references. Uses a three-column layout:

- **Left panel:** Source table/column selector with expandable tables
- **Middle panel:** Target table/column selector (mirrored layout)
- **Right panel:** List of foreign keys (database + custom)

```
/references-editor?id=<connection_id>
```

**Components:**

- `components/references/ReferenceSelector.vue` - Table/column selector with search and type icons
- `components/references/ReferenceList.vue` - Displays relationships with delete for custom refs

### SchemaSelector Component

**File:** `components/reporting/SchemaSelector.vue`

Two-panel interface:

- **Left panel:** List of tables with checkboxes + custom views
- **Right panel:** List of fields for selected table + custom fields

Includes buttons:

- "+ Add custom view" - Opens AddCustomViewModal
- "+ Add Custom Field" - Opens AddCustomFieldModal

### AddCustomViewModal

**File:** `components/schema/AddCustomViewModal.vue`

Modal for creating SQL-based virtual tables:

- View name input
- SQL editor with line numbers
- "Format SQL" button
- "Show Preview" - executes query and displays results
- Tables sidebar for reference

### AddCustomFieldModal

**File:** `components/schema/AddCustomFieldModal.vue`

Modal with two tabs:

**Calculated Field Tab:**

- Field name input
- Formula editor (supports drag-drop from fields/functions)
- Functions list with categories (Aggregation, Date, Text, Number, Logic)
- Function documentation panel

**Merged Field Tab:**

- Field name input
- Drop zone for dimension fields
- Join type selection (Cross, Left, Right, Inner)

---

## API Endpoints

| Endpoint                          | Method | Description                              |
|-----------------------------------|--------|------------------------------------------|
| `/api/schema/custom-view-preview` | POST   | Execute SQL query and return preview     |
| `/api/schema/custom-view`         | POST   | Create or update custom view             |
| `/api/schema/custom-view`         | DELETE | Delete custom view                       |
| `/api/schema/custom-field`        | POST   | Create or update custom field            |
| `/api/schema/custom-field`        | DELETE | Delete custom field                      |
| `/api/schema/custom-references`   | POST   | Save custom references, recompute joins  |
| `/api/schema/custom-references`   | DELETE | Delete custom reference, recompute joins |
| `/api/reporting/full-schema`      | GET    | Get complete database schema with FKs    |
| `/api/reporting/connection`       | GET    | Get connection with schema info          |

All endpoints use `AuthHelper.requireConnectionAccess()` for authorization.

---

## Formula Functions

**File:** `lib/formulaFunctions.ts`

Defines 40+ functions for calculated fields:

| Category    | Functions                                                          |
|-------------|--------------------------------------------------------------------|
| Aggregation | AVG, COUNT, COUNTD, SUM, MIN, MAX, SUMIF, AVERAGEIF                |
| Date        | DATE, DATEADD, DATEDIFF, DATEPART, DAY, MONTH, YEAR, NOW, TODAY    |
| Text        | CONCAT, CONTAINS, LEFT, RIGHT, LENGTH, LOWER, UPPER, TRIM, REPLACE |
| Number      | ABS, CEIL, FLOOR, ROUND, POWER, SQRT, MOD, LOG, SIN, COS, TAN      |
| Logic       | AND, OR, NOT, IF, IIF, CASE, IFNULL, ISNULL, IN                    |

---

## Related Files

| File                                          | Purpose                                  |
|-----------------------------------------------|------------------------------------------|
| `lib/db/schema.ts`                            | Drizzle ORM schema definition            |
| `server/utils/connectionConfig.ts`            | Connection config loading                |
| `server/utils/mysqlClient.ts`                 | MySQL connection with SSH tunnel support |
| `server/utils/authHelper.ts`                  | Authentication and authorization         |
| `server/utils/schemaGraph.ts`                 | Graph algorithms for auto-join           |
| `pages/references-editor.vue`                 | References configuration page            |
| `components/references/ReferenceSelector.vue` | Table/column selector                    |
| `components/references/ReferenceList.vue`     | Foreign key list display                 |

---

## Migration

**File:** `supabase/migrations/20251225_add_custom_views_and_fields.sql`

```sql
ALTER TABLE data_connections
    ADD COLUMN IF NOT EXISTS custom_views JSONB DEFAULT '[]'::jsonb;

ALTER TABLE data_connections
    ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;
```

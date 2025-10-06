### Report Builder Manual

This guide explains how to use the Report Builder, how different column types are treated, and how queries are generated under the hood with equivalent SQL examples.

#### 1) Prerequisites
- Select a Data Connection (top-left dropdown). The builder loads tables (datasets) from the selected connection only.
- Optionally deep-link with: `?data_connection_id=123` and state `?r=...` (URL keeps your report state; it updates automatically).

#### 2) Pick a Dataset and Fields
- Choose a dataset (table) from the left list.
- Drag fields into zones:
  - X (Dimensions): categories to group by (e.g., `city`, `order_date`).
  - Y (Metrics): numeric (or countable) fields to aggregate (e.g., `amount`).
  - Breakdown: a secondary dimension to split series (e.g., `customer_type`).
  - Filters: constrain rows (equals, contains, in, between, is null, not null).

##### Column Types and Defaults
- Numeric (int, bigint, decimal, numeric, double, float): default aggregation = SUM.
- Non-numeric (text/char/varchar/etc.): default aggregation = COUNT.
- Date/time (date, datetime, timestamp): treated as dimensions when placed in X or Breakdown (bucketing/granularity can be extended later).
- Boolean/tinyint(1): treated as dimensions or COUNT if used as a metric.

#### 3) How Aggregation and Grouping Work
When you place fields into zones, the preview builds a query like:

```sql
-- Example: X = city, Y = amount (numeric)
SELECT city AS `city`, SUM(amount) AS `sum_amount`
FROM orders
GROUP BY city
LIMIT 100;
```

If Y is a non-numeric field (e.g., `order_id`), the builder defaults to COUNT:

```sql
-- Example: X = city, Y = order_id (non-numeric)
SELECT city AS `city`, COUNT(order_id) AS `count_order_id`
FROM orders
GROUP BY city
LIMIT 100;
```

With a Breakdown (e.g., by `customer_type`), multiple series are returned and charts display grouped/stacked series:

```sql
-- Example: X = city, Breakdown = customer_type, Y = amount
SELECT city AS `city`, customer_type AS `customer_type`, SUM(amount) AS `sum_amount`
FROM orders
GROUP BY city, customer_type
LIMIT 100;
```

If no X/Breakdown is set and you add only a metric, the preview returns a single aggregated row (KPI view eligible):

```sql
-- Example: only Y = amount
SELECT SUM(amount) AS `sum_amount`
FROM orders
LIMIT 100;
```

#### 4) Filters and Null Handling
- Filters map to safe SQL predicates:
  - equals → `field = ?`
  - contains → `field LIKE ?` with `%value%`
  - in → `field IN (?, ?, ...)`
  - between → `field BETWEEN ? AND ?`
  - is null → `field IS NULL`
  - is not null → `field IS NOT NULL`

- Exclude nulls in dimensions (toggle) adds `IS NOT NULL` for every dimension used in X and Breakdown, e.g.:

```sql
-- Example: exclude nulls on city and customer_type
WHERE city IS NOT NULL AND customer_type IS NOT NULL
```

#### 5) Joins (including Composite Foreign Keys)
Use the Joins panel to add INNER/LEFT joins from discovered relationships. For composite keys, the builder ANDs all column pairs, e.g.:

```sql
-- Relationship: orders(customer_id, store_id) → customers(id, store_id)
SELECT o.city, SUM(o.amount) AS `sum_amount`
FROM orders o
INNER JOIN customers c
  ON o.customer_id = c.id
 AND o.store_id = c.store_id
GROUP BY o.city
LIMIT 100;
```

Notes:
- The builder only constructs joins from relationships you select.
- Prevents Cartesian products by requiring at least one relationship or explicit join spec.

#### 6) Visualization
- Chart types: Table, Bar, Line, Pie, Donut, KPI.
- Appearance panel controls titles (chart/axes/legend), number formatting, color palette, stacked bars, and legend position.
- KPI appears when there’s a single aggregate and no dimensions.

#### 7) Examples
1) Bar: total sales by city
```sql
SELECT city AS `city`, SUM(amount) AS `sum_amount`
FROM orders
GROUP BY city
LIMIT 100;
```

2) Line: orders count by day (date dimension on X)
```sql
SELECT order_date AS `order_date`, COUNT(order_id) AS `count_order_id`
FROM orders
GROUP BY order_date
LIMIT 100;
```

3) Stacked bar: total sales by city, broken down by customer type
```sql
SELECT city AS `city`, customer_type AS `customer_type`, SUM(amount) AS `sum_amount`
FROM orders
GROUP BY city, customer_type
LIMIT 100;
```

4) With filters and null exclusion
```sql
SELECT city AS `city`, SUM(amount) AS `sum_amount`
FROM orders
WHERE city IS NOT NULL
  AND status = 'completed'
  AND customer_name LIKE '%smith%'
LIMIT 100;
```

#### 8) Saving and Loading
- Use Save / Load to store report definitions (state) in Supabase and reload later.
- Auth is required; RLS ensures only owners can access their saved reports.

#### 9) Custom SQL Mode (Read-Only)
- Toggle Custom SQL to run SELECT queries directly.
- DDL/DML statements are blocked; the backend enforces a LIMIT if missing.
- Results populate the Table view; charts can be used when your SQL outputs compatible columns.

#### 10) URL State and Sharing
- Report configuration is encoded in `r` query param; `data_connection_id` indicates the selected connection.
- The page updates the URL silently as you edit; refresh and share links preserve state.

#### 11) Limitations / Tips
- Date bucketing (day/week/month) can be added as an enhancement; currently dates group at their native value.
- If a chart doesn’t update, ensure you have at least one metric and, for charts, an X dimension (KPI doesn’t require X).
- For joins, verify relationships exist for the selected dataset; composite keys require all pairs.



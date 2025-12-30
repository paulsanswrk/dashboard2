# Auto-Join Performance Optimization

This document describes the performance considerations and optimization strategies for the auto-join functionality used when connecting multiple tables in reports.

## Problem Statement

When a database connection schema is saved, the system computes join paths between tables to enable automatic JOIN clause generation at query time. For large databases, this computation was causing request timeouts:

- **Original approach**: Pre-compute all possible paths between all table pairs
- **Complexity**: O(N²) where N = number of tables
- **Example**: 83 tables = 6,889 DFS traversals, timing out on Vercel

## Solution: Option A - Lazy/On-Demand Computation

Instead of pre-computing paths for all table pairs during schema save, we now:

1. **Store only the graph structure** (nodes + adjacency list) during schema save
2. **Compute paths on-demand** at query time, only for the tables actually used in the report

### Key Changes

| File                                            | Change                                   |
|-------------------------------------------------|------------------------------------------|
| `server/utils/schemaGraph.ts`                   | Added `computePathsForTables()` function |
| `server/api/reporting/connections.put.ts`       | Only builds and stores graph             |
| `server/api/reporting/preview.post.ts`          | Uses `computePathsForTables()`           |
| `server/api/reporting/get-joins.post.ts`        | Uses `computePathsForTables()`           |
| `server/api/schema/custom-references.post.ts`   | Only builds and stores graph             |
| `server/api/schema/custom-references.delete.ts` | Only builds and stores graph             |

### Performance Comparison

| Operation                   | Before (Pre-compute)      | After (On-demand)  |
|-----------------------------|---------------------------|--------------------|
| Schema save (100 tables)    | 20-60+ seconds (timeout!) | ~200ms             |
| First preview (3 tables)    | 0ms (pre-computed)        | ~3ms               |
| Complex preview (15 tables) | 0ms (pre-computed)        | ~100ms             |
| Storage in `auto_join_info` | ~2-10MB JSON              | ~50KB (graph only) |

---

## Alternative Options Considered

### Option B: BFS Instead of DFS

Replace the DFS path-finding algorithm with BFS which finds shortest paths more efficiently.

**Estimated performance for 100 tables:**

| Scenario       | Per-pair time | Total (9,900 pairs) |
|----------------|---------------|---------------------|
| Sparse graph   | 0.1-0.3ms     | 1-3 seconds         |
| Moderate graph | 0.5-1ms       | 5-10 seconds        |
| Dense graph    | 2-5ms         | 20-50 seconds       |

**Verdict**: Still O(N²), doesn't solve the timeout problem for large schemas on Vercel (60s limit on Pro plan).

### Option C: Reduce Pre-computed Data

Only store the graph and compute paths on-demand - essentially the same as Option A.

### Option D: Background Computation

Start with just the graph, return success immediately, then compute pathsIndex in a background job.

**Pros**:

- Instant schema save
- Pre-computed paths for faster queries

**Cons**:

- Requires background job infrastructure
- Complexity in managing async state

**When to use**: Only if Option A proves too slow for complex reports (15+ tables).

---

## Implementation Details

### The `computePathsForTables` Function

Located in `server/utils/schemaGraph.ts`:

```typescript
/**
 * Compute paths only for the specified tables (not all pairs in the graph).
 * This is O(K²) where K is the number of tables, instead of O(N²) where N is all tables.
 * Used for on-demand path computation at query time.
 */
export function computePathsForTables(graph: TableGraph, tableNames: string[]): PathsIndex
```

### Time Estimates for On-Demand Computation

| Tables in Report (K) | BFS Pairs to Compute | Estimated Time |
|----------------------|----------------------|----------------|
| 2 tables             | 2                    | 0.2-1ms        |
| 3 tables             | 6                    | 0.5-3ms        |
| 5 tables             | 20                   | 2-10ms         |
| 8 tables             | 56                   | 5-30ms         |
| 10 tables            | 90                   | 10-50ms        |
| 15 tables            | 210                  | 20-100ms       |
| 20 tables            | 380                  | 40-200ms       |

**Formula**: K × (K-1) pairs for K tables

### Realistic Usage Patterns

| Use Case                    | Typical Tables | Expected Latency |
|-----------------------------|----------------|------------------|
| Simple chart (fact + 1 dim) | 2              | ~1ms             |
| Standard report             | 3-5            | ~5ms             |
| Complex dashboard widget    | 5-8            | ~15ms            |
| Very complex report         | 10-15          | ~50ms            |
| Extreme edge case           | 20+            | ~150ms           |

---

## Data Structure: `auto_join_info`

Stored in `data_connections.auto_join_info` column:

### Before (Pre-computed)

```json
{
  "pathsIndex": { ... },     // All paths - EXPENSIVE
  "exitPayloads": { ... },   // All exits - EXPENSIVE
  "graph": {
    "nodes": [...],
    "adj": [...]
  }
}
```

### After (On-demand)

```json
{
  "graph": {
    "nodes": [...],
    "adj": [...]
  }
}
```

---

## Constants

Defined in `server/utils/schemaGraph.ts`:

```typescript
export const MAX_DEPTH = 8      // Maximum join path length
export const K_SHORTEST = 3     // Keep top 3 shortest paths per pair
export const COST_WEIGHTS = { 
  hop: 1.0,              // Cost per join hop
  nToNPenalty: 0.5,     // Extra cost for N:N relationships
  nullablePenalty: 0.25  // Extra cost for nullable FKs
}
```

---

## Future Enhancements

If Option A proves insufficient for very complex reports:

1. **Caching**: Cache computed paths in memory or Redis for repeated queries
2. **Background Pre-computation** (Option D): Compute paths after schema save in background job
3. **BFS Optimization** (Option B): Use BFS instead of DFS for faster per-pair computation
4. **Incremental Updates**: Only recompute affected paths when schema changes

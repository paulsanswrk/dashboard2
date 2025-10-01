### Sprint 13 — Joins engine with compound foreign key support

#### Goal
Implement a robust joins engine that supports one-to-one, one-to-many, and many-to-many relationships, including compound (composite) foreign keys with multiple column pairs.

#### Implementation Prompt (LLM-ready)
- Extend dataset model to include `relationships` with `columnPairs` from Sprint 02.
- In the query builder on the server:
  - Accept a `joins[]` array in `PreviewRequest` with: `sourceDatasetId`, `targetDatasetId`, `relationshipId` (or explicit join spec), `joinType` (inner/left), and optional `additionalPredicates`.
  - For compound FKs, build ON clauses that AND all column pairs in ordinal order, e.g., `ON a.k1 = b.k1 AND a.k2 = b.k2`.
  - Validate that all required columns are present and types are compatible; return structured errors if not.
  - Prevent Cartesian products by requiring a relationship or explicit predicate set.
- UI updates:
  - Add a lightweight joins picker: when a user selects fields from another dataset, suggest available relationships; show a badge for composite keys.
  - Display current joins in a collapsible section with ability to remove or change join type.
- Performance safeguards:
  - Impose row limits and timeouts on preview queries.
  - Disallow more than N joins in preview (configurable), and require explicit confirmation beyond the limit.

#### Deliverables
- `PreviewRequest` updated to support `joins[]`.
- Query builder generating correct ON clauses for composite keys.
- UI for indicating and managing joins.

#### Acceptance Criteria
- Selecting a relationship with a composite FK produces a correct ON clause with all column pairs.
- Preview returns expected row counts and columns across joined datasets.
- Removing a join reverts preview to single dataset without errors.

#### Out of Scope
- GUI-based relationship authoring; only selection among discovered relationships.
- Cross-database joins.

#### Test Checklist
- Use a dataset pair with a known composite FK; verify ON clause construction equals `AND` of all pairs.
- Switch join type from INNER to LEFT and verify row differences appropriately.
- Attempt exceeding the join limit; UI prompts and prevents execution unless confirmed.



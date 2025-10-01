### Sprint 07 — Undo/redo and state history

#### Goal
Enable users to experiment confidently using undo/redo for report configuration changes with a bounded, performant history model.

#### Implementation Prompt (LLM-ready)
- Extend `useReportState.ts` to include an internal history stack with:
  - `pushState`, `undo`, `redo`, `canUndo`, `canRedo`, `clearHistory`.
  - Bounded history (e.g., max 50 entries), coalescing rapid changes by debounce window.
- Add UI controls in `ReportingBuilder.vue` for undo/redo (toolbar buttons + hotkeys: Ctrl+Z / Ctrl+Y).
- Ensure URL-sync remains source-of-truth; history operations update URL without causing loops (guard re-entry).
- Persist initial state for easy reset.

#### Deliverables
- History stack with undo/redo integrated in builder UI.

#### Acceptance Criteria
- User can undo and redo changes to zones, filters, and chart type.
- History is bounded and does not leak memory.
- URL stays consistent with current state after undo/redo.

#### Out of Scope
- Cross-session history persistence.

#### Test Checklist
- Perform a sequence of 10 edits; undo all, then redo all; validate state.
- Rapid drag/drop changes coalesce; history depth stays under the bound.




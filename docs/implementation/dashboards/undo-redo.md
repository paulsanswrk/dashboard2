# Undo/Redo Implementation for Dashboards

This document outlines the technical implementation of the Undo/Redo functionality in the Dashboard Editor.

## Architecture: Command Pattern

The system uses the **Command Pattern** to manage state changes. Each user operation is encapsulated as a `DashboardAction` object containing distinct `undo` and `redo` functions.

### `useDashboardHistory` Composable

The core logic resides in `composables/useDashboardHistory.ts`.

- **Singleton State**: The `history` array and `currentIndex` pointer are declared **outside** the composable function to ensure shared state across all invocations.
- **API**:
    - `recordAction(action)`: Pushes a new action to the stack and truncates any "future" actions (if `redo` was available).
    - `undo()`: Executes the `undo` function of the current action and moves the pointer back.
    - `redo()`: Executes the `redo` function of the next action and moves the pointer forward.
    - `canUndo` / `canRedo`: Computed properties for UI state.
    - `clearHistory()`: Resets the history stack (useful when navigating away).

## Implementation Details

### 1. Layout Changes (`vue3-grid-layout`)

**Key Insight**: The `vue3-grid-layout` library mutates the layout prop directly during drag/resize. By the time `@layout-updated` fires, `gridLayout.value` already equals the new layout.

**Solution**: Compare against a stored **baseline** (`initialTabLayouts`) rather than the current `gridLayout.value`.

- **Recording**: Uses `handleLayoutUpdate` which compares `newLayout` against the baseline stored when the dashboard loaded.
- **Baseline Update**: After recording an action, the baseline is updated to the new state for future comparisons.
- **Optimization**: Uses `areLayoutsEqual` to prevent recording no-op changes.

### 2. Widget Style Changes (Text, Icon, Image, Chart)

All widget style changes use a **debounced baseline tracking** pattern:

1. **Baseline Capture**: When a widget is selected (`selectWidget` or `startEditText`), the current style is captured in `baselineWidgetStyle`.
2. **Debounced Recording**: Style changes are debounced (500ms) to batch rapid edits into a single action.
3. **Comparison**: After the debounce, the current style is compared against the baseline.
4. **Undo/Redo**: Both operations update the widget's style and persist to the server.

**Functions with history recording:**

- `updateIconStyle()` - Icon color, size, name
- `updateChartAppearance()` - Chart appearance (colors, legend, etc.)
- `updateChartBorder()` - Chart border properties
- `updateImageStyle()` - Image style properties
- `textForm` watcher - Text content, font, color, alignment, etc.

### 3. Chart Title Changes

Chart title (name) changes are tracked separately:

- **Baseline**: Captured on first keystroke in `renameChartInline`.
- **Debounced Recording**: 500ms debounce to batch rapid typing.
- **Undo/Redo**: Updates `widget.name` and calls `updateChart()` API.

### 4. Dashboard-Level Options

**Tab Style** (`updateTabStyle`):

- Background color, font family, chart background color
- Baseline captured on first change for each tab
- Undo/Redo persists via `/api/dashboards/tabs` PUT

**Dashboard Name** (`dashboardName` watcher):

- Baseline captured from `initialDashboardName`
- 600ms debounce (slightly longer to run after save)
- Undo/Redo persists via `updateDashboard()` API

### 5. Widget Creation (Text & Image)

Widget creation involves both local state updates and server-side persistence.

- **Optimistic UI**: A temporary ID (`temp-...`) is used to show the widget immediately.
- **Server Sync**: The widget is persisted to the API (`/api/dashboard-widgets`). Upon success, the real ID from the database replaces the temporary ID.
- **Undo**: Calls `deleteWidgetInternal` (see below) to remove the widget.
- **Redo**: Re-sends the POST request to the API to recreate the widget.

### 6. Widget Deletion

Deletion is handled carefully to separate *logic* from *history*.

- **`deleteWidgetInternal`**: Performs the actual API call and local state removal. It returns the deleted widget's data (type, position, style) but **does not** record history.
- **`handleDeleteWidget`**: Calls `deleteWidgetInternal` and **records the history action**.
- **Why separate?**: This prevents the `undo` of an "Add Widget" action (which calls `deleteWidgetInternal`) from incorrectly pushing a new "Delete Widget" action onto the history stack.

### 7. Text Widget Editing (Recursive Update Prevention)

Text widgets use a bidirectional sync between the parent dashboard (holding the source of truth) and the sidebar component.

- **Issue**: Naive watchers caused infinite loops (`parent updates child -> child emits update -> parent updates -> ...`).
- **Solution**:
    - **Deep Equality Checks**: Watchers in `pages/dashboards/[id].vue` only update state if the new value is deeply different.
    - **Sync Flags**: `WidgetSidebarText.vue` uses an `isSyncingFromProps` flag to ignore internal updates while applying props.

## API Integration

- **`load()`**: Used in complex Redo scenarios (like re-adding a widget) to ensure the local state is perfectly synchronized with the server's truth.
- **Direct `$fetch`**: Used for atomic operations like `DELETE /api/dashboard-widgets` or `POST /api/dashboard-widgets` within Undo/Redo handlers.

## Known Edge Cases Handled

- **History Pollution**: Creating a widget and then Undoing it does not leave a "Delete" action in the Redo stack history.
- **Rapid Actions**: Debouncing ensures layout changes aren't recorded on every pixel of movement.
- **Visual Feedback**: Undo/Redo buttons use the `primary` (orange) color when enabled to distinguish them from the gray disabled state.
- **Stale Closures**: Widget lookups are performed fresh inside debounce timer callbacks to avoid stale references.

## Supported Actions Summary

| Action Type             | Components                 | Debounce          |
|-------------------------|----------------------------|-------------------|
| Layout Change           | Widget drag/resize         | Immediate on drop |
| Style Change            | Text widget properties     | 500ms             |
| Icon Style Change       | Icon color, size           | 500ms             |
| Chart Appearance Change | Chart colors, legend       | 500ms             |
| Chart Border Change     | Chart border properties    | 500ms             |
| Image Style Change      | Image style properties     | 500ms             |
| Chart Title Change      | Chart name input           | 500ms             |
| Tab Style Change        | Background, font, chart bg | 500ms             |
| Dashboard Name Change   | Dashboard title            | 600ms             |
| Widget Creation         | Add text/icon/image        | Immediate         |
| Widget Deletion         | Delete any widget          | Immediate         |

---

## Future Work: Chart Builder Page Undo/Redo

The Chart Builder page (`/reporting/builder`) would benefit from similar undo/redo functionality. Here's how to implement it:

### Recommended Architecture

1. **Create `useChartBuilderHistory` Composable**
    - Similar to `useDashboardHistory` but for chart configuration
    - Singleton pattern with `history` and `currentIndex` outside the function

2. **Track These Actions**:
    - Chart type changes (bar, line, pie, etc.)
    - Field zone assignments (dimensions, measures, filters)
    - Field configuration (format, alias, aggregation)
    - Sort order changes
    - Filter value changes
    - Grouping changes
    - Appearance settings (colors, legend position, etc.)

3. **Implementation Strategy**:
    - **Baseline Capture**: Capture chart state when user starts editing a property
    - **Debounce**: 300-500ms for rapid changes like dragging fields
    - **Snapshot Approach**: For complex state, consider snapshotting the entire chart configuration

4. **Key Functions to Modify**:
    - Field zone handlers (`handleFieldDrop`, `handleFieldRemove`)
    - Configuration panels (format, appearance, filters)
    - Chart type selector

5. **UI Integration**:
    - Add Undo/Redo buttons to the builder toolbar
    - Use the same visual styling as dashboard (orange when enabled)
    - Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z

### Example Action Structure

```typescript
interface ChartBuilderAction {
  type: string // 'Add Field', 'Remove Field', 'Change Chart Type', etc.
  undo: () => Promise<void>
  redo: () => Promise<void>
  timestamp: number
}
```

### Considerations

- Chart builder doesn't auto-save, so undo/redo only affects local state until user saves
- History should be cleared when navigating away or starting a new chart
- Consider a max history size to prevent memory issues with many edits

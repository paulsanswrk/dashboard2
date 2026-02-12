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

### 5. Widget Creation (Text, Image, Icon & Chart)

Widget creation involves both local state updates and server-side persistence. All widget types (text, image, icon, chart) follow the same pattern:

- **Optimistic UI**: A temporary ID (`temp-...`) is used to show the widget immediately.
- **Server Sync**: The widget is persisted to the API (`/api/dashboard-widgets`). Upon success, the real ID from the database replaces the temporary ID.
- **Undo**: Calls `deleteWidgetInternal` (see below) to remove the widget.
- **Redo**: Re-sends the POST request to the API to recreate the widget.

**Functions with creation history recording:**
- `addTextWidget()` — Action type: `Add Text`
- `addImageWidget()` — Action type: `Add Image`
- `addIconToTab()` — Action type: `Add Icon` (via context menu or toolbar)
- `addExistingChartToTab()` — Action type: `Add Chart` (from existing chart gallery)
- `addNewChartToTab()` — Action type: `Add Chart` (creates a new chart)

### 6. Widget Deletion

Deletion is handled carefully to separate *logic* from *history*.

- **`deleteWidgetInternal`**: Performs the actual API call and local state removal. It captures and returns the deleted widget's **complete data** — including `tabId`, `type`, `position`, `style`, `chartId`, `configOverride`, `name`, and `zIndex`. It does **not** record history.
- **`handleDeleteWidget`**: Calls `deleteWidgetInternal` and **records the history action**.
- **Undo**: POSTs the captured `deletedData` to `/api/dashboard-widgets` to recreate the widget, then calls `loadDashboard()` to sync state.
- **Redo**: Uses heuristics (type + position) to find the restored widget and calls `deleteWidgetInternal` again.
- **Why separate?**: This prevents the `undo` of an "Add Widget" action (which calls `deleteWidgetInternal`) from incorrectly pushing a new "Delete Widget" action onto the history stack.

> **Note**: The complete data capture is essential — without `chartId`, chart widgets cannot be recreated via the POST API, and without `configOverride`/`name`/`zIndex`, widget properties would be lost on undo.

### 7. Widget Clipboard Operations

**Duplicate Widget** (`duplicateWidget`, Ctrl+D):
- Creates a copy of the selected widget with a small position offset.
- Action type: `Duplicate Widget`
- Undo: Calls `deleteWidgetInternal` on the duplicated widget.
- Redo: Re-sends the POST request to recreate the duplicate.

**Copy/Cut + Paste** (`copyWidgetToClipboard`, `pasteWidget`, Ctrl+C/X/V):
- Copy stores widget data in a `widgetClipboard` ref. Cut additionally deletes the original.
- Paste creates a new widget from the clipboard data.
- Action type: `Paste Widget`
- Undo/Redo follows the same pattern as widget creation.

### 8. Z-Order Changes

**Bring to Front / Send to Back** (`changeWidgetZOrder`):
- Moves a widget to the front or back of the layout rendering order.
- Captures the widget's original index in the layout array.
- Action type: `Bring to Front` or `Send to Back`
- Undo: Splices the widget back to its original index.
- Redo: Calls `changeWidgetZOrder` again.

### 9. Widget Link Management

**Add Link** / **Remove Link** (via context menu):
- Adds or removes a navigation link on a widget.
- Persists via `PATCH /api/dashboard-widgets`.
- Action types: `Add Link`, `Remove Link`
- Undo/Redo: Patches the widget to toggle between the linked and unlinked states.

### 10. Text Widget Editing (Recursive Update Prevention)

Text widgets use a bidirectional sync between the parent dashboard (holding the source of truth) and the sidebar component.

- **Issue**: Naive watchers caused infinite loops (`parent updates child -> child emits update -> parent updates -> ...`).
- **Solution**:
    - **Deep Equality Checks**: Watchers in `pages/dashboards/[id].vue` only update state if the new value is deeply different.
    - **Sync Flags**: `WidgetSidebarText.vue` uses an `isSyncingFromProps` flag to ignore internal updates while applying props.

### 11. Chart Deletion (from dashboard)

**Delete Chart** (`confirmDeleteChart`):
- Permanently deletes a chart record AND its dashboard widget in a single action.
- Action type: `Delete Chart`
- Undo: Recreates both the chart and the widget via API calls, then reloads the dashboard.

## API Integration

- **`load()`**: Used in complex Redo scenarios (like re-adding a widget) to ensure the local state is perfectly synchronized with the server's truth.
- **Direct `$fetch`**: Used for atomic operations like `DELETE /api/dashboard-widgets` or `POST /api/dashboard-widgets` within Undo/Redo handlers.

## Known Edge Cases Handled

- **History Pollution**: Creating a widget and then Undoing it does not leave a "Delete" action in the Redo stack history.
- **Rapid Actions**: Debouncing ensures layout changes aren't recorded on every pixel of movement.
- **Visual Feedback**: Undo/Redo buttons use the `primary` (orange) color when enabled to distinguish them from the gray disabled state.
- **Stale Closures**: Widget lookups are performed fresh inside debounce timer callbacks to avoid stale references.

## Supported Actions Summary

| Action Type             | Components                      | Debounce          |
|-------------------------|---------------------------------|-------------------|
| Layout Change           | Widget drag/resize              | Immediate on drop |
| Style Change            | Text widget properties          | 500ms             |
| Icon Style Change       | Icon color, size                | 500ms             |
| Chart Appearance Change | Chart colors, legend            | 500ms             |
| Chart Border Change     | Chart border properties         | 500ms             |
| Image Style Change      | Image style properties          | 500ms             |
| Chart Title Change      | Chart name input                | 500ms             |
| Rename Chart            | Chart name (sidebar)            | 500ms             |
| Tab Style Change        | Background, font, chart bg      | 500ms             |
| Dashboard Name Change   | Dashboard title                 | 600ms             |
| Add Text                | Add text widget                 | Immediate         |
| Add Image               | Add image widget                | Immediate         |
| Add Icon                | Add icon widget (toolbar/menu)  | Immediate         |
| Add Chart               | Add chart widget (new/existing) | Immediate         |
| Delete Widget           | Delete any widget               | Immediate         |
| Delete Chart            | Delete chart + widget           | Immediate         |
| Duplicate Widget        | Ctrl+D                          | Immediate         |
| Paste Widget            | Ctrl+V                          | Immediate         |
| Bring to Front          | Context menu z-order            | Immediate         |
| Send to Back            | Context menu z-order            | Immediate         |
| Add Link                | Context menu link               | Immediate         |
| Remove Link             | Context menu link               | Immediate         |

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

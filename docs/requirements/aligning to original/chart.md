# Chart Creation Interface Requirements

## 1. Overview

The Chart Creation page is a drag-and-drop interface for building data visualizations. It features a 3-column layout designed to facilitate the flow of selecting data, configuring chart parameters, and previewing the result.

**URL Pattern:** `/#charts/create/...`

## 2. Layout Structure

The page is divided into three main vertical sections, framed by a top navigation bar:

1. **Left Sidebar:** Data Source and Field selection.
2. **Center Workspace:**
    * **Top:** Chart Type selection carousel.
    * **Left Pane:** Configuration drop zones (Axes, Filters).
    * **Right Pane:** Interactive Chart Preview and Action Toolbar.
3. **Right Toolbar:** Analysis and Styling tools.

---

## 3. Detailed Component Specifications

### 3.1. Header Navigation

* **Logo:** Optiqo branding (top-left).
* **Main Menu:**
    * CONNECT
    * ANALYZE
    * DASHBOARDS (Dropdown)
    * REPORTS
    * ALARMS
* **User Controls:** Hamburger menu/Settings icon on the far right.
* **Style:** Orange background.

### 3.2. Data Source & Field Browser (Left Sidebar)

* **Data Source Selector:** A dropdown menu at the top to switch between connected datasets (e.g., "sakila").
* **Search:** A text input with a search icon to filter the field list.
* **Field List (Tree View):**
    * Displays database tables/entities (collapsible).
    * **Fields:** Inside expanded tables, fields are listed with data type icons:
        * `#` for Numbers/IDs (e.g., `actor_id`).
        * `A` for Text/Strings (e.g., `first_name`).
        * `Clock Icon` for Time/Date (e.g., `last_update`).
    * **Interaction:** Fields are draggable elements.
* **Footer Action:** "Add Custom Field" button (primary blue color).

### 3.3. Chart Type Selector (Center Top)

* **Carousel:** A horizontal scrollable list of visualization types.
* **Navigation:** Left `<` and Right `>` arrows to scroll through types.
* **Visuals:** Large, clear icons representing the chart type (e.g., KPI/Big Number, Table, Bar Chart, Stacked Bar, Pie, Line, Area, etc.).
* **Selection:** Clicking an icon changes the active visualization mode.

### 3.4. Configuration Zones (Center Left Pane)

* **Auto Query:** Toggle switch (On/Off) to control if the chart updates immediately upon changes.
* **Drop Zones:** Rectangular areas where users drop fields dragged from the sidebar.
    * **Y-AXIS:** Labeled "Drag field here". Used for metrics/values.
    * **X-AXIS:** Labeled "Drag field here". Used for dimensions/categories.
    * **BREAK DOWN BY:** Optional zone for grouping/segmentation.
    * **FILTER BY:** Zone for applying data filters.
    * **Field Cards:** When a field is dropped into a zone:
        * It appears as a "card" inside the box.
        * **Left Icon:** Data type indicator (e.g., `#`, `A`).
        * **Main Text:** Field name (e.g., `inventory_id`).
        * **Subtext:** Table name (e.g., `inventory`) or Aggregation type (e.g., `COUNT`).
        * **Right Controls:** `X` to remove, and an eye/visibility toggle icon.
        * **Context Menu:** Clicking a field card opens a popover menu (see **3.7 Field Configuration Popover**).
* **Footer Action:** "SWITCH TO SQL MODE" button (allows advanced users to write raw SQL).

### 3.5. Canvas & Preview (Center Right Pane)

* **Title Input:** Large placeholder text "Enter title for your visualization" for naming the chart.
* **Action Toolbar (Top Right of Canvas):**
    * **Clear:** Trash icon.
    * **Undo/Redo:** History control icons.
    * **Export:** Upload/Share icon.
    * **Discard:** Red 'X' icon.
    * **Done:** Green checkmark icon.
* **Visualization:**
    * Renders the actual chart (e.g., bar chart) based on current configuration.
    * Interactive elements (tooltips on hover).
    * Axes labels are rendered based on the selected fields.
* **Empty State / Onboarding:**
    * When no data is selected, shows a placeholder chart image.
    * **Guided Steps:** Overlay arrows pointing from the specific drop zones to the chart parts:
        1. "Drop value field in Y-Axis box"
        2. "Drop category field in X-Axis box"
        3. "Drop category field to break down your series"

### 3.6. Analysis & Styling Toolbar (Right Sidebar)

A vertical strip of icons for additional configuration:

* **Analysis Tools:**
    * `Sort`: AZ icon.
    * `Previous Period`: Calendar/Grid icon.
    * `Prediction`: Trend line icon.
    * `Conditional`: Formatting options.
    * `Alert`: Bell icon.
    * `Tooltip`: Comment bubble icon.
    * `DrillDown`: Hierarchy icon.
* **Styling Tools (Bottom Right):**
    * `Palette`: Paint bucket/Color icon.
    * `Typography`: 'A' icon.
    * `Edit`: Pencil icon.

### 3.7. Field Configuration Popover

Triggered by clicking a field card in a configuration zone (e.g., Y-Axis).

* **Header:**
    * Editable field name/alias input.
    * Edit icon (pencil) and Info icon.
* **Aggregation Type (for Metric/Numeric fields):**
    * **Quick Select Grid:** 2x2 grid of common aggregations.
        * `SUM`, `COUNT` (Green/Active highlight), `AVERAGE`, `DIST. COUNT`.
    * **More Options:** Expandable section containing advanced statistical aggregations:
        * `MIN`, `MAX`, `MEDIAN`, `VARIANCE`.
* **Advanced Options:**
    * **Filter Raw Data:** Chevron `>` to expand filtering options. Allows filtering the source data before aggregation (e.g., `inventory_id > 100`).
        * Likely contains an **Operator** dropdown (e.g., `=`, `!=`, `>`, `<`, `In`, `Not In`) and a **Value** input.
    * **Filter Result Set (Threshold):** Chevron `>` to expand. Allows filtering the aggregated results (e.g., `COUNT(inventory_id) > 50`).
        * Likely contains an **Operator** dropdown (e.g., `>`, `<`, `Top N`, `Bottom N`) and a **Value** input.

---

## 4. Functional Requirements

### 4.1. Drag & Drop Interaction

* Users must be able to drag a field from the **Left Sidebar**.
* Valid drop targets (**Configuration Zones**) should likely highlight when a draggable item is over them.
* Dropping a field updates the chart query configuration.
* Different data types (Number vs String) may be restricted to or behave differently in certain zones (e.g., Y-Axis typically expects numbers or aggregations).

### 4.2. State Management

* **Selection State:** The UI must track which fields are in which zones.
* **Chart Type:** Changing the chart type should preserve selected data fields where possible (mapping them to the new chart's equivalent zones).
* **History:** Undo/Redo functionality implies a state stack for configuration changes.

### 4.3. Querying

* **Auto Query On:** Updates the preview immediately after a drop action or config change.
* **Auto Query Off:** Probably requires a manual "Run Query" action (though not explicitly visible in the empty state, likely appears when "Auto Query" is off).


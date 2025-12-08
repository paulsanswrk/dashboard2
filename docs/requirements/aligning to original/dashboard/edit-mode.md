# Dashboard Edit Mode Requirements

This document describes the visible behavior of the production dashboard editor that we need to reproduce. Treat every section below as a requirement for the Nuxt implementation. The intent is to let an LLM (without screenshots) align feature parity with the original experience.

## 1. Shell Navigation

- An orange header bar spans the full width. Left-to-right contents: Optiqo logo, uppercase links (`CONNECT`, `ANALYZE`, `DASHBOARDS` with a caret to indicate a dropdown), `REPORTS`, `ALARMS`, and a hamburger/menu icon on the far right.
- Below the orange bar, a light-gray editor toolbar spans the width. The toolbar height, padding, and typography should match the production proportions (roughly 56–60 px tall with 16 px horizontal padding).

## 2. Dashboard & Tab Selector Strip

- Leftmost pill displays the current dashboard name (e.g., “Paul’s dashboard…”) with a dropdown caret. Clicking opens dashboard selection; the pill uses a blue background with white text and rounded corners.
- Next to the dashboard pill is a secondary dropdown showing the active tab title (initially “Untitled”). Same height as the first pill but light gray with dark text.
- A square button with a centered “+” icon follows the tab dropdown. Clicking adds a new tab and focuses its title field. Button uses white background, dark border, and hover state.

## 3. Primary Editor Toolbar (center-left icons)

- Icon buttons from left to right: `UNDO`, `REDO`, `ADD CHART`, `ADD TEXT`, `ADD IMAGE`, `ADD ICON`, `ADD FILTER`, `APPEARANCE`, `PREVIEW MODE`, `MOBILE MODE`.
- Each button includes a monochrome icon above a label (stacked vertically). Default state is gray icon with darker label; hover/active states darken the icon background.
- Buttons are evenly spaced with thin dividers between logical groups (undo/redo grouped together, add-* tools grouped, appearance/preview grouped).
- Button behaviors:
    - **Undo / Redo**: step backward/forward through the edit history, covering creation, deletion, movement, formatting, and inspector changes. Disabled state grays out icon when no further steps exist.
    - **Add Chart**: opens an inline overlay (the “chart placeholder gizmo”) directly beneath the button. The overlay shows two stacked buttons: “+ Create New Chart” and “Use Existing Chart”.
        - Choosing **Create New Chart** launches a configuration modal (dataset selector, chart type gallery, field mapping) as described previously; saving inserts the new chart, cancel closes the modal.
        - Choosing **Use Existing Chart** opens a “Chart Gallery” modal. Layout: title row “CHART GALLERY” with a right-pointing arrow icon, then a scrollable list of chart folders, each labeled with the data domain name (e.g., “01: Avdeling 110”). Every row includes an `arrow_right` icon to expand and reveal child charts. Selecting a chart highlights the row and enables an “Insert” button in the
          modal footer. Insert drops the chosen chart onto the canvas at the next grid slot. “Cancel” closes without changes. Modal supports search, breadcrumb navigation, and remembers the last folder visited in the current session.
    - **Add Text**: places a text block at the next grid slot and automatically opens an inline rich-text toolbar (font, size, bold/italic/underline, alignment, color). Typing immediately replaces placeholder “Caption”.
    - **Add Image**: opens a file-picker modal. User can upload from disk or paste an image URL. Preview pane displays selected image. After confirm, image widget is added to the canvas with handles for scaling.
    - **Add Icon**: launches an icon library drawer sliding down from the toolbar. Drawer lists searchable icon categories. Selecting an icon drops it on the canvas; drawer remains open to insert multiple icons until user clicks the close affordance.
    - **Add Filter**: opens the “Filter Data” modal. Structure: left column is a vertical list of data sources/cards (e.g., “Bok1”, “insta800.net”, “sakila”, “Custom Fields”). Selecting a data source populates the right pane with its fields (e.g., `actor`, `actor_id`, `first_name`, …). Each field row shows the field name, data type icon, and a chevron to configure filter style. Clicking a row
      opens inline controls to choose filter widget (dropdown, checkbox list, numeric slider, date picker), default operator, default value(s), and whether the filter is mandatory. A preview snippet at the bottom shows the rendered filter.
        - **String field configuration**: when a text field such as `first_name` is selected, a panel appears with (a) Filter Type dropdown (`Dropdown`, `Searchable list`, `Multi-select checklist`), (b) Operator selector (`is`, `is not`, `contains`, `starts with`, `ends with`, `is empty`), (c) Default values entry box with tokenized chips (supports typing free text or selecting from existing
          values pulled from the dataset), (d) Case sensitivity toggle, and (e) option to allow “All values” selection. The preview updates live to show placeholder choices (e.g., common names).
        - **Date field configuration**: when a date/timestamp field (e.g., `last_update`) is selected, the panel swaps to date-specific controls: (a) Widget Type dropdown (`Date picker`, `Date range`, `Relative period`), (b) Operator selector with options like `is on`, `is before`, `is after`, `is between`, `is in the last`, `is in the next`, (c) Default value inputs that surface calendars for
          absolute selection or numeric inputs plus unit dropdown (days/weeks/months) for relative periods, (d) Timezone selector (defaults to dashboard timezone) and toggle to include time-of-day, (e) Quick shortcuts row (“Today”, “Yesterday”, “This week”, “This month”). Preview renders the chosen widget with example dates so the user can validate the interaction.
        - The modal footer offers “Add Filter” (primary) and “Cancel”. Confirming inserts the configured filter widget pinned to the top-left of the canvas (stacking beneath existing filters) and automatically opens the inspector to its properties.
    - **Appearance**: clicking the APPEARANCE button (with wrench icon) opens a dropdown menu positioned directly beneath the button. The dropdown contains the following menu items, listed top to bottom:
        - **Fullscreen**: a toggle menu item (no ellipsis) that switches the dashboard editor into fullscreen presentation mode. When active, the browser enters fullscreen, hiding the browser chrome and maximizing the canvas view. Clicking again exits fullscreen and returns to normal editor view. The menu item may show a checkmark or highlight when fullscreen is active.
        - **Tab Rotation**: a toggle menu item (no ellipsis) that enables automatic cycling through dashboard tabs when in fullscreen presentation mode. When enabled, tabs rotate at a configurable interval, creating a slideshow effect. The menu item shows a checkmark when rotation is active.
        - **Set Refresh Interval...**: a menu item with ellipsis that opens a modal dialog. The modal contains: (a) a numeric input field for the refresh interval value, (b) a unit dropdown (seconds, minutes, hours), (c) a toggle to enable/disable auto-refresh, (d) a preview showing the configured interval (e.g., "Every 30 seconds"), and (e) modal footer buttons "Save" and "Cancel". Saving applies
          the refresh interval to the dashboard, causing data sources to refresh automatically at the specified interval when the dashboard is viewed.
        - **Show printing bounds**: a toggle menu item (no ellipsis) that displays visual guides on the canvas indicating the printable area boundaries. When enabled, dashed lines or shaded regions appear showing the print margins and page boundaries, helping users align widgets within printable areas. The menu item shows a checkmark when printing bounds are visible.
        - **Manage Translations**: a menu item (no ellipsis) that opens a translation management interface, likely as a modal or side panel. This interface allows users to add, edit, and manage multi-language content for dashboard text elements (widget labels, tab names, filter labels, etc.). The interface typically includes: language selector, text field mapping, translation entry fields, and
          save/cancel actions.
        - **Animation Options...**: a menu item with ellipsis that opens a modal dialog for configuring animation settings. The modal contains controls for: (a) enabling/disabling animations globally, (b) animation duration slider or input, (c) animation style dropdown (fade, slide, zoom, none), (d) per-widget-type animation toggles (charts, text, images), (e) transition effects between tabs,
          and (f) modal footer buttons "Apply" and "Cancel". Changes apply to all dashboard elements and affect how widgets appear/disappear and how data updates are animated.
        - **Global Style Options...**: a menu item with ellipsis that opens a modal dialog for configuring dashboard-wide visual styling. The modal contains tabs or sections for: (a) **Typography**: default font family dropdown, font size controls, line height, text color picker, (b) **Colors**: primary color palette selector, background color, accent colors, (c) **Spacing**: default
          padding/margin values, widget spacing, grid gutter size, (d) **Borders**: default border width, border radius, border color, (e) **Shadows**: default shadow presets or custom shadow controls. The modal footer includes "Apply to all tabs", "Reset to defaults", "Save", and "Cancel" buttons. Changes affect all widgets and tabs unless overridden at the widget level.
    - **Preview Mode**: toggles canvas into a read-only state. Grid dots, selection handles, and widget toolbars vanish; interactions mimic the live dashboard (filters respond, hovering shows tooltips). A badge inside the button indicates active preview; clicking again returns to edit mode.
    - **Mobile Mode**: constrains the canvas to a mobile viewport (~375 px width) centered on a dark backdrop. Vertical scrollbars show when content exceeds height. Widget snapping adjusts to single-column layout. Toggling off restores desktop canvas width.

## 4. Secondary Actions (right side of toolbar)

- Share cluster aligned to the far right with the following icon buttons and labels: `SHARE`, `SHOW FILTERS`, `OPTIONS` (gear icon), and `DONE` (checkmark). `DONE` uses a bold blue check icon to indicate leaving edit mode.
- All buttons share the same height and style as the primary toolbar buttons.
- Button behaviors:
    - **Share**: opens a modal with two tabs. “Invite” tab lets the user type email addresses, select permission level (view/edit), and send invitations. “Link” tab shows a toggle for public link, copy-to-clipboard button, and expiry configuration. Modal requires explicit Save/Cancel buttons.
    - **Show Filters**: toggles a collapsible drawer sliding in from the left over the canvas. Drawer displays a vertical list of all filter widgets with quick toggles to show/hide each in the published dashboard. Drawer remains over the canvas until toggled off or user clicks the X icon.
    - **Options**: launches a settings modal with general controls: dashboard description field, theme selection, grid snap size, and default tab order. Includes action buttons for “Duplicate dashboard” and “Delete dashboard” (with confirmation). Closing requires clicking “Save” or “Cancel”.
    - **Done**: initiates a save flow. Button shows a spinning progress indicator, disables while persisting, and on success exits edit mode to the dashboard viewer. If save fails, an inline error banner appears below the toolbar with retry instructions.

## 5. Canvas Workspace

- Editor canvas fills the area beneath the toolbar and above the inspector panel footer. Background is a light dotted grid (white dots on pale gray) to imply positioning increments.
- Widgets snap to the grid and show subtle drop shadows. Resizing handles appear on hover (small blue squares on edges/corners). Dragging displays guidelines to align with neighboring widgets.
- Existing widgets in the reference layout:
    - A text widget labeled “Caption” using a sans-serif font, left-aligned, with a thin gray outline when selected.
    - A column chart widget (“Sakila chart 1”) displaying sample data. The chart is 6 columns wide, with category labels rotated diagonally. It shows axes titles (Inventory_id on Y).
- Widget toolbars:
    - Top-left corner houses an info icon (opens metadata modal showing data source, last refresh time, and notes).
    - Bottom-left corner holds a blue “X” delete button; clicking prompts for confirmation before removing the widget.
    - Hovering over the top edge reveals drag handles to move the widget; bottom/right edges reveal resize handles with tooltips showing current width × height in grid units.
    - Charts additionally expose a mini toolbar (top-right) with buttons for “Edit data”, “Duplicate”, and “Send to back/front”.

## 6. Properties / Inspector Panel (right side)

- A fixed panel on the right shows contextual settings, headed with the active tab name in uppercase (e.g., “PAUL’S DASHBOARD 1 TAB”) within a blue title bar.
- Sections within the panel:
    1. **Tab Style** – includes font selector dropdown (default “Arial”) populated with standard sans-serif and serif options. Icon buttons toggle bold, italic, underline; clicking applies immediately to the selected tab title. Additional controls adjust font size and casing (Title Case vs Uppercase).
    2. **Series Colors** – four rows, each row displays three small paintbrush icons paired with accent color swatches. Clicking a swatch opens a popover color picker (RGB sliders, hex input, preset palette). Users can drag a swatch to reorder priority.
    3. **Chart Background** – a single paint bucket icon with dropdown arrow that opens a list of textures (solid, gradient, pattern) and a color picker. Changing the selection updates the currently selected chart immediately.
    4. **Design Themes** – dropdown labeled “Select…” listing named presets. Choosing a theme updates fonts, colors, and widget borders globally; tooltip describes each theme.
- When a widget is selected, the panel swaps to widget-specific controls (e.g., for charts: axis labels, legend toggle, data binding). When nothing is selected, the panel reverts to the tab-level sections above.
- Panel uses white background, light-gray dividers between sections, and consistent 16 px padding. Scrollable if content exceeds viewport height. A sticky footer hosts “Apply to all tabs” and “Reset section” buttons.

## 7. Widget Creation Behavior

- Selecting any “ADD …” button should place the corresponding widget on the canvas at the next available grid position and open the inspector for that widget type so the user can configure properties immediately.
- Drag-and-drop reordering is required. The dotted grid must guide movement with snap increments of roughly 8 px. While dragging, the widget renders semi-transparent and shows destination coordinates.
- Widgets must support duplication (via context toolbar), deletion with confirmation, and stacking order adjustments (bring forward/back).
- Undo/redo must track widget creation, deletion, movement, property changes, inspector edits, and tab switches. History shows at least 20 steps.

## 8. Mode Toggles

- `PREVIEW MODE` toggles the canvas into a live preview without grid lines but retains edit toolbar. Interacting with widgets behaves exactly as in the published dashboard (filters apply, tooltips show). An inline banner across the top of the canvas states “Preview mode”.
- `MOBILE MODE` switches canvas to a narrow viewport (approx. 375 px width) centered within the editor, showing scrollbars that mimic a phone. Device chrome (top notch, bottom bar) frames the viewport. A dropdown inside the button allows switching to Tablet (~768 px) for future parity.

## 9. Completion Flow

- `SHARE` modal must validate email addresses, display pending invitations, and allow revoking access. Copy-link button provides inline success toast (“Link copied”). Closing the modal via the X icon or Cancel must discard unsaved invite entries.
- `SHOW FILTERS` drawer lists filters with toggles (“Visible”, “Locked”). Each filter entry exposes a kebab menu for renaming or deleting the filter. Drawer remembers last open/closed state per dashboard.
- `DONE` persists the current state, exits edit mode, and returns to the dashboard view. Button shows a loading spinner while saving. If unsaved widgets exist, a confirmation dialog warns “Unsaved changes will be lost” with options to Save & Exit, Discard, Cancel.

## 10. General Interaction Guidelines

- All buttons use cursor pointer, have either a visible background or outline, and include hover states consistent with production (color darken or border emphasis).
- Typography: headings in the inspector are uppercase with letter spacing ~0.5 px; body text uses 14 px sans-serif.
- Spacing: keep 24 px gutter between the canvas and the inspector panel, with a slim vertical divider.

Deliverables from engineering should include the layout, styling, and interactions above so the Nuxt implementation visually and behaviorally matches the production editor.


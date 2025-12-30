# Dashboard Layout Standards

This document outlines the standard layout patterns for dashboard-style pages in the Optiqo application. These standards ensure consistency across different views (Main Dashboard, Organization Details, etc.) and provide an optimal viewing experience across all device sizes.

## Responsive Grid Layout

We use a responsive grid system that adapts the number of columns based on screen width. The goal is to maintain a readable card width while maximizing screen real estate on larger displays.

### Grid Container Classes

Use the following Tailwind CSS classes for the main content grid container:

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-start">
  <!-- Cards go here -->
</div>
```

### Breakpoint Breakdown

| Breakpoint       | Prefix    | Columns | Rationale                                                                         |
|:-----------------|:----------|:--------|:----------------------------------------------------------------------------------|
| **Mobile**       | (default) | 1       | Full width for readability on small screens.                                      |
| **Tablet**       | `md:`     | 2       | Side-by-side layout for standard tablets.                                         |
| **Desktop**      | `lg:`     | 2       | Kept at 2 columns to ensure cards remain wide enough for content (tables, lists). |
| **Wide Desktop** | `xl:`     | 3       | Expands to 3 columns on wider screens (e.g., 1280px+).                            |
| **Ultra Wide**   | `2xl:`    | 4       | Expands to 4 columns on very large monitors (e.g., 1536px+).                      |

### Vertical Alignment

Always use `items-start` on the grid container.

- **Why?** By default, CSS Grid stretches items to match the height of the tallest item in the row. This usually results in awkward whitespace for shorter cards. `items-start` allows each card to take up only its natural height.

## Card Content Guidelines

To ensure cards fit neatly within the grid without creating excessive vertical imbalance:

### Scrollable Lists

When displaying lists of items (Users, Viewers, Logs, etc.) within a card, always wrap the list in a scrollable container with a maximum height.

```html
<div class="space-y-2 max-h-96 overflow-y-auto pr-1">
  <!-- List items -->
</div>
```

- **`max-h-96`**: Limits the height to approximately 384px.
- **`overflow-y-auto`**: Shows a scrollbar only when content exceeds the max height.
- **`pr-1`**: Adds padding to the right to prevent the scrollbar from overlapping content.

### Widget-like Structure

Treat detailed views as a collection of widgets rather than a single monolithic page. Each "card" should be self-contained and functionally independent.

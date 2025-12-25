# Dashboard Image Widgets

This document describes the implementation of image widgets on dashboards.

## Overview

Image widgets allow users to add images to dashboards with customizable styling options including borders, shadows, and interactive links.

## Architecture

### Backend APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard-images` | POST | Upload image to Supabase storage |
| `/api/dashboard-images` | GET | List all images for user's organization |
| `/api/dashboard-images` | DELETE | Delete images from storage |
| `/api/dashboard-widgets` | POST | Create widget (supports type: 'image') |
| `/api/dashboard-widgets` | PUT | Update widget style/position |

### Storage

Images are stored in the `dashboard-images` Supabase storage bucket, organized by organization ID:
```
dashboard-images/{organization_id}/{timestamp}_{filename}
```

### Database

Image widgets are stored in `dashboard_widgets` table with:
- `type`: 'image'
- `style`: JSON containing image URL and styling options
- `position`: Grid position (x, y, w, h)

## Frontend Components

### AddImageModal.vue

Modal for browsing, uploading, selecting, and deleting images.

**Props:**
- `open: boolean` - Modal visibility

**Events:**
- `@close` - Modal closed
- `@select` - Image selected (emits image URL)

### DashboardImageWidget.vue

Renders an image widget on the dashboard with styling.

**Props:**
- `styleProps: StyleProps` - Object containing all style properties

**StyleProps:**
```typescript
{
  imageUrl?: string
  objectFit?: 'cover' | 'contain' | 'fill' | 'none'
  backgroundColor?: string
  borderRadius?: number
  borderColor?: string
  borderWidth?: number
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double'
  shadowColor?: string
  shadowSize?: 'none' | 'small' | 'normal' | 'large'
  shadowPosition?: string  // e.g., 'bottom-right'
  linkEnabled?: boolean
  linkType?: 'url' | 'tab'
  linkUrl?: string
  linkNewTab?: boolean
  linkDashboardId?: string
  linkTabId?: string
}
```

### WidgetSidebarImage.vue

Sidebar panel for configuring image widget options.

**Sections:**
1. **Image Preview** - Shows current image
2. **Object Fit** - Cover, Contain, Fill, None
3. **Shape** - Background color, corner radius, border settings
4. **Shadow** - Color, size, position
5. **Interactive Link** - URL or dashboard tab link

## Widget Creation Flow

1. User clicks "Add Image" in toolbar
2. `AddImageModal` opens showing available images
3. User can upload new images or select existing
4. On selection, `handleImageSelected()` is called
5. New widget with temp ID is added to state immediately
6. POST to `/api/dashboard-widgets` creates server-side widget
7. Temp ID is replaced with server-generated ID

## Style Updates

Style changes are debounced and sent via PUT to `/api/dashboard-widgets`:
```typescript
await $fetch('/api/dashboard-widgets', {
  method: 'PUT',
  body: { widgetId, style: { ...updates } }
})
```

## Interactive Links

Image widgets support two link types:

### URL Link
Direct link to external URL with optional "open in new tab" behavior.

### Dashboard Tab Link
Link to any tab of any dashboard the user has access to. When clicked, navigates to:
```
/dashboards/{dashboardId}?tab={tabId}
```

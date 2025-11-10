# Scheduled Reports Implementation

## Overview

The Scheduled Reports system enables users to create automated report deliveries via email. Users can configure reports based on dashboards or individual charts, set up recurring schedules (daily, weekly, monthly), and receive formatted exports (PDF, CSV, XLS, PNG) at specified times.

## Architecture

### Core Components

1. **Database Layer**: Two main tables with Row Level Security
2. **Backend API**: Server routes using Supabase Service Role
3. **Frontend**: Nuxt 3 pages and components with full dark mode support
4. **Scheduling**: Vercel Cron integration (planned)

## Database Schema

### Table: `reports`

Stores the configuration for each scheduled report.

```sql
CREATE TABLE public.reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_title TEXT NOT NULL,
    recipients JSONB NOT NULL,
    email_subject TEXT NOT NULL,
    email_message TEXT,
    scope TEXT NOT NULL CHECK (scope IN ('Single Chart', 'Dashboard')),
    dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE CASCADE,
    chart_id BIGINT REFERENCES public.charts(id) ON DELETE CASCADE,
    time_frame TEXT NOT NULL CHECK (time_frame IN ('As On Dashboard', 'Last 7 Days', 'Last 30 Days', 'Last Quarter')),
    formats JSONB NOT NULL,
    interval TEXT NOT NULL CHECK (interval IN ('DAILY', 'WEEKLY', 'MONTHLY')),
    send_time TEXT NOT NULL,
    timezone TEXT NOT NULL,
    day_of_week JSONB,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Draft')),
    CONSTRAINT check_content_type_strict CHECK (
        (scope = 'Dashboard' AND dashboard_id IS NOT NULL AND chart_id IS NULL) OR
        (scope = 'Single Chart' AND dashboard_id IS NULL AND chart_id IS NOT NULL)
    )
);
```

### Table: `email_queue`

Tracks individual scheduled report deliveries for Vercel Cron processing.

```sql
CREATE TABLE public.email_queue (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (delivery_status IN ('PENDING', 'SENT', 'FAILED', 'CANCELLED')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE
);
```

### Security: Row Level Security (RLS)

Both tables have RLS enabled with policies that allow:
- Users to manage their own reports
- Admins to view all email queue entries for monitoring
- Service role to bypass RLS for system operations

### Database Migrations

#### `20251111120000_add_dashboard_chart_columns_to_reports.sql`
- Adds `dashboard_id` (UUID) and `chart_id` (BIGINT) columns
- Creates foreign key constraints to dashboards and charts tables
- Adds indexes for performance
- Includes CHECK constraint ensuring only one content type per report

#### `20251111120001_cleanup_reports_content_id.sql`
- Migrates existing data from `content_id` to appropriate new columns
- Validates migration success
- Removes old `content_id` column
- Finalizes constraints for data integrity

## Backend Implementation

### API Routes

#### `POST /api/reports` - Create Report
- **Authentication**: Requires authenticated user
- **Validation**: Comprehensive server-side validation
- **Request Payload**:
  ```json
  {
    "report_title": "string",
    "recipients": ["email1@example.com", "email2@example.com"],
    "email_subject": "string",
    "email_message": "string (optional)",
    "scope": "Dashboard" | "Single Chart",
    "dashboard_id": "uuid (if scope = 'Dashboard')",
    "chart_id": "number (if scope = 'Single Chart')",
    "time_frame": "Last 7 Days" | "Last 30 Days" | "Last Quarter" | "As On Dashboard",
    "formats": ["PDF", "XLS", "CSV", "PNG"],
    "interval": "DAILY" | "WEEKLY" | "MONTHLY",
    "send_time": "HH:MM",
    "timezone": "string",
    "day_of_week": ["Mo", "Tu", "We", "Th", "Fr"] // only for WEEKLY
  }
  ```
- **Operations**:
  - Validates all required fields based on scope
  - Calculates next run time based on schedule
  - Creates report record with appropriate content reference
  - Creates initial email queue entry
- **Response**: `{ success: true, reportId: string }`

#### `PUT /api/reports` - Update Report
- **Authentication**: Requires authenticated user
- **Authorization**: Verifies user owns the report
- **Operations**:
  - Updates report configuration
  - Deletes existing queue entries
  - Recalculates and creates new queue entry
- **Response**: `{ success: true, reportId: string }`

### Service Role Usage

All database operations use the Supabase Service Role to bypass RLS, ensuring:
- Reliable system operations regardless of user permissions
- Proper audit trails and data integrity
- Administrative monitoring capabilities

## Frontend Implementation

### Pages

#### `/pages/reports/index.vue` - Reports List
**Features:**
- List all user reports with status, schedule, and actions
- Navigation to create/edit pages
- Real-time next run time calculation
- Toast notifications for all operations
- Actions: Edit (navigates to edit page), Pause/Activate, Delete

**State Management:**
```typescript
const reports = ref([])
const loading = ref(true)
const nextRunTimes = ref(new Map())
const toast = useToast()
```

**Navigation:**
- "Create New Report" button → `/reports/create`
- "Edit" button → `/reports/edit/:id`

#### `/pages/reports/create.vue` - Create New Report
**Features:**
- Dedicated page for creating new reports
- Back button navigation to reports list
- Success toast notification on creation
- Automatic redirect to reports list after save

**Structure:**
```typescript
- Uses shared CreateReportForm component
- Handles @report-created event
- Shows toast and redirects to /reports
```

#### `/pages/reports/edit/[id].vue` - Edit Existing Report
**Features:**
- Dedicated page for editing reports
- Loads report data by ID from route params
- Loading and error states
- Back button navigation to reports list
- Success toast notification on update
- Automatic redirect to reports list after save

**Structure:**
```typescript
- Fetches report data using getReport(id)
- Passes data to CreateReportForm via editingReport prop
- Handles @report-created event
- Shows toast and redirects to /reports
```

#### `/pages/reports/monitor.vue` - Admin Email Queue Monitor
**Features:**
- View all email queue entries across all users
- Filter by delivery status
- Real-time statistics dashboard
- Pagination for large datasets
- Admin-only access via role-based routing

### Components

#### `components/reports/CreateReportForm.vue` - Shared Report Configuration Form
**Props:**
- `editingReport?: any` - Optional report data for edit mode

**Emits:**
- `report-created` - Emitted after successful create/update
- `cancel` - Emitted when user cancels the form

**Sections:**
1. **Recipients & Message**
   - Report title input
   - Dynamic recipient management (add/remove/clear)
   - Email subject and optional message

2. **Content Selection**
   - Scope: Dashboard vs Single Chart
   - Content selector (populated dynamically)
   - Time frame options
   - Export format checkboxes

3. **Schedule Configuration**
   - Frequency: Daily/Weekly/Monthly
   - Send time and timezone (client-only rendering)
   - Conditional day-of-week selection

**Features:**
- Real-time validation with error display
- Form pre-population for edit mode
- Dynamic content loading based on scope
- Comprehensive timezone support with hydration-safe rendering
- Shared component used by both create and edit pages

### Composables

#### `useScheduledReportsService.ts`
Provides typed API methods for report operations:

```typescript
export type ScheduledReport = {
  id: string
  created_at: string
  user_id: string
  report_title: string
  recipients: any[]
  email_subject: string
  email_message?: string
  scope: 'Single Chart' | 'Dashboard'
  dashboard_id?: string
  chart_id?: number
  time_frame: string
  formats: string[]
  interval: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  send_time: string
  timezone: string
  day_of_week?: string[]
  status: 'Active' | 'Paused' | 'Draft'
}

export function useScheduledReportsService() {
  async function listReports(): Promise<ScheduledReport[]>
  async function getReport(id: string): Promise<ScheduledReport | null>
  async function createReport(data): Promise<{ success: boolean; reportId: string }>
  async function updateReport(id, updates): Promise<{ success: boolean }>
  async function deleteReport(id): Promise<{ success: boolean }>
  async function toggleReportStatus(id, status): Promise<{ success: boolean }>
  async function getEmailQueueForReport(reportId): Promise<EmailQueueItem[]>
  async function listEmailQueue(filters): Promise<{ items, total }>
}
```

## Key Features

### 1. Full CRUD Operations
- ✅ Create new scheduled reports
- ✅ Edit existing reports with form pre-population
- ✅ Delete reports with confirmation modal
- ✅ Toggle active/paused/draft status

### 2. Advanced Scheduling
- ✅ Daily, weekly, monthly intervals
- ✅ Timezone-aware scheduling
- ✅ Day-of-week selection for weekly reports
- ✅ Next run time calculation and display
- ✅ Status-aware display (shows "Paused"/"Draft" instead of future dates)

### 3. Content Integration
- ✅ Dashboard-based reports with UUID references
- ✅ Single chart reports with integer ID references
- ✅ Multiple export formats with icons (PDF, XLS, CSV, PNG)
- ✅ Time frame filtering
- ✅ Separate database columns for type safety

### 4. User Experience
- ✅ Dedicated pages for create and edit operations
- ✅ Toast notifications for all actions (create, update, delete, toggle)
- ✅ Real-time validation with error display (only after submit attempt)
- ✅ Loading and error states for data fetching
- ✅ Responsive design for all screen sizes
- ✅ Bookmarkable URLs for create/edit flows
- ✅ Button-style UI for all form controls (radio groups, checkboxes)
- ✅ Visual icons for export formats
- ✅ Improved accessibility with proper button semantics

### 5. Dark Mode Support
- ✅ Complete dark theme implementation
- ✅ Proper contrast ratios for all elements
- ✅ Theme-aware color schemes
- ✅ Consistent styling across light/dark modes

### 6. Security & Validation
- ✅ Server-side validation with detailed error messages
- ✅ User ownership verification
- ✅ Input sanitization and type checking
- ✅ Row Level Security with service role bypass

## Technical Challenges Solved

### 1. Promise Serialization Error
**Issue:** Vue templates can't render Promise objects directly
**Solution:** Pre-fetch data and store in reactive Map for synchronous access

### 2. Row Level Security Conflicts
**Issue:** Client-side operations blocked by RLS policies
**Solution:** Server-side API routes using Supabase Service Role

### 3. Form State Management
**Issue:** Complex form with dynamic fields and edit mode
**Solution:** Reactive watchers, proper form reset, and state synchronization

### 4. SSR Hydration Mismatch - Timezone Detection
**Issue:** Server and client detect different timezones causing hydration warnings
**Solution:** 
- Default to 'UTC' on server-side render
- Wrap timezone selector in `<ClientOnly>` component
- Detect user timezone only on client mount using `process.client` check
- Provide loading fallback UI during hydration

### 5. Function Initialization Order
**Issue:** Watcher with `immediate: true` tried to call `resetForm()` before function declaration
**Solution:** Reorganized code to declare all functions before watchers that depend on them

### 6. Edit Mode Complexity
**Issue:** Pre-populating form with existing data while maintaining reactivity
**Solution:** Watcher-based form population with proper cleanup and data fetching on mount

### 7. Shared Component Architecture
**Issue:** Need same form for create and edit without code duplication
**Solution:**
- Single `CreateReportForm` component used by both pages
- Props-based edit mode detection
- Event-based communication with parent pages
- Pages handle navigation and toast notifications

### 8. Type Safety for Polymorphic Content References
**Issue:** Single `content_id` column couldn't handle both UUID (dashboards) and integer (charts) references
**Solution:**
- Split into separate `dashboard_id` (UUID) and `chart_id` (BIGINT) columns
- Added foreign key constraints for referential integrity
- CHECK constraint ensures only one content type per report
- Proper TypeScript types with optional fields

### 9. Backward Compatibility During Migration
**Issue:** Existing reports used old `content_id` field while new code expected separate columns
**Solution:**
- API temporarily accepts both old and new field formats
- Form falls back to `content_id` when new fields aren't populated
- Graceful migration path for existing data
- Clean removal of legacy fields after migration

### 10. Button-Style Form Controls
**Issue:** Traditional radio buttons and checkboxes didn't match modern UI expectations
**Solution:**
- Converted all radio groups to button-style toggles
- Multi-select checkboxes became button toggles with icons
- Consistent orange accent color for selected states
- Auto-width buttons that size to content
- Improved accessibility with proper button semantics

## Future Enhancements

### Vercel Cron Integration
- Deploy cron job to process email queue
- Email delivery with attachment generation
- Retry logic and failure handling
- Admin monitoring dashboard

### Advanced Features
- Report templates and presets
- Bulk report operations
- Report sharing and permissions
- Historical delivery logs
- Custom email templates

### Performance Optimizations
- Report caching and pre-generation
- Batch email processing
- Queue prioritization
- Real-time delivery status updates

## Architecture Highlights

### Page Structure
```
/reports                    → List all reports
/reports/create            → Create new report
/reports/edit/:id          → Edit existing report
/reports/monitor           → Admin queue monitoring
```

### User Flow
```
┌─────────────────────────────────────────────────────────────┐
│                     /reports (List Page)                     │
│  - View all reports in table                                │
│  - Toggle status (Pause/Activate) → Toast notification       │
│  - Delete report → Confirmation → Toast notification         │
└─────────────────────────────────────────────────────────────┘
         │                                    │
         │ Click "Create"                     │ Click "Edit"
         ↓                                    ↓
┌─────────────────────┐           ┌─────────────────────────┐
│  /reports/create    │           │  /reports/edit/:id      │
│  - Back button      │           │  - Back button          │
│  - Form (empty)     │           │  - Loading state        │
│  - Cancel → back    │           │  - Error handling       │
│  - Save → toast +   │           │  - Form (pre-filled)    │
│    redirect         │           │  - Cancel → back        │
└─────────────────────┘           │  - Save → toast +       │
                                  │    redirect             │
                                  └─────────────────────────┘
         │                                    │
         └────────────────┬───────────────────┘
                          ↓
              ┌───────────────────────┐
              │  CreateReportForm     │
              │  (Shared Component)   │
              │  - Form validation    │
              │  - API calls          │
              │  - Emits events       │
              └───────────────────────┘
```

### Component Reusability
- `CreateReportForm` is shared between create and edit pages
- Pages handle routing, data fetching, and notifications
- Component handles form logic, validation, and API calls
- Event-driven communication between pages and form

### Hydration-Safe SSR
- Client-only rendering for timezone detection
- Proper fallback UI during hydration
- No server/client mismatch warnings
- `process.client` checks for browser-specific APIs

## Conclusion

The Scheduled Reports implementation provides a robust, user-friendly system for automated report delivery with:

- **Complete CRUD functionality** with dedicated pages for each operation
- **Toast notifications** for immediate user feedback
- **Advanced scheduling** with hydration-safe timezone support
- **Enterprise-grade security** using service roles
- **Full dark mode compatibility** for modern UX
- **Scalable architecture** ready for Vercel Cron integration
- **Clean separation of concerns** between pages and components

The system successfully bridges the gap between user-facing report creation and backend automation, providing a seamless experience for managing scheduled report deliveries with proper SSR/CSR handling. 🎯

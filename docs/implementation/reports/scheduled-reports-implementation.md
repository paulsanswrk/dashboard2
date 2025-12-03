# Scheduled Reports Implementation

## Overview

The Scheduled Reports system enables users to create automated report deliveries via email. Users can configure reports based on dashboards or individual charts, set up recurring schedules (daily, weekly, monthly), and receive formatted exports (PDF, CSV, XLS) at specified times. The system includes complete scheduling, processing, monitoring, and delivery capabilities with enterprise-grade
reliability and security.

**Status**: ✅ **FULLY IMPLEMENTED AND PRODUCTION READY**

The implementation includes:

- Complete scheduling engine with timezone support
- Automated cron job processing via Vercel
- Multi-format report generation (PDF, CSV, XLS)
- Email delivery with attachments
- Comprehensive logging and monitoring
- Admin dashboard with real-time updates
- Retry mechanisms and error recovery

## Architecture

### Core Components

1. **Database Layer**: Enhanced tables with Row Level Security and performance indexes
2. **Scheduling Engine**: TypeScript utility for timezone-aware scheduling calculations
3. **Cron Job Processing**: Vercel Cron integration with automated report generation
4. **Report Generation**: Multi-format export system (PDF, CSV, XLS) using Puppeteer and SQL execution
5. **Email Service**: SendGrid-powered email delivery with attachment support
6. **Logging System**: Comprehensive audit logging to `app_log` table
7. **Backend API**: Server routes using Supabase Service Role with security policies
8. **Frontend**: Nuxt 3 pages and components with full dark mode support and real-time monitoring

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
    scope TEXT NOT NULL CHECK (scope IN ('Dashboard', 'Single Tab')),
    dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE CASCADE,
    tab_id UUID REFERENCES public.dashboard_tab(id) ON DELETE CASCADE,
    time_frame TEXT NOT NULL CHECK (time_frame IN ('As On Dashboard', 'Last 7 Days', 'Last 30 Days', 'Last Quarter')),
    formats JSONB NOT NULL,
    formats_metadata JSONB,
    interval TEXT NOT NULL CHECK (interval IN ('DAILY', 'WEEKLY', 'MONTHLY')),
    send_time TEXT NOT NULL,
    timezone TEXT NOT NULL,
    day_of_week JSONB,
    next_run_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Draft')),
    CONSTRAINT check_content_type_strict CHECK (
        (scope = 'Dashboard' AND dashboard_id IS NOT NULL AND tab_id IS NULL) OR
        (scope = 'Single Tab' AND dashboard_id IS NULL AND tab_id IS NOT NULL)
    ),
    CONSTRAINT check_formats_valid CHECK (formats <@ '["PDF", "XLS", "CSV"]'::jsonb AND jsonb_array_length(formats) > 0)
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

### Table Schema Details

#### New Columns Added (Sprint 1)

- **`formats_metadata` JSONB**: Stores metadata for export formats, including tab information for XLS/CSV exports
- **`next_run_at` TIMESTAMP WITH TIME ZONE**: Timezone-aware timestamp for the next scheduled run, automatically recalculated when schedule updates
- **`check_formats_valid` CONSTRAINT**: Ensures formats array only contains `["PDF", "XLS", "CSV"]` (PNG removed as per requirements)

#### Performance Indexes

- **`idx_email_queue_next_run_at`**: Index on `next_run_at` for efficient scheduling queries
- **`idx_email_queue_cron_lookup`**: Composite index on `(scheduled_for, delivery_status)` for cron job processing (filtered to `PENDING` status)

### Security: Row Level Security (RLS)

Both tables have comprehensive RLS enabled with policies that allow:

- **Users**: Manage their own reports and view email queue entries for their reports
- **Service Role**: Full access to all reports and email queue for cron job processing
- **Secure Access**: All operations validated through user ownership or service role authentication

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

#### `20251125120000_sprint_01_report_scheduling_updates.sql` ⭐ **NEW**

- **Formats Validation**: Adds CHECK constraint limiting formats to `["PDF", "XLS", "CSV"]` only (removes PNG support)
- **Timezone-Aware Scheduling**: Adds `next_run_at` column with timezone support
- **Format Metadata**: Adds `formats_metadata` JSONB for export configuration
- **Performance Indexes**: Adds indexes on `email_queue` for efficient cron job queries:
    - `idx_email_queue_next_run_at` for general scheduling queries
    - `idx_email_queue_cron_lookup` composite index on `(scheduled_for, delivery_status)` with WHERE clause for PENDING status
- **Enhanced RLS Policies**: Comprehensive security policies with service role bypass for both reports and email_queue tables
- **Automatic Updates**: Trigger function to recalculate `next_run_at` when schedule changes

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
    "scope": "Dashboard" | "Single Tab",
    "dashboard_id": "uuid (if scope = 'Dashboard')",
    "tab_id": "uuid (if scope = 'Single Tab')",
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

### Scheduling Engine ⭐ **NEW**

#### `server/utils/schedulingUtils.ts` - Next Run Time Calculator

The scheduling engine provides timezone-aware calculation of next run times for scheduled reports.

**Key Functions:**

- `calculateNextRun(schedule, fromTime?)`: Calculates next execution timestamp
- `validateSchedule(schedule)`: Validates schedule configuration
- `getUpcomingRuns(schedule, count)`: Returns multiple future run times
- `shouldRunNow(scheduledTime, tolerance)`: Checks if schedule should execute
- `formatRunTime(runTime, userTimezone)`: Formats DateTime for display in user timezone

**Features:**

- ✅ **Timezone Support**: Full IANA timezone handling using Luxon
- ✅ **Interval Types**: DAILY, WEEKLY, MONTHLY with proper date math
- ✅ **Day-of-Week Selection**: Weekly reports support specific days (Mo, Tu, We, Th, Fr, Sa, Su)
- ✅ **Validation**: Comprehensive input validation with error messages
- ✅ **Future Scheduling**: Handles past/future time calculations correctly
- ✅ **Day Mapping**: Proper weekday mapping for cron-like scheduling

**Example Usage:**

```typescript
const schedule = {
  interval: 'WEEKLY',
  send_time: '09:00',
  timezone: 'America/New_York',
  day_of_week: ['Mo', 'We', 'Fr']
}

const nextRun = calculateNextRun(schedule)
// Returns DateTime object for next Monday/Wednesday/Friday at 9:00 AM EST
```

**Example Usage:**

```typescript
const schedule = {
  interval: 'WEEKLY',
  send_time: '09:00',
  timezone: 'America/New_York',
  day_of_week: ['Mo', 'We', 'Fr']
}

const nextRun = calculateNextRun(schedule)
// Returns DateTime object for next Monday/Wednesday/Friday at 9:00 AM EST
```

### Cron Job Processing ⭐ **NEW**

#### `server/api/cron/process-reports.get.ts` - Vercel Cron Job Handler

Automated report processing endpoint triggered by Vercel Cron every 5 minutes.

**Security:**

- Token-based authentication (`CRON_SECRET`)
    - Generate with: `openssl rand -hex 32`
    - Should be exactly 64 hex characters (32 bytes)
- Local development bypass: When `DEBUG_ENV=true` in `.env`, authentication is bypassed for testing
- Service role database access for system operations

**Processing Logic:**

1. **Queue Selection**: Finds PENDING items within 5-minute execution window
2. **Batch Processing**: Processes multiple reports per cron run
3. **Retry Logic**: Automatic retry up to 3 attempts with exponential backoff
4. **Next Run Scheduling**: Recalculates next execution for recurring reports
5. **Error Handling**: Comprehensive error logging and recovery

**Response Format:**

```json
{
  "success": true,
  "processed": 5,
  "successful": 4,
  "failed": 1,
  "duration": 1250
}
```

### Report Generation Engine ⭐ **NEW**

#### `server/utils/reportGenerator.ts` - Multi-Format Report Generation

Generates PDF, CSV, and XLS reports from dashboard/chart data using a unified interface.

**Core Function:**

- `generateReportAttachments(report)`: Main function that orchestrates report generation

**PDF Generation:**

- Uses existing dashboard PDF logic with Puppeteer
- Supports both dashboard-wide and single-tab reports
- Pixel-perfect rendering with custom dimensions (1800px width, dynamic height)
- Context token security for authenticated access
- Cross-platform Chrome/Chromium detection for development
- @sparticuz/chromium for serverless environments

**CSV Generation:**

- Executes individual chart SQL queries to extract data
- Applies time frame filtering to queries
- **Single Chart**: Generates individual CSV file per chart
- **Multiple Charts**: Creates ZIP file with organized directory structure:
    - Subdirectories named after dashboard tabs
    - Individual CSV files named after charts within each tab
    - Filename deduplication for charts with identical names (adds `_1`, `_2`, etc.)
- Intelligent SQL query modification for time frame filtering

**XLS Generation:**

- Executes individual chart SQL queries to extract data
- Applies time frame filtering to queries
- **Single Excel File**: Creates multi-sheet workbook (Excel container format)
- **Sheet Naming**: `{TabName}_{ChartName}` format with workbook-level deduplication
- **Data Conversion**: Transforms SQL result objects to Excel tabular format with headers
- **Multiple Charts**: One sheet per chart within single Excel file

**Supported Formats:**

- **PDF**: Full dashboard rendering using Puppeteer with networkidle0 waiting
- **CSV**: Individual chart data in ZIP structure for multiple charts, single file for single chart
- **XLS**: Multi-sheet Excel workbook with proper data formatting

**Time Frame Filtering:**

- **Last 7 Days**: `created_at >= NOW() - INTERVAL '7 days'`
- **Last 30 Days**: `created_at >= NOW() - INTERVAL '30 days'`
- **Last Quarter**: `created_at >= NOW() - INTERVAL '3 months'`
- **As On Dashboard**: No filtering applied

### Email Service ⭐ **NEW**

#### `server/utils/emailService.ts` - Report Email Delivery

Professional email delivery with attachment support using SendGrid.

**Core Functions:**

- `sendReportEmail(data)`: Sends reports with multiple attachments
- `sendTestEmail(to)`: Test email configuration
- `generateReportEmailTemplate(data)`: Creates professional email templates

**Features:**

- SendGrid integration with proper error handling
- HTML email templates with dark mode support
- Multi-attachment handling (PDF + CSV + XLS)
- Custom message inclusion from report configuration
- Delivery status tracking and error reporting
- Professional Optiqo branding with responsive design

**Template Features:**

- Professional Optiqo branding with logo
- Responsive design for all devices and email clients
- Dark mode compatible styling
- Security notices and disclaimers
- Attachment summary with file type icons
- Custom message section for report creators

**Email Template Structure:**

- Header with Optiqo branding and "Scheduled Report" badge
- Report title and delivery information
- Custom message section (if provided)
- Attachments list with download-ready links
- Footer with security notices and branding

### Logging System ⭐ **NEW**

#### `server/utils/loggingUtils.ts` - Comprehensive Audit Logging

All system operations logged to the `app_log` table for monitoring and debugging.

**Core Functions:**

- `logToAppLog()`: Generic logging function with structured data
- `logReportCreated()`, `logReportUpdated()`, `logReportDeleted()`: Report lifecycle logging
- `logCronJobExecution()`: Cron job performance metrics
- `logReportProcessingStart/Success/Failure()`: Detailed processing tracking
- `logEmailSent()`: Email delivery status
- `logAttachmentGeneration()`: Report generation tracking
- `logAuthFailure()`: Security event logging
- `logPerformance()`: Performance monitoring
- `cleanupOldLogs()`: Log maintenance utility

**Log Categories:**

- **Cron Jobs**: Execution tracking and performance metrics with duration
- **Report Processing**: Success/failure events with attempt counts and error details
- **Email Delivery**: Send status, recipient counts, and delivery errors
- **User Actions**: Authentication, authorization, and CRUD operations
- **Performance**: Duration and resource usage metrics
- **Security**: Authentication failures and access control events
- **System Health**: Component status and error monitoring

**Log Levels:** `error`, `warn`, `debug` with structured JSON metadata

**Database Integration:** All logs stored in `app_log` table with proper indexing on level, time, and user_id

### Additional API Endpoints ⭐ **NEW**

#### `server/api/cron/process-reports.get.ts` - Vercel Cron Job Handler

- Secure cron job endpoint with token authentication (`CRON_SECRET`)
- Processes pending `email_queue` entries within 5-minute execution window
- Automatic retry logic (max 3 attempts) with exponential backoff
- Recalculates next run times for recurring reports
- Comprehensive error handling and logging
- Service role database access for system operations

**Processing Logic:**

1. **Queue Selection**: Finds PENDING items within 5-minute tolerance window
2. **Batch Processing**: Processes multiple reports per cron run
3. **Report Generation**: Calls `generateReportAttachments()` for each format
4. **Email Delivery**: Sends formatted emails with attachments via SendGrid
5. **Next Run Scheduling**: Creates new queue entries for recurring reports
6. **Error Recovery**: Updates attempt counts and handles failures gracefully

#### `server/api/email-queue/retry.post.ts` - Manual Retry

- Resets failed queue items to PENDING status for retry
- Validates retry eligibility (max 3 attempts, must be FAILED status)
- User authentication required
- Updates attempt count and clears error messages
- Returns success/error status with descriptive messages

#### `server/api/email-queue/cancel.post.ts` - Queue Cancellation

- Cancels pending queue items to prevent execution
- Only works on PENDING status items
- User authentication required
- Sets status to CANCELLED and updates processed_at timestamp
- Admin operation with proper authorization checks

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

#### `/pages/reports/monitor.vue` - Admin Email Queue Monitor ⭐ **ENHANCED**
**Features:**

- **Real-time Monitoring**: Auto-refresh every 30 seconds with pause/play controls
- **Manual Cron Execution**: Trigger cron job processing on-demand with loading states
- **Queue Management**: Retry failed items (max 3 attempts) and cancel pending items
- **Advanced Filtering**: Status-based filtering (All, Pending, Sent, Failed, Cancelled)
- **Detailed Inspection**: Modal popup showing complete queue item details and error messages
- **Live Statistics**: Real-time dashboard with color-coded status counts
- **Performance Tracking**: Last updated timestamps and auto-refresh status indicators
- **Admin Actions**: Full queue lifecycle management with confirmation dialogs
- **Responsive Design**: Works on all screen sizes with proper mobile layout
- **Error Handling**: Toast notifications for all operations with success/error feedback

**UI Components:**

- Status badges with appropriate colors (yellow=PENDING, green=SENT, red=FAILED, gray=CANCELLED)
- Action buttons for retry/cancel operations with loading states
- Statistics cards with icons and count displays
- Pagination for large queue lists
- Auto-scrolling table with proper overflow handling

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
    - Scope: Dashboard vs Single Tab
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
  scope: 'Dashboard' | 'Single Tab'
  dashboard_id?: string
  tab_id?: string
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
- ✅ Smart export formats:
    - **PDF**: Full dashboard rendering with pixel-perfect layout
    - **CSV**: Individual chart files in ZIP structure (multi-chart) or single file (single chart)
    - **XLS**: Multi-sheet Excel workbook with tab-prefixed sheet names
- ✅ Time frame filtering
- ✅ Separate database columns for type safety
- ✅ Filename/sheet name deduplication to prevent conflicts

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

## Production Deployment ⭐ **FULLY IMPLEMENTED**

### Environment Variables Required

```bash
# Cron Job Authentication
CRON_SECRET=your-secure-token-here

# Email Service (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_SENDER_EMAIL=noreply@optiqo.com

# Supabase (existing)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Vercel Configuration

The system is configured for automatic deployment with Vercel Cron:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-reports",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Database Migration

Run the Sprint 1 migration to enable the complete feature set:

```sql
-- Execute: docs/database/migrations/20251125120000_sprint_01_report_scheduling_updates.sql
```

## Architecture Highlights ⭐ **COMPLETE SYSTEM**

### End-to-End Flow

```
User Creates Report → Database Storage → Cron Job Trigger → Report Generation → Email Delivery → Logging
```

### Core Capabilities

- ✅ **Scheduling Engine**: Timezone-aware calculations with Luxon
- ✅ **Cron Processing**: Vercel-powered automated execution every 5 minutes
- ✅ **Multi-Format Generation**: PDF (Puppeteer), CSV (ZIP with individual chart files), XLS (multi-sheet Excel workbooks)
- ✅ **Email Delivery**: SendGrid with professional templates and attachments
- ✅ **Monitoring Dashboard**: Real-time admin interface with manual controls
- ✅ **Comprehensive Logging**: Full audit trail in `app_log` table
- ✅ **Security**: RLS policies with service role bypass
- ✅ **Error Recovery**: Automatic retry logic with manual intervention
- ✅ **Performance**: Optimized queries with database indexes

### Reliability Features

- **Automatic Retries**: Failed reports retry up to 3 times
- **Manual Intervention**: Admin can retry or cancel stuck items
- **Comprehensive Logging**: Every operation tracked for debugging
- **Graceful Degradation**: System continues operating even with partial failures
- **Security First**: All operations validated and audited

## Export Format Refinements ⭐ **LATEST**

### CSV Export Structure

- **Single Chart**: Direct CSV file download
- **Multiple Charts**: ZIP archive with organized structure:
  ```
  report_name_csv.zip/
  ├── tab_name_1/
  │   ├── chart_name_1.csv
  │   ├── chart_name_2.csv
  │   └── chart_name_2_1.csv  # Deduplicated filename
  └── tab_name_2/
      └── chart_name_3.csv
  ```
- **Deduplication**: Automatic numbering (`_1`, `_2`, etc.) for charts with identical names within the same tab

### XLS Export Structure

- **Single Excel File**: Multi-sheet workbook container format
- **Sheet Naming**: `{TabName}_{ChartName}` convention with workbook-level deduplication
- **Data Format**: Proper Excel tabular format with headers and converted SQL result objects
- **Sheet Conflicts**: Automatic suffix addition (`_1`, `_2`, etc.) for duplicate sheet names across the entire workbook

### Technical Implementation

- **ExcelJS Integration**: Proper Excel file generation with multi-sheet support
- **Data Transformation**: Object-to-array conversion for Excel compatibility
- **Conflict Resolution**: Separate deduplication logic for CSV filenames vs Excel sheet names
- **Format-Specific Handling**: CSV uses ZIP compression, XLS uses Excel's native container format

## Future Enhancements

- **Report Templates**: Pre-configured report formats
- **Advanced Scheduling**: Cron expression support
- **Bulk Operations**: Mass report management
- **Delivery Analytics**: Success rates and performance metrics
- **Custom Email Templates**: Branded email designs

---

**Status**: 🎉 **PRODUCTION READY** - Complete scheduled reports system with enterprise-grade reliability and monitoring capabilities.

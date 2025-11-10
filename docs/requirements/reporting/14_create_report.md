# Comprehensive Prompt: Reports & Email Queue Module Implementation (Nuxt 4 / Supabase / Vercel Cron)

**Goal:** Implement the full Reports module, including the report creation form, the index view, and a separate Admin monitoring page for email delivery status. The implementation must strictly adhere to the provided database schemas, utilize Vercel Cron for server-side scheduling logic, and be free of mock data where real data should exist (e.g., timezones).

**Tech Stack:**

- **Framework:** **Nuxt 4** (Composition API, `<script setup>`)
- **Styling:** Tailwind CSS (fully responsive design)
- **Database/Backend:** Supabase (Postgres, `useSupabaseClient()`)
- **Scheduling Backend:** Vercel Cron (logic moved out of the frontend, but initial scheduling time must be calculated and stored).

## 1. Supabase Database Schema Updates

We require two tables: `reports` (for configuration) and `email_queue` (for scheduled runs).

### Table A: `reports` (Report Configuration)

This table stores the full configuration for each recurring report.

| **Field Name** | **Data Type** | **Description** | **Constraints** |
| --- | --- | --- | --- |
| `id` | `UUID` | Unique identifier. | `primary key` |
| `created_at` | `timestampz` | Timestamp of creation. | `default now()` |
| `user_id` | `UUID` | ID of the user who created the report. | `references auth.users(id)` |
| `report_title` | `text` | The user-defined title of the report. | `not null` |
| `recipients` | `jsonb` | Array of recipient identifiers (emails/user IDs). | `not null` |
| `email_subject` | `text` | Subject line for the delivery email. | `not null` |
| `email_message` | `text` | Custom message body for the email. | `nullable` |
| `scope` | `text` | **'Single Chart'** or **'Dashboard'**. | `not null` |
| `content_id` | `UUID` | ID of the selected Dashboard or Chart. | `not null` |
| `time_frame` | `text` | Filter application: 'As On Dashboard', 'Last 7 Days', 'Last 30 Days', 'Last Quarter'. | `not null` |
| `formats` | `jsonb` | Array of selected formats: `['XLS', 'CSV', 'PDF', 'PNG']`. | `not null` |
| `interval` | `text` | **'DAILY'**, **'WEEKLY'**, or **'MONTHLY'**. | `not null` |
| `send_time` | `text` | Time of day to send (e.g., **'08:00'** in HH:MM format). | `not null` |
| `timezone` | `text` | User's IANA Timezone (e.g., 'Europe/Berlin'). | `not null` |
| `day_of_week` | `jsonb` | Array of selected days for weekly reports: `['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']`. | `nullable` |
| `status` | `text` | 'Active', 'Paused', 'Draft'. | `default 'Active'` |

### Table B: `email_queue` (Delivery Queue)

This table tracks individual scheduled report deliveries. This is what the Vercel Cron job will query to find jobs due to run.

| **Field Name** | **Data Type** | **Description** | **Constraints** |
| --- | --- | --- | --- |
| `id` | `UUID` | Unique identifier. | `primary key` |
| `report_id` | `UUID` | Foreign key to the `reports` table. | `not null`, `references reports(id)` |
| `scheduled_for` | `timestampz` | **The exact UTC time this specific email should be sent.** | `not null` |
| `delivery_status` | `text` | 'PENDING', 'SENT', 'FAILED', 'CANCELLED'. | `default 'PENDING'` |
| `attempt_count` | `integer` | Number of delivery attempts. | `default 0` |
| `error_message` | `text` | Last recorded error message upon failure. | `nullable` |
| `processed_at` | `timestampz` | Timestamp when the job was completed (sent or failed). | `nullable` |

## 2. Nuxt Component Structure & Index View

### Component 1: Reports Index (`pages/reports/index.vue`)

- **Header:** Displays a large title **"Scheduled Reports"** centered at the top.
- **Action Button:** A primary button **"+ Create New Report"** is positioned on the top right, which toggles the view to the creation form.
- **Data Table:** A responsive table lists existing reports fetched from the `reports` table for the current user.
- **Table Columns (Minimum):**

    - **Title** (`report_title`)
    - **Interval & Time:** Shows `interval` (Daily/Weekly/Monthly) and the specific scheduling detail (e.g., "Weekly on Mon, Wed, Fri at 08:00 (Europe/Berlin)").
    - **Recipients:** Summarized count (e.g., "5 Recipients").
    - **Status:** A visually distinct Pill/Tag showing 'Active', 'Paused', or 'Draft'.
    - **Next Run:** Shows the `scheduled_for` time from the earliest 'PENDING' entry in the `email_queue` for this report.
    - **Actions:** Action buttons for: **Edit**, **Pause/Activate** (toggles `status` field), and **Delete**.
- **Functionality:** Implement `fetchReports()` on mount and **`toggleReportStatus(reportId, currentStatus)`** to update the `reports.status` field.

## 3. Component 2: Create Report Form (`components/reports/CreateReportForm.vue`)

This form component is divided into three main sections: Recipients/Message, Content Selection, and Schedule Configuration.

### A. Reactive State (Form Model)

Use the required `reportForm` reactive object to manage state.

### B. UI Implementation Details (Textual Description)

Implement the form with the following structure:

| **Section** | **Field/Component** | **UI Description & Requirements** | **Data Binding** |
| --- | --- | --- | --- |
| **Recipients** | Report title | Standard text input for the report name. | `reportForm.report_title` |
|  | Select recipients | A **Tag/Chip Input component** that allows users to type emails or select from a simulated list of available users/groups (e.g., `userList` fetched from mock/Supabase `users` table). | `reportForm.recipients` |
|  | Subject | Standard text input for the email subject line. | `reportForm.email_subject` |
|  | Message | A **Textarea** input for the custom email body, with a visible character counter below it. | `reportForm.email_message` |
| **Content** | Scope | A radio button group or toggle buttons for **Single Chart** / **Dashboard**. | `reportForm.scope` |
|  | Content Selector | A **select dropdown**. The label and available options must dynamically change based on the selected `scope`. (Mock structures for `dashboardList` and `chartList` are required). | `reportForm.content_id` |
|  | Time frame | A **select dropdown** with the required options: 'As On Dashboard', 'Last 7 Days', 'Last 30 Days', 'Last Quarter'. | `reportForm.time_frame` |
|  | Format | A group of checkboxes allowing multiple selections: **XLS, CSV, PDF, PNG**. Must default to PDF selected. | `reportForm.formats` (Array) |
| **Schedule** | Interval | **Toggle/Segmented buttons** for the interval: **DAILY, WEEKLY, MONTHLY**. | `reportForm.interval` |
|  | Send at (Time) | A text input configured for **HH:MM** (24-hour format) input, defaulting to '08:00'. | `reportForm.send_time` |
|  | Send at (Timezone) | A **select dropdown** populated with a **comprehensive list of IANA Timezones** (e.g., 'America/New\_York', 'Europe/London', etc.). The display format should be user-friendly (e.g., "GMT+02:00 Europe/Berlin"). | `reportForm.timezone` |
|  | Day of week | A group of checkboxes (Mo, Tu, We, Th, Fr, Sa, Su). **This section must be conditionally rendered ONLY when `reportForm.interval === 'WEEKLY'`.** Default selection is Mo-Fr. | `reportForm.day_of_week` (Array) |

### C. Core Logic: Form Submission (`saveReport`)

The `saveReport` function must be an atomic operation that ensures data consistency for the Vercel Cron integration:

1. **Client-Side Validation:** All required fields must be validated.
2. **Scheduling Data Preparation:**

    - If `interval` is not 'WEEKLY', set `day_of_week` to `null`.
    - **Crucially, calculate the initial `next_scheduled_run` (UTC timestamp).**
3. **Supabase Transaction (Simulated):**

    - **Insert 1:** Insert the new report configuration into the `reports` table.
    - **Insert 2 (Immediate Follow-up):** Using the returned `report_id` and the calculated `next_scheduled_run` time, immediately insert the first entry into the **`email_queue`** table with `delivery_status: 'PENDING'`.
4. **Redirect:** Redirect the user back to `/reports` on success.

## 4. Helper Functions & Data

### A. Next Run Time Calculation (`calculateNextRunTime`)

The code must include a robust client-side function `calculateNextRunTime(reportConfig)` that takes the scheduling fields and returns the **next calculated UTC timestamp** when the report should run.

- **Inputs:** `interval`, `send_time` (HH:MM), `timezone` (IANA), `day_of_week`.
- **Logic:** Use standard JavaScript `Date` and `Intl` or the recommended **Day.js** library (if included in Nuxt 4 setup) to perform accurate timezone-aware calculations. The function must calculate the future run time based on the user's selected time/timezone, then convert that `Date` object to a final UTC timestamp string for the database.
- **Start Point:** Calculation must begin from the current time (`new Date()`).

### B. Comprehensive Timezone Data

Instead of a mock array, the component must define and use a comprehensive list of IANA Timezones (e.g., using `Intl.supportedValuesOf('timeZone')` or a large hardcoded list if the LLM cannot rely on environment features).

## 5. Admin Monitoring Page (`pages/reports/monitor.vue`)

Implement a simple administration page for monitoring the email queue, necessary for debugging and verifying the Vercel Cron process.

- **Header:** Displays a large title **"Email Queue Monitor"**.
- **Data Table:** Display a table listing all entries from the **`email_queue`** table (not just the current user's).
- **Table Columns (Minimum):**

    - **Report ID** (Link to the report or pop-up summary)
    - **Scheduled For** (Timestamp)
    - **Delivery Status** (Prominently styled, e.g., Green for SENT, Red for FAILED, Yellow for PENDING)
    - **Attempt Count**
    - **Processed At**
    - **Error Message** (Show only if FAILED)
- **Filtering:** Include basic filtering options (e.g., a dropdown) to view jobs by `delivery_status` (PENDING, SENT, FAILED).

**Final Output Requirement:** Provide a complete, single Nuxt component file (`pages/reports/index.vue`) that handles the index list and includes the `CreateReportForm` logic (as requested in the original prompt). If the LLM prefers to keep the form separate, provide both files and a third file for the `monitor.vue` page. Due to the complexity, providing two files is acceptable:

1. `pages/reports/index.vue` (Index and Creation Logic)
2. `pages/reports/monitor.vue` (Admin Monitor)
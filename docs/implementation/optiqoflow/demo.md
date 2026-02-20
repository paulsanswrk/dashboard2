# OptiqoFlow Demo Documentation

This document outlines the strategy for demonstrating the OptiqoFlow multi-tenant data architecture and chart capabilities.

## Goal

The demo aims to showcase:
1.  **Robust Charting:** The ability to visualize robust data sets using various chart types (Column, Bar, Pie, Area, Table).
2.  **Tenant Isolation:** How different tenants have access to different data schemas (columns) relevant to their vertical (Healthcare vs. Commercial vs. IoT).

## Demo Data Strategy

We utilize the `optiqoflow` schema in Supabase, which contains data simulating multiple tenants. Key columns are used to represent vertical-specific features that would only be present in specific tenant views.

### 1. Data Population

A comprehensive SQL script has been created to populate the database with realistic sample data:
`docs/examples/chart-configs/optiqoflow/populate_demo_data.sql`

**Tenants Created:**
-   **Visera (IoT)**: 10 devices (sensors, gateways) with real-time telemetry (battery, status).
-   **Beta Healthcare**: 1 Hospital Site with 10 Rooms (`occupied`, `discharged`, `sterile`).
-   **Acme Cleaning**: 1 Commercial Site (`Acme HQ`) with bulk work orders.
-   **Puhastusekpert**: 1 Quality Site (`Tallinn Office`) with detailed inspection data (`AQL`, `defects`).

### 2. Vertical-Specific Columns

| Vertical | Tenant Type | Key Column | Description |
| :--- | :--- | :--- | :--- |
| **Healthcare** | Hospital Facilities | `rooms.patient_status` | Status of patient rooms (Occupied, Discharged, Sterile). Used for discharge cleaning workflows. |
| **Advanced Quality** | Manufacturing/Industrial | `quality_inspections.aql_level` | Acceptable Quality Level (AQL) for statistical sampling inspections. |
| **IoT / Smart Buildings** | Tech-enabled Facilities | `devices.battery_percent` | Hardware telemetry data for fleet management. |
| **Generic / Universal** | All Tenants | `priority`, `status` | Standard work order properties available to everyone. |

## Chart Configurations

The demo configurations are saved in:
`docs/examples/chart-configs/optiqoflow/optiqoflow-sample-configs.json`

### 1. Work Orders by Priority (Universal)
*   **Type:** Column Chart
*   **Purpose:** Shows a standard operational view available to all tenants.
*   **Data:** `work_orders` grouped by `priority`.

### 2. Discharge Cleans by Patient Status (Healthcare)
*   **Type:** Bar Chart (Horizontal)
*   **Purpose:** Demonstrates a healthcare-specific workflow.
*   **Data:** `work_orders` joining `rooms` (Beta Healthcare tenant), grouping by `rooms.patient_status`.
*   **Note:** In a real multi-tenant scenario, the `patient_status` column would only exist in the `tenant_healthcare` schema.

### 3. Inspection AQL Analysis (Advanced Quality)
*   **Type:** Pie Chart
*   **Purpose:** Demonstrates a specialized quality assurance workflow.
*   **Data:** `quality_inspections` (Puhastusekpert tenant) grouped by `aql_level`.

### 4. Low Battery Devices (IoT)
*   **Type:** Table
*   **Purpose:** Demonstrates hardware fleet management capabilities.
*   **Data:** `devices` (Visera tenant) filtered for `battery_percent < 20`.

### 5. Work Order Trends (Universal)
*   **Type:** Area Chart
*   **Purpose:** Visualizes volume over time, a common requirement for all managers.
*   **Data:** `work_orders` grouped by `created_at` (daily).

### 6. OptiqoFlow Sync Demo
*   **Type:** Multi-page sync management interface.
*   **Purpose:** Demonstrates data synchronization, tenant isolation, and administrative control.
*   **Location:** `/optiqoflow-sync/demo` (Accessible via "OptiqoFlow Sync" -> "Demo" in sidebar).
*   **Features:**

    #### A. Tenant Overview & Global Reset
    The main dashboard (`/optiqoflow-sync/demo`) provides a high-level view of all tenants.
    -   **Tenant List:** Shows valid tenants, sync status (Active/Inactive), and last sync time.
    -   **Global Reset:** A destructive action (Red Trash Icon) to **wipe all operational data**.
        -   **Preserves:** `tenants` (definitions), `webhook_logs` (history).
        -   **Clears:** All other `optiqoflow` tables (customers, sites, work orders, devices, etc.).
        -   **Safety:** Protected by a secondary confirmation modal.

    #### B. Quick-Setup Presets
    Inside a tenant's config page (e.g., `/optiqoflow-sync/demo/[id]`), "Quick Presets" allow for instant configuration:
    1.  **Beta Facilities (Healthcare):** Auto-selects `rooms` (patient status), `service_types`, `audit_logs`.
    2.  **Acme Cleaning (Commercial):** Auto-selects `work_orders`, `sites`, `customers`, and standard cleaning tables.
    
    #### C. Detailed Sync Logs
    The logs page (`/optiqoflow-sync/logs`) provides a historical audit trail:
    -   **Source:** Reads from `tenants.webhook_logs` (centralized logging).
    -   **Details:** Tracks Status (success/error), Duration, Client IP, and Sync Type.
    -   **Interactive:** Click any row to see full JSON metadata in a dedicated sidebar.
    
    #### D. UX Enhancements
    -   **Smart Selection:** Clicking a table row automatically selects/deselects it.
    -   **Mandatory Columns:** Critical columns (`id`, `tenant_id`) are high-contrast and locked to prevent misconfiguration.
    -   **Visual Feedback:** Status badges, loading spinners, and clear error messages.

## How to Run the Demo

1.  **Prepare Data** (One-time):
    -   Run the migration script: `docs/examples/chart-configs/optiqoflow/populate_demo_data.sql` in Supabase.
2.  **Open Chart Builder**:
    -   Navigate to the dashboard's Chart Builder.
3.  **Load Config**:
    -   Enable **Debug Mode** (`DEBUG_ENV=true`).
    -   Open the **Debug: JSON Chart Config** panel.
    -   Copy the `config` object from the desired example in `optiqoflow-sample-configs.json`.
    -   Paste it into the debug panel and click **Apply Config**.

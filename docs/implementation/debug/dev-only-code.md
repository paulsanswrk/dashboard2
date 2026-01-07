# Development-Only Code

This document describes all dev-only features that are automatically excluded from production builds.

## How Dev-Only Exclusion Works

### Client-Side (Nuxt)

Debug components are excluded via `nuxt.config.ts`:

```ts
components: {
  dirs: [
    '~/components',
    { path: '~/components/debug', enabled: process.dev }
  ]
}
```

In templates, use `$nuxt.isDev` or computed properties based on `import.meta.dev`:

```vue
<DebugPanel v-if="$nuxt.isDev" />
```

### Server-Side (Nitro)

Files with `.dev.` in their name are auto-excluded by Nitro in production:

```
server/utils/debugConfig.dev.ts  ✅ excluded in prod
server/utils/debugConfig.ts      ❌ included in prod
```

In server code, use `import.meta.dev` for conditional logic:

```ts
if (import.meta.dev) {
  // Only runs in development
}
```

---

## Debug Components

Located in `components/debug/`:

### DebugGridLayoutPanel.vue

**Purpose**: Interactive panel for testing grid layout configurations on the dashboard edit page.

**Features**:
- Edit grid columns, row height, margins
- Toggle draggable/resizable/responsive settings
- View/edit layout JSON directly
- Layout statistics (items, width, height)

**Used in**: `pages/dashboards/[id].vue`

### DebugJoinsPanel.vue

**Purpose**: Shows foreign key relationship debugging info in the chart builder.

**Features**:
- Lists tables currently in use
- Shows count of relevant FKs
- Displays applied join paths

**Used in**: `components/reporting/ReportingJoinsImplicit.vue`

---

## Debug Server Utilities

### debugConfig.dev.ts

**Path**: `server/utils/debugConfig.dev.ts`

**Purpose**: Loads connection config from `config/debug-connection.json` for auto-filling the integration wizard.

**Exports**:
- `loadDebugConfig()` - Returns connection config or null
- `isDebugMode()` - Returns `import.meta.dev`
- `getDebugInfo()` - Returns debug metadata

**Used by**:
- `server/api/debug/config.get.ts`
- `server/api/debug/connection-example.get.ts`
- `server/api/debug/connection-examples.get.ts`
- `server/utils/mysqlClient.ts`

---

## Debug API Endpoints

All endpoints in `server/api/debug/`:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/debug/config` | Returns debug connection config |
| `GET /api/debug/connection-example` | Returns single example connection |
| `GET /api/debug/connection-examples` | Returns all example connections |

These endpoints check `import.meta.dev` and return 403 in production.

---

## Cron Auth Bypass

Cron endpoints bypass auth in dev mode for local testing:

| Endpoint | File |
|----------|------|
| `/api/cron/test` | `server/api/cron/test.get.ts` |
| `/api/cron/process-reports` | `server/api/cron/process-reports.get.ts` |
| `/api/cron/sync-data` | `server/api/cron/sync-data.get.ts` |

```ts
// Auth bypass pattern
if (import.meta.dev) {
  console.log('Bypassing auth for local development')
} else {
  // Verify CRON_SECRET...
}
```

---

## Debug UI in Components

### ReportingBuilder.vue

Shows debug JSON config panel when `isDebug` is true:

```ts
const nuxtApp = useNuxtApp()
const isDebug = computed(() => nuxtApp.static.isDev ?? import.meta.dev)
```

**Features**:
- JSON config textarea for testing chart configurations
- "Apply Builder State" / "Apply AI chartConfig" buttons
- "Export Current" button

---

## Adding New Dev-Only Code

### New Debug Component

1. Create component in `components/debug/YourComponent.vue`
2. Use in template with `v-if="$nuxt.isDev"`

### New Server Utility

1. Name file with `.dev.` suffix: `yourUtil.dev.ts`
2. Import with full path: `import { fn } from './yourUtil.dev'`

### Conditional Server Logic

```ts
if (import.meta.dev) {
  // Dev-only logic
}
```

---

## Environment Variables (Legacy)

`DEBUG_ENV` is no longer used. All references have been replaced with `import.meta.dev`.

Remaining `DEBUG_ENV` references (documentation only):
- `env.example` - Documents the (now-unused) variable
- `vitest.config.ts` - Sets for test environment
- Test files (`test-debug-*.js`)

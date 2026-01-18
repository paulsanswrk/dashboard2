# Playwright Setup Guide

## Installation

Playwright is already installed in the project. If you need to reinstall:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

## Configuration

The Playwright configuration is in `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    retries: 0,
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
        headless: true,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
```

## Environment Setup

### Required Environment Variables

1. **SUPABASE_SERVICE_ROLE_KEY** (Required)
   - Used for direct database operations (creating/deleting test users)
   - Get from Supabase Dashboard → Settings → API → service_role key

2. **PLAYWRIGHT_BASE_URL** (Optional)
   - Override the base URL for tests
   - Default: `http://localhost:3000`

### Running Tests

```bash
# Basic test run
SUPABASE_SERVICE_ROLE_KEY="your-key" npx playwright test

# With specific timeout
SUPABASE_SERVICE_ROLE_KEY="your-key" npx playwright test --timeout=120000

# Generate HTML report
SUPABASE_SERVICE_ROLE_KEY="your-key" npx playwright test --reporter=html

# Run in headed mode (requires display)
SUPABASE_SERVICE_ROLE_KEY="your-key" npx playwright test --headed
```

## Prerequisites

1. **Nuxt Dev Server**: Must be running on localhost:3000
   ```bash
   npm run dev
   ```

2. **reCAPTCHA Disabled**: Either via `ENABLE_RECAPTCHA=false` in `.env` or the automatic `NODE_ENV=test` bypass

3. **Supabase Access**: Valid service role key with permissions to:
   - Create/delete users in `auth.users`
   - Create/delete records in `profiles` table
   - Create/delete records in `organizations` table

## Test Directory Structure

```
tests/
└── e2e/                           # E2E test files
    └── user-management.spec.ts    # User CRUD tests
playwright.config.ts               # Configuration
test-results/                      # Auto-generated test outputs
```

## Troubleshooting

### Test Timeouts
Increase timeout in command:
```bash
npx playwright test --timeout=180000
```

### Login Failures
- Ensure reCAPTCHA is disabled
- Check that admin user was created successfully in beforeAll
- Verify Supabase service role key is correct

### Element Not Found
- Check if Vue hydration completed (add waits)
- Verify selectors match current DOM structure
- Use Playwright Inspector for debugging: `npx playwright test --debug`

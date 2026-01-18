# Playwright Testing Guide

This directory contains documentation for the Playwright E2E testing implementation in the Optiqo dashboard.

## Documentation Files

| File | Description |
|------|-------------|
| [setup.md](./setup.md) | Installation and configuration instructions |
| [user-management-test.md](./user-management-test.md) | User management CRUD test documentation |
| [best-practices.md](./best-practices.md) | Vue/Nuxt testing patterns and tips |

## Quick Start

```bash
# Ensure dev server is running on localhost:3000

# Run all E2E tests
SUPABASE_SERVICE_ROLE_KEY="your-key" npx playwright test

# Run specific test file
SUPABASE_SERVICE_ROLE_KEY="your-key" npx playwright test tests/e2e/user-management.spec.ts

# Run with UI mode (requires display)
SUPABASE_SERVICE_ROLE_KEY="your-key" npx playwright test --ui
```

## Test Structure

```
tests/
└── e2e/
    └── user-management.spec.ts    # User CRUD lifecycle test
playwright.config.ts                # Playwright configuration
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for direct DB operations |
| `PLAYWRIGHT_BASE_URL` | No | Override base URL (default: http://localhost:3000) |
| `SUPABASE_URL` | No | Override Supabase URL |

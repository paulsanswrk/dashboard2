# User Management E2E Test

## Overview

The user management test (`tests/e2e/user-management.spec.ts`) covers the complete CRUD lifecycle for users in the Optiqo dashboard.

## Test Flow

```mermaid
graph LR
    A[Setup] --> B[Login]
    B --> C[Create User]
    C --> D[Verify in DB]
    D --> E[Edit User]
    E --> F[Verify Edit UI]
    F --> G[Verify Edit DB]
    G --> H[Delete User]
    H --> I[Verify Deletion]
    I --> J[Cleanup]
```

## Test Phases

### 1. Setup (beforeAll)

Creates isolated test data:
- **Test Organization**: `PW_TEST_Organization_{timestamp}`
- **Test Admin**: `PW_TEST_admin_{timestamp}@test.optiqo.local`
- **Admin Profile**: With `ADMIN` role linked to organization

### 2. Login (beforeEach)

Authenticates before each test:
- Navigates to `/login`
- Waits for Vue hydration (3s)
- Types credentials using `pressSequentially()` for Vue v-model compatibility
- Waits for redirect away from login page

### 3. Create User

- Navigates to organization page
- Opens "Add User" modal
- Fills email, first name, last name using `pressSequentially()`
- Submits form and waits for modal to close

### 4. Database Verification (Creation)

```typescript
const { data: createdProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', createdUserId)
    .single();

expect(createdProfile.first_name).toBe(newFirstName);
```

### 5. Edit User

- Navigates to `/users`
- Clicks on user in list to select
- Updates first/last name in details panel
- Clicks "Save Changes"

### 6. UI Verification (Edit)

- Reloads page
- Re-selects user
- Verifies updated name is visible

### 7. Database Verification (Edit)

```typescript
const { data: updatedProfile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('user_id', createdUserId)
    .single();

expect(updatedProfile.first_name).toBe(updatedFirstName);
```

### 8. Delete User

- Clicks "Delete User" button
- Confirms in modal dialog
- Waits for deletion to complete

### 9. Verify Deletion

```typescript
const { data: deletedProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', createdUserId)
    .maybeSingle();

expect(deletedProfile).toBeNull();
```

### 10. Cleanup (afterAll)

Removes all test data:
- Created test user (if still exists)
- Test admin user
- Test organization
- Any orphaned profiles with `PW_TEST_` prefix

## Running the Test

```bash
# Standard run
SUPABASE_SERVICE_ROLE_KEY="your-key" \
npx playwright test tests/e2e/user-management.spec.ts

# With extended timeout
SUPABASE_SERVICE_ROLE_KEY="your-key" \
npx playwright test tests/e2e/user-management.spec.ts --timeout=180000

# With trace capture for debugging
SUPABASE_SERVICE_ROLE_KEY="your-key" \
npx playwright test tests/e2e/user-management.spec.ts --trace=on
```

## Expected Output

```
Running 1 test using 1 worker
Created test organization: abc123...
Created test admin: def456...
Created admin profile
Email input value: PW_TEST_admin_...@test.optiqo.local
User created in DB: ghi789...
User edit verified in DB
User deletion verified in DB
Cleaning up test data...
Cleanup complete!
  1 passed (58.0s)
```

## Test Data Prefix

All test data uses the `PW_TEST_` prefix for easy identification:
- `PW_TEST_Organization_{timestamp}`
- `PW_TEST_admin_{timestamp}@test.optiqo.local`
- `PW_TEST_user_{timestamp}@test.optiqo.local`
- `PW_TEST_John` / `PW_TEST_Jane` for first names

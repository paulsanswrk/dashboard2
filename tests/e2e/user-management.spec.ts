import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bnhhjzcitgaczpojzkxd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Test data prefix for easy identification and cleanup
const TEST_PREFIX = 'PW_TEST_';

// Generate unique test identifiers
const timestamp = Date.now();
const testAdminEmail = `${TEST_PREFIX}admin_${timestamp}@test.optiqo.local`;
const testAdminPassword = 'TestPassword123!';
const testUserEmail = `${TEST_PREFIX}user_${timestamp}@test.optiqo.local`;

let supabase: ReturnType<typeof createClient>;
let testAdminId: string;
let testOrganizationId: string;
let createdUserId: string;

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

test.beforeAll(async () => {
    // Initialize Supabase client with service role
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    // Create test organization
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: `${TEST_PREFIX}Organization_${timestamp}` })
        .select()
        .single();

    if (orgError) throw new Error(`Failed to create test organization: ${orgError.message}`);
    testOrganizationId = org.id;
    console.log(`Created test organization: ${testOrganizationId}`);

    // Create test admin user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testAdminEmail,
        password: testAdminPassword,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'Admin' }
    });

    if (authError) throw new Error(`Failed to create test admin: ${authError.message}`);
    testAdminId = authData.user.id;
    console.log(`Created test admin: ${testAdminId}`);

    // Create admin profile
    const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            user_id: testAdminId,
            first_name: 'Test',
            last_name: 'Admin',
            role: 'ADMIN',
            organization_id: testOrganizationId
        });

    if (profileError) throw new Error(`Failed to create admin profile: ${profileError.message}`);
    console.log('Created admin profile');
});

test.afterAll(async () => {
    console.log('Cleaning up test data...');

    // Delete created test user (if exists)
    if (createdUserId) {
        await supabase.from('profiles').delete().eq('user_id', createdUserId);
        await supabase.auth.admin.deleteUser(createdUserId);
        console.log(`Deleted test user: ${createdUserId}`);
    }

    // Delete test admin
    if (testAdminId) {
        await supabase.from('profiles').delete().eq('user_id', testAdminId);
        await supabase.auth.admin.deleteUser(testAdminId);
        console.log(`Deleted test admin: ${testAdminId}`);
    }

    // Delete test organization
    if (testOrganizationId) {
        await supabase.from('organizations').delete().eq('id', testOrganizationId);
        console.log(`Deleted test organization: ${testOrganizationId}`);
    }

    // Additional cleanup: delete any orphaned test users
    const { data: orphanedProfiles } = await supabase
        .from('profiles')
        .select('user_id')
        .like('first_name', `${TEST_PREFIX}%`);

    if (orphanedProfiles?.length) {
        for (const profile of orphanedProfiles) {
            await supabase.from('profiles').delete().eq('user_id', profile.user_id);
            await supabase.auth.admin.deleteUser(profile.user_id);
        }
        console.log(`Cleaned up ${orphanedProfiles.length} orphaned test profiles`);
    }

    console.log('Cleanup complete!');
});

// ============================================================================
// TESTS
// ============================================================================

test.describe('User Management E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Login as test admin
        await page.goto('/login');

        // Wait for page to fully load and Vue to hydrate
        // The submit button indicates the form is rendered
        const submitButton = page.locator('button[type="submit"]:has-text("Sign in")');
        await submitButton.waitFor({ state: 'visible', timeout: 20000 });

        // Wait for complete Vue hydration - wait for DOM to be stable
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Get input elements
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');

        // Focus and type into email field character by character
        await emailInput.click();
        await page.waitForTimeout(200);
        await emailInput.pressSequentially(testAdminEmail, { delay: 30 });

        // Verify email was typed
        const emailValue = await emailInput.inputValue();
        console.log(`Email input value: ${emailValue}`);

        // Focus and type into password field character by character  
        await passwordInput.click();
        await page.waitForTimeout(200);
        await passwordInput.pressSequentially(testAdminPassword, { delay: 30 });

        // Small delay to ensure Vue has processed the input
        await page.waitForTimeout(500);

        // Click submit button
        await submitButton.click();

        // Wait for navigation away from login page with longer timeout
        await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 45000 });

        // Wait for the main app to load
        await page.waitForLoadState('domcontentloaded');
    });

    test('should create, edit, verify, and delete a user', async ({ page }) => {
        // -------------------------------------------------------------------------
        // 1. Navigate to organization details page
        // -------------------------------------------------------------------------
        await page.goto(`/organizations/${testOrganizationId}`);
        await page.waitForLoadState('networkidle');

        // Verify we're on the correct page
        await expect(page.locator('h1')).toContainText('Organization');

        // -------------------------------------------------------------------------
        // 2. CREATE USER
        // -------------------------------------------------------------------------
        // Click "Add User" button in the Internal Users card header
        await page.locator('button:has-text("Add User")').first().click();
        await page.waitForSelector('text=Add New User');

        // Fill out the user form inside the modal
        const newFirstName = `${TEST_PREFIX}John`;
        const newLastName = 'Doe';

        // Target inputs inside the modal dialog
        const modal = page.locator('[role="dialog"]');

        // Wait for modal to be fully rendered
        await page.waitForTimeout(1000);

        // Fill email with keyboard simulation for Vue reactivity
        const emailInputModal = modal.locator('input[placeholder="Enter email address"]');
        await emailInputModal.click();
        await emailInputModal.pressSequentially(testUserEmail, { delay: 20 });

        // Fill first name
        const firstNameInputModal = modal.locator('input[placeholder="Enter first name"]');
        await firstNameInputModal.click();
        await firstNameInputModal.pressSequentially(newFirstName, { delay: 20 });

        // Fill last name
        const lastNameInputModal = modal.locator('input[placeholder="Enter last name"]');
        await lastNameInputModal.click();
        await lastNameInputModal.pressSequentially(newLastName, { delay: 20 });

        // Wait for Vue to process the inputs
        await page.waitForTimeout(500);

        // Submit the form - click the Add User button inside the modal
        const addUserBtn = modal.locator('button:has-text("Add User")');
        await addUserBtn.click();

        // Wait for modal to close and user to appear in list
        await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 });
        await page.waitForSelector(`text=${newFirstName}`, { timeout: 10000 });

        // Verify user appears in the UI
        await expect(page.locator(`text=${newFirstName} ${newLastName}`)).toBeVisible();

        // -------------------------------------------------------------------------
        // 3. VERIFY CREATION IN DATABASE
        // -------------------------------------------------------------------------
        const { data: createdProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, role, organization_id')
            .ilike('first_name', newFirstName)
            .single();

        expect(fetchError).toBeNull();
        expect(createdProfile).not.toBeNull();
        expect(createdProfile.first_name).toBe(newFirstName);
        expect(createdProfile.last_name).toBe(newLastName);
        expect(createdProfile.organization_id).toBe(testOrganizationId);

        createdUserId = createdProfile.user_id;
        console.log(`User created in DB: ${createdUserId}`);

        // -------------------------------------------------------------------------
        // 4. EDIT USER
        // -------------------------------------------------------------------------
        // Navigate to users page
        await page.goto('/users');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        // Click on the created user row to select them
        const userRow = page.locator(`text=${newFirstName}`).first();
        await userRow.waitFor({ state: 'visible', timeout: 30000 });
        await userRow.click();

        // Wait for user details panel to load
        await page.waitForSelector('text=User Details', { timeout: 10000 });

        // Update user properties
        const updatedFirstName = `${TEST_PREFIX}Jane`;
        const updatedLastName = 'Smith';

        // Clear and fill first name - target inputs in the right panel
        const detailsPanel = page.locator('.flex-1.p-4');
        const firstNameInput = detailsPanel.locator('input').first();
        await firstNameInput.click();
        await firstNameInput.clear();
        await firstNameInput.pressSequentially(updatedFirstName, { delay: 30 });

        // Clear and fill last name
        const lastNameInput = detailsPanel.locator('input').nth(1);
        await lastNameInput.click();
        await lastNameInput.clear();
        await lastNameInput.pressSequentially(updatedLastName, { delay: 30 });

        // Save changes
        await page.click('button:has-text("Save Changes")');

        // Wait for save to complete
        await page.waitForTimeout(2000);

        // -------------------------------------------------------------------------
        // 5. VERIFY EDIT BY RELOADING
        // -------------------------------------------------------------------------
        await page.reload();
        await page.waitForLoadState('domcontentloaded');

        // Click on the updated user to see details again
        await page.waitForSelector(`text=${updatedFirstName}`, { timeout: 30000 });
        await page.locator(`text=${updatedFirstName}`).first().click();
        await page.waitForSelector('text=User Details', { timeout: 10000 });

        // Verify the updated values appear in UI (use first() since it appears in both list and details)
        await expect(page.locator(`text=${updatedFirstName}`).first()).toBeVisible();

        // -------------------------------------------------------------------------
        // 6. VERIFY EDIT IN DATABASE
        // -------------------------------------------------------------------------
        const { data: updatedProfile, error: updateFetchError } = await supabase
            .from('profiles')
            .select('first_name, last_name, role')
            .eq('user_id', createdUserId)
            .single();

        expect(updateFetchError).toBeNull();
        expect(updatedProfile.first_name).toBe(updatedFirstName);
        expect(updatedProfile.last_name).toBe(updatedLastName);
        console.log('User edit verified in DB');

        // -------------------------------------------------------------------------
        // 7. DELETE USER
        // -------------------------------------------------------------------------
        // Click delete button in user details panel
        await page.click('button:has-text("Delete User")');

        // Wait for confirmation modal
        await page.waitForSelector('text=Are you sure you want to delete', { timeout: 5000 });

        // Confirm deletion - click Delete User button inside the confirmation modal
        const confirmModal = page.locator('[role="dialog"]:has-text("Are you sure")');
        await confirmModal.locator('button:has-text("Delete User")').click();

        // Wait for deletion to complete
        await page.waitForTimeout(2000);

        // -------------------------------------------------------------------------
        // 8. VERIFY DELETION IN DATABASE
        // -------------------------------------------------------------------------
        const { data: deletedProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', createdUserId)
            .maybeSingle();

        expect(deletedProfile).toBeNull();
        console.log('User deletion verified in DB');

        // Clear the ID since cleanup already happened
        createdUserId = '';
    });
});

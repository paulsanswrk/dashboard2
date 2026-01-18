# Playwright Best Practices for Vue/Nuxt

## Vue v-model Compatibility

### Problem
Standard Playwright `fill()` sets the input value directly but doesn't trigger Vue's v-model reactivity system. The value appears in the input but Vue's state remains empty.

### Solution
Use `pressSequentially()` to simulate actual keyboard input:

```typescript
// ❌ Doesn't work with Vue v-model
await input.fill('test@example.com');

// ✅ Works with Vue v-model
await input.click();
await input.pressSequentially('test@example.com', { delay: 30 });
```

## Vue Hydration

### Problem
Nuxt apps render on the server then "hydrate" on the client. Interacting before hydration completes can cause issues where inputs get cleared or events don't fire.

### Solution
Wait for hydration indicators:

```typescript
// Wait for specific UI element that indicates Vue is ready
const submitButton = page.locator('button[type="submit"]');
await submitButton.waitFor({ state: 'visible', timeout: 20000 });

// Additional safety wait
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
```

## Modal Handling

### Problem
Modals often contain buttons with the same text as page buttons, causing selector conflicts.

### Solution
Scope selectors to the modal:

```typescript
// ❌ May click wrong button
await page.click('button:has-text("Submit")');

// ✅ Scoped to modal
const modal = page.locator('[role="dialog"]');
await modal.locator('button:has-text("Submit")').click();
```

## Strict Mode Violations

### Problem
Playwright's strict mode fails when a selector matches multiple elements.

### Solution
Use `.first()` or more specific selectors:

```typescript
// ❌ Fails if multiple matches
await expect(page.locator('text=John')).toBeVisible();

// ✅ Uses first match
await expect(page.locator('text=John').first()).toBeVisible();

// ✅ More specific selector
await expect(page.getByRole('heading', { name: 'John' })).toBeVisible();
```

## Element Click Interception

### Problem
Overlays or loading states can intercept clicks.

### Solution
Wait for overlays to disappear:

```typescript
// Wait for overlay to be gone
await page.waitForSelector('.loading-overlay', { state: 'hidden' });

// Or use force click (use sparingly)
await button.click({ force: true });
```

## Test Data Isolation

### Best Practices

1. **Use unique identifiers**: Include timestamps in test data
   ```typescript
   const timestamp = Date.now();
   const email = `test_${timestamp}@example.com`;
   ```

2. **Use prefixes**: Make test data identifiable
   ```typescript
   const TEST_PREFIX = 'PW_TEST_';
   const userName = `${TEST_PREFIX}John`;
   ```

3. **Always clean up**: Use afterAll hooks
   ```typescript
   test.afterAll(async () => {
       await supabase.from('profiles')
           .delete()
           .like('first_name', 'PW_TEST_%');
   });
   ```

## Recommended Selector Priority

1. **Role-based** (most stable): `getByRole('button', { name: 'Submit' })`
2. **Test IDs**: `getByTestId('submit-button')`
3. **Labels**: `getByLabel('Email')`
4. **Placeholders**: `getByPlaceholder('Enter email')`
5. **Text** (less stable): `locator('text=Submit')`
6. **CSS** (least stable): `locator('.submit-btn')`

## Debugging Tips

```bash
# Run with trace
npx playwright test --trace=on

# View trace
npx playwright show-trace test-results/.../trace.zip

# Run with Playwright Inspector (requires display)
npx playwright test --debug

# Run headed (requires display)
npx playwright test --headed
```

## Performance Tips

1. **Minimize waits**: Use element-based waits instead of `waitForTimeout`
2. **Parallel tests**: Split independent tests into separate files
3. **Reuse authentication**: Use `storageState` for session persistence
4. **Skip unnecessary steps**: Use API calls for setup where possible

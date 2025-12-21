# Scheduled Reports - Unit Tests

This directory contains comprehensive unit tests for the scheduled reports system, with a focus on the scheduling engine and next run time calculations.

## Test Coverage

### `schedulingUtils.test.ts`

Tests the core scheduling functionality in `server/utils/schedulingUtils.ts`:

#### Core Functions Tested

- **`calculateNextRun()`**: Next run time calculations for all interval types
- **`validateSchedule()`**: Input validation and error handling
- **`getUpcomingRuns()`**: Multiple future run calculations
- **`formatRunTime()`**: Timezone-aware display formatting
- **`shouldRunNow()`**: Execution timing logic

#### Test Scenarios

- ✅ **Daily Schedules**: Basic and edge cases
- ✅ **Weekly Schedules**: Single and multiple day selections
- ✅ **Monthly Schedules**: Regular monthly intervals
- ✅ **Timezone Handling**: UTC, EST, JST, and DST transitions
- ✅ **Edge Cases**: End-of-week, end-of-month, invalid inputs
- ✅ **Real World Scenarios**: Business report schedules

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests Once (CI/CD)

```bash
npm run test:run
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Specific Test File

```bash
npx vitest schedulingUtils.test.ts
```

### Run Tests in Watch Mode

```bash
npx vitest --watch
```

## Test Structure

### Mock Setup

- **Consistent Time**: All tests use a fixed mock time (`2024-01-15T10:30:00.000Z`) for predictable results
- **Timezone Safety**: Tests validate timezone conversions and DST handling
- **Luxon Integration**: Proper mocking of DateTime.now() for test isolation

### Test Organization

- **Basic Functionality**: Core scheduling logic
- **Edge Cases**: Boundary conditions and error scenarios
- **Input Validation**: Parameter validation and error messages
- **Integration Tests**: Real-world usage scenarios
- **Timezone Tests**: Complex timezone and DST handling

## Coverage Areas

### Scheduling Logic

- [x] Daily interval calculations
- [x] Weekly interval with day selection
- [x] Monthly interval handling
- [x] Timezone conversions (UTC, EST, JST, etc.)
- [x] Daylight saving time transitions
- [x] Past/future time handling

### Validation

- [x] Schedule parameter validation
- [x] Time format validation (HH:MM)
- [x] Timezone validation (IANA identifiers)
- [x] Day-of-week validation for weekly schedules
- [x] Required field validation

### Edge Cases

- [x] End-of-week scheduling
- [x] End-of-month scheduling
- [x] Invalid day abbreviations
- [x] Missing required fields
- [x] Timezone boundary conditions

## Test Data

### Fixed Test Time

- **Date**: January 15, 2024 (Monday)
- **Time**: 10:30:00 UTC
- **Timezone**: UTC (base), with conversions to various timezones

### Sample Schedules Tested

```typescript
// Daily schedule
{
    interval: 'DAILY', send_time
:
    '14:00', timezone
:
    'America/New_York'
}

// Weekly schedule
{
    interval: 'WEEKLY', send_time
:
    '09:00', timezone
:
    'UTC', day_of_week
:
    ['Mo', 'We', 'Fr']
}

// Monthly schedule
{
    interval: 'MONTHLY', send_time
:
    '15:30', timezone
:
    'Europe/London'
}
```

## Assertions and Expectations

Tests use Vitest's expect API to validate:

- Correct timestamp calculations
- Proper timezone conversions
- Valid error handling
- Expected data formats
- Boundary condition handling

## Performance

Tests are designed to run efficiently:

- **Fast Execution**: < 1 second for full test suite
- **No External Dependencies**: Pure unit tests with mocked time
- **Deterministic Results**: Fixed mock time ensures consistent results
- **Parallel Execution**: Tests can run in parallel for faster CI/CD

## Debugging

For debugging test failures:

1. Check the mock time is consistent across tests
2. Verify timezone calculations manually
3. Use Vitest's `--reporter=verbose` for detailed output
4. Check Luxon DateTime API usage for edge cases

## Continuous Integration

Tests are configured for CI/CD pipelines:

- **Exit Codes**: Proper exit codes for pass/fail
- **No UI Dependencies**: Headless test execution
- **Fast Feedback**: Quick execution for rapid iteration
- **Coverage Ready**: Can be extended with coverage reporting

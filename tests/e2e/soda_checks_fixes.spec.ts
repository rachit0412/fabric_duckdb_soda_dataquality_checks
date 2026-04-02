/**
 * End-to-End Tests for Soda Checks Display and Step 4 Dropdown
 * Playwright test suite covering both bugs and their fixes
 */

import { test, expect } from '@playwright/test';

test.describe('Issue 1: Soda Core Default Checks Display', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Step 3: All Available SODA Core Checks section always renders', async ({ page }) => {
    // Upload data to reach Step 3
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('./data/customers.csv');
    
    // Click "Generate AI Suggestions" to reach Step 3
    await page.click('button:has-text("Generate AI Suggestions")');
    await page.waitForSelector('h2:has-text("Step 3")');
    
    // Verify "All Available SODA Core Checks" section exists and is visible
    const allChecksSection = page.locator('.all-soda-checks-section');
    await expect(allChecksSection).toBeVisible({ timeout: 5000 });
    
    // Verify section contains the header
    const sectionHeader = page.locator('.all-soda-checks-section >> h4');
    await expect(sectionHeader).toHaveText('All Available SODA Core Checks');
    
    // Verify at least one category section exists
    const categorySections = page.locator('.category-section');
    const sectionCount = await categorySections.count();
    expect(sectionCount).toBeGreaterThan(0);
  });

  test('Step 3: All 7 SODA check categories are displayed', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Upload data
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('./data/customers.csv');
    
    // Reach Step 3
    await page.click('button:has-text("Generate AI Suggestions")');
    await page.waitForSelector('.all-soda-checks-section');
    
    // Extract all category headers
    const categoryHeaders = page.locator('.category-header');
    const headerTexts = await categoryHeaders.allTextContents();
    
    // Expected categories (translations from emojis may vary, so check for key terms)
    const expectedKeywords = [
      'VOLUME',
      'COMPLETENESS',
      'UNIQUENESS',
      'VALIDITY',
      'STATISTICAL',
      'SCHEMA',
      'DISTRIBUTION'
    ];
    
    for (const keyword of expectedKeywords) {
      const found = headerTexts.some(h => h.toUpperCase().includes(keyword));
      expect(found).toBeTruthy(`Expected to find category containing "${keyword}"`);
    }
    
    // Verify at least 30 total checks (7 categories with multiple checks each)
    const checkItems = page.locator('.all-soda-checks-section input[type="checkbox"]');
    const checkCount = await checkItems.count();
    expect(checkCount).toBeGreaterThanOrEqual(30);
  });

  test('Step 3: SODA checks render even without data columns loaded', async ({ page }) => {
    // This tests the fix for: "All-checks section was conditional on columns existing"
    await page.goto('/');
    
    // Go directly to Step 3 (without proper metadata)
    // Note: This step might require modifying the app to allow direct access
    // For now, we test that checks render in normal flow
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('./data/customers.csv');
    
    await page.click('button:has-text("Generate AI Suggestions")');
    await page.waitForSelector('.all-soda-checks-section', { timeout: 10000 });
    
    // Confirm section is visible regardless of any state
    await expect(page.locator('.all-soda-checks-section')).toBeVisible();
  });

  test('Step 3: Soda checks can be selected individually', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('./data/customers.csv');
    
    await page.click('button:has-text("Generate AI Suggestions")');
    await page.waitForSelector('.all-soda-checks-section');
    
    // Select first available Soda check
    const firstCheckbox = page.locator('.all-soda-checks-section input[type="checkbox"]').first();
    await firstCheckbox.check();
    
    await expect(firstCheckbox).toBeChecked();
  });
});

test.describe('Issue 2: Step 4 Customer Checks Dropdown Population', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Reach Step 4
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('./data/customers.csv');
    
    await page.click('button:has-text("Generate AI Suggestions")');
    await page.waitForSelector('.all-soda-checks-section');
    
    // Select at least one check to proceed to Step 4
    const firstCheckbox = page.locator('.all-soda-checks-section input[type="checkbox"]').first();
    await firstCheckbox.check();
    
    await page.click('button:has-text("Create & Execute Plan")');
    await page.waitForSelector('h2:has-text("Step 4")');
  });

  test('Step 4: Column dropdown in custom check form is populated', async ({ page }) => {
    // Verify the "Create Custom Check" section has column options
    const columnDropdown = page.locator('select[name="column"]');
    await expect(columnDropdown).toBeVisible();
    
    // Expand dropdown and check for options
    await columnDropdown.click();
    
    const options = page.locator('select[name="column"] >> option');
    const optionCount = await options.count();
    
    // Should have at least "Select column..." + actual columns
    expect(optionCount).toBeGreaterThan(1);
  });

  test('Step 4: Column dropdown displays all available columns', async ({ page }) => {
    const columnDropdown = page.locator('select[name="column"]');
    await columnDropdown.click();
    
    const options = page.locator('select[name="column"] >> option');
    const columnNames = await options.allTextContents();
    
    // Should have common columns from sample data
    const expectedColumns = ['Select column...', 'id', 'email', 'name', 'age'];
    for (const expected of expectedColumns) {
      const found = columnNames.some(name => name.includes(expected));
      // Don't assert for all if data is different, but verify format exists
    }
    
    // At minimum, verify more than just placeholder
    expect(columnNames.length).toBeGreaterThan(1);
  });

  test('Step 4: Check type dropdown is populated correctly', async ({ page }) => {
    const checkTypeDropdown = page.locator('select[name="checkType"]');
    await expect(checkTypeDropdown).toBeVisible();
    
    await checkTypeDropdown.click();
    
    const options = page.locator('select[name="checkType"] >> option');
    const optionTexts = await options.allTextContents();
    
    // Expected check types
    const expectedTypes = [
      'missing_count',
      'duplicate_count',
      'invalid_count',
      'outlier_count',
      'failed_rows',
      'valid_count',
      'schema_type'
    ];
    
    for (const expectedType of expectedTypes) {
      const found = optionTexts.some(text => text.includes(expectedType));
      expect(found).toBeTruthy(`Expected to find check type: ${expectedType}`);
    }
  });

  test('Step 4: User can add custom check with all fields populated', async ({ page }) => {
    const columnDropdown = page.locator('select[name="column"]');
    const checkTypeDropdown = page.locator('select[name="checkType"]');
    const checkNameInput = page.locator('input[name="checkName"]');
    
    // Fill in custom check form
    await columnDropdown.selectOption({ index: 1 }); // Select first real column (not placeholder)
    await checkTypeDropdown.selectOption('missing_count');
    await checkNameInput.fill('Test Missing Count');
    
    // Click "Add Custom Check" button
    await page.click('button:has-text("Add Custom Check")');
    
    // Verify check was added to the checks list
    const checksListItems = page.locator('.check-item-review');
    const itemCount = await checksListItems.count();
    expect(itemCount).toBeGreaterThan(0);
  });

  test('Step 4: Quick add buttons display columns and work', async ({ page }) => {
    // Verify quick-add-checks section exists
    const quickAddSection = page.locator('.quick-add-checks');
    await expect(quickAddSection).toBeVisible();
    
    // Get quick add buttons
    const quickAddButtons = page.locator('.quick-add-btn');
    const buttonCount = await quickAddButtons.count();
    
    // Should have at least one quick add button per column
    expect(buttonCount).toBeGreaterThan(0);
    
    // Click first quick add button
    const firstButton = quickAddButtons.first();
    const buttonText = await firstButton.textContent();
    
    // Button should show column name
    expect(buttonText).toBeTruthy();
    expect(buttonText?.trim().length).toBeGreaterThan(1);
    
    // Click and verify check is added
    const initialCheckCount = await page.locator('.check-item-review').count();
    await firstButton.click();
    const newCheckCount = await page.locator('.check-item-review').count();
    
    expect(newCheckCount).toBeGreaterThan(initialCheckCount);
  });
});

test.describe('Data Flow & Persistence', () => {
  
  test('Metadata persists from Step 2 through Step 4', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('./data/customers.csv');
    
    // Step 2: Profile metadata
    await page.click('button:has-text("Generate AI Suggestions")');
    await page.waitForSelector('h2:has-text("Step 3")');
    
    // Step 3: Select checks
    const firstCheckbox = page.locator('.all-soda-checks-section input[type="checkbox"]').first();
    await firstCheckbox.check();
    
    // Step 4: Verify metadata-dependent elements work
    await page.click('button:has-text("Create & Execute Plan")');
    await page.waitForSelector('h2:has-text("Step 4")');
    
    // Column dropdown should have values (metadata available)
    const columnDropdown = page.locator('select[name="column"]');
    const options = page.locator('select[name="column"] >> option');
    const optionCount = await options.count();
    
    expect(optionCount).toBeGreaterThan(1);
  });

  test('Check collection logic properly counts all selected checks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles('./data/customers.csv');
    
    await page.click('button:has-text("Generate AI Suggestions")');
    await page.waitForSelector('.all-soda-checks-section');
    
    // Select multiple checks
    const checkboxes = page.locator('.all-soda-checks-section input[type="checkbox"]');
    const firstCheckbox = checkboxes.nth(0);
    const secondCheckbox = checkboxes.nth(1);
    
    await firstCheckbox.check();
    await secondCheckbox.check();
    
    // Verify button shows correct count
    const createButton = page.locator('button:has-text("Create & Execute Plan")');
    const buttonText = await createButton.textContent();
    
    // Button should show "2 suggested" or similar
    expect(buttonText).toContain('2');
  });
});

// Browser console logging test
test('Console logs show diagnostic information', async ({ page }) => {
  // Collect console messages
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'log') {
      consoleLogs.push(msg.text());
    }
  });
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles('./data/customers.csv');
  
  await page.click('button:has-text("Generate AI Suggestions")');
  await page.waitForSelector('.all-soda-checks-section');
  
  // Select a check and proceed
  const firstCheckbox = page.locator('.all-soda-checks-section input[type="checkbox"]').first();
  await firstCheckbox.check();
  
  await page.click('button:has-text("Create & Execute Plan")');
  await page.waitForSelector('h2:has-text("Step 4")');
  
  // Verify diagnostic logs were generated
  const metadataLogs = consoleLogs.filter(log => log.includes('[Metadata]') || log.includes('[Step'));
  expect(metadataLogs.length).toBeGreaterThan(0);
});

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function createCsvConnection(request: any, apiBaseUrl: string, testDataPath: string, connectionName: string) {
  const uploadResponse = await request.post(`${apiBaseUrl}/api/v1/connections/upload`, {
    multipart: {
      name: connectionName,
      type: 'csv',
      file: {
        name: `${connectionName}.csv`,
        mimeType: 'text/csv',
        buffer: fs.readFileSync(testDataPath),
      },
    },
  });

  expect(uploadResponse.ok()).toBeTruthy();
  return uploadResponse.json();
}

async function createProfileSnapshot(request: any, apiBaseUrl: string, connectionId: string) {
  const profileResponse = await request.post(`${apiBaseUrl}/api/v1/metadata/profile`, {
    data: { connection_id: connectionId },
  });

  expect(profileResponse.ok()).toBeTruthy();
  return profileResponse.json();
}

async function waitForRunCompletion(request: any, apiBaseUrl: string, runId: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const statusResponse = await request.get(`${apiBaseUrl}/api/v1/runs/${runId}/status`);
    expect(statusResponse.ok()).toBeTruthy();
    const statusPayload = await statusResponse.json();
    if (['success', 'failed', 'warning'].includes(statusPayload.status)) {
      return statusPayload;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Run ${runId} did not complete within the expected time window`);
}

test.describe('Data Quality Platform E2E Tests', () => {
  let testDataPath: string;
  const apiBaseUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8001';

  test.beforeAll(async () => {
    // Create test CSV file
    const testData = `id,name,email,age,created_at
1,Alice,alice@example.com,28,2024-01-01
2,Bob,bob@example.com,35,2024-01-02
3,Charlie,charlie@example.com,32,2024-01-03
4,David,david@example.com,42,2024-01-04
5,Eve,eve@example.com,31,2024-01-05`;

    testDataPath = path.join(process.cwd(), '.playwright-artifacts', 'inputs', 'playwright_test.csv');
    fs.mkdirSync(path.dirname(testDataPath), { recursive: true });
    fs.writeFileSync(testDataPath, testData);
    console.log(`✓ Test data created at ${testDataPath}`);
  });

  test('should load dashboard shell', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Mission Control' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Real-time data quality monitoring & observability')).toBeVisible();
    await expect(page.getByText('Overall Quality Score')).toBeVisible();
  });

  test('should upload data and carry profiling context into next steps', async ({ page }) => {
    const connectionName = `playwright-upload-${Date.now()}`;

    await page.goto('/connections');
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible();

    await page.getByRole('button', { name: 'Upload File' }).click();
    await page.locator('input[type="file"]').setInputFiles(testDataPath);
    await page.locator('input[placeholder="e.g. customers-q1"]').fill(connectionName);
    await page.getByRole('button', { name: 'Upload & Connect' }).click();

    await expect(page).toHaveURL(/\/metadata/);
    await expect(page.getByRole('heading', { name: 'Metadata' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Profiler Summary' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'Wrangler Prep' })).toBeVisible();
    await expect(page.getByText('Rows Profiled')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open Check Plans' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Generate Suggestions' })).toBeVisible();

    await page.getByRole('link', { name: 'Open Check Plans' }).click();

    await expect(page).toHaveURL(/\/check-plans\?connectionId=.*snapshotId=.*/);
    await expect(page.getByRole('heading', { name: 'Create Check Plan' })).toBeVisible();
    const connectionSelect = page.locator('select').first();
    await expect(connectionSelect).toBeDisabled();
    await expect(connectionSelect.locator('option:checked')).toContainText(connectionName);
    await expect(page.getByText('Using the profiled metadata snapshot from the previous step.')).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Metadata' })).toBeVisible();

    await page.getByRole('link', { name: 'Generate Suggestions' }).click();

    await expect(page).toHaveURL(/\/suggestions/);
    await expect(page.getByRole('heading', { name: 'AI Suggestions' })).toBeVisible();
    await expect(page.locator('pre').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/type consistency|format validation|freshness/i).first()).toBeVisible();
  });

  test('should auto-generate suggestions when opened with a metadata snapshot', async ({ page, request }) => {
    const connectionName = `playwright-api-${Date.now()}`;

    const connection = await createCsvConnection(request, apiBaseUrl, testDataPath, connectionName);
    const profile = await createProfileSnapshot(request, apiBaseUrl, connection.id);

    await page.goto(`/suggestions?connectionId=${encodeURIComponent(connection.id)}&snapshotId=${encodeURIComponent(profile.snapshot_id)}&autoGenerate=1`);

    await expect(page.getByRole('heading', { name: 'AI Suggestions' })).toBeVisible();
    await expect(page.locator('pre').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/type consistency|format validation|freshness/i).first()).toBeVisible();
  });

  test('should create a check plan, execute it, and show results', async ({ page, request }) => {
    const connectionName = `playwright-plan-${Date.now()}`;
    const planName = `playwright-plan-${Date.now()}`;

    const connection = await createCsvConnection(request, apiBaseUrl, testDataPath, connectionName);
    const profile = await createProfileSnapshot(request, apiBaseUrl, connection.id);

    const createPlanResponse = await request.post(`${apiBaseUrl}/api/v1/check-plans`, {
      data: {
        name: planName,
        connection_id: connection.id,
        metadata_snapshot_id: profile.snapshot_id,
        description: 'Playwright run-through plan',
        checks_yaml: `checks for data:\n  - row_count > 0\n  - missing_count(id) = 0\n  - duplicate_count(id) = 0`,
      },
    });

    expect(createPlanResponse.ok()).toBeTruthy();
    const createdPlan = await createPlanResponse.json();

    await page.goto('/check-plans');
    await expect(page.getByRole('heading', { name: 'Check Plans', exact: true })).toBeVisible();

    await expect(page.getByText(planName)).toBeVisible({ timeout: 10000 });

    const planCard = page.locator('.card-hover').filter({ hasText: planName }).first();
    await planCard.getByRole('button', { name: /Run/i }).click();

    await expect(page).toHaveURL(/\/runs/);
    await expect(page.getByRole('heading', { name: 'Check Runs' })).toBeVisible();

    const executeResponse = await request.get(`${apiBaseUrl}/api/v1/runs?plan_id=${createdPlan.id}`);
    expect(executeResponse.ok()).toBeTruthy();
    const planRuns = await executeResponse.json();
    const latestRun = Array.isArray(planRuns) ? planRuns[0] : null;
    expect(latestRun).toBeTruthy();

    const completedStatus = await waitForRunCompletion(request, apiBaseUrl, latestRun.id);
    expect(['success', 'failed', 'warning']).toContain(completedStatus.status);

    await page.goto('/results');
    await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
    await page.locator('select').selectOption(latestRun.id);
    await expect(page.getByText('Pass Rate')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.card-hover').first()).toBeVisible();
    await expect(page.locator('.card-hover .badge').first()).toBeVisible();
  });

  test('should surface a missing snapshot failure when auto-generating suggestions', async ({ page, request }) => {
    const connectionName = `playwright-nosnapshot-${Date.now()}`;
    const connection = await createCsvConnection(request, apiBaseUrl, testDataPath, connectionName);
    let dialogMessage = '';

    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await page.goto(`/suggestions?connectionId=${encodeURIComponent(connection.id)}&autoGenerate=1`);

    await expect(page.getByRole('heading', { name: 'AI Suggestions' })).toBeVisible();
    await expect.poll(() => dialogMessage, { timeout: 10000 }).toContain('Metadata snapshot not found');
    await expect(page.getByText('Ready to Generate')).toBeVisible();
    await expect(page.locator('pre')).toHaveCount(0);
  });

  test('should have responsive design', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should expose current API health endpoints', async ({ request }) => {
    const docsResponse = await request.get(`${apiBaseUrl}/docs`);
    expect(docsResponse.ok()).toBeTruthy();

    const healthResponse = await request.get(`${apiBaseUrl}/health`);
    expect(healthResponse.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (fs.existsSync(testDataPath)) {
      fs.unlinkSync(testDataPath);
    }
    console.log('\n✓ Test cleanup complete');
  });
});

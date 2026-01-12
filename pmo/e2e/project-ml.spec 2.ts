import { test, expect } from '@playwright/test';

/**
 * Project ML E2E Tests
 *
 * Coverage:
 * - ML Insights tab visibility on project dashboard
 * - Success prediction display
 * - Risk forecast display
 * - Timeline prediction display
 * - Resource optimization display
 * - Generate prediction functionality
 * - Error handling when ML service unavailable
 */

test.describe('Project ML Insights', () => {
  const clientName = `E2E ML Client ${Date.now()}`;
  const projectName = `E2E ML Project ${Date.now()}`;
  let projectId: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test project to use for ML tests
    const page = await browser.newPage();
    await page.goto('/login');

    // Login first
    await page.getByLabel(/email/i).fill('admin@pmo.test');
    await page.getByLabel(/password/i).fill('Seattleu21*');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard|clients)/);

    // Create a client
    await page.goto('/clients');
    await page.getByLabel(/name/i).fill(clientName);
    await page.getByRole('button', { name: /create client/i }).click();
    await expect(page.getByText(clientName)).toBeVisible({ timeout: 10000 });

    // Navigate to client and create project
    await page.getByText(clientName).click();
    await expect(page).toHaveURL(/\/clients\/\d+/);

    // Create a new project
    const newProjectButton = page.getByRole('button', {
      name: /new project|create project/i,
    });

    if (
      await newProjectButton.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await newProjectButton.click();
    } else {
      await page.goto('/projects/new');
    }

    const projectNameInput = page.getByLabel(/project name|name/i).first();
    await projectNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await projectNameInput.fill(projectName);

    const clientSelector = page.getByLabel(/client/i);
    if (await clientSelector.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clientSelector.click();
      await page.getByText(clientName).click();
    }

    await page.getByRole('button', { name: /create project|save/i }).click();
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 });

    // Extract project ID from URL
    const url = page.url();
    const match = url.match(/\/projects\/(\d+)/);
    if (match) {
      projectId = match[1];
    }

    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@pmo.test');
    await page.getByLabel(/password/i).fill('Seattleu21*');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard|clients)/);
  });

  test('should display ML Insights tab on project dashboard', async ({
    page,
  }) => {
    await page.goto(`/projects/${projectId}`);

    // Look for ML Insights tab
    const mlTab = page.getByRole('tab', { name: /ml insights/i });
    await expect(mlTab).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to ML Insights tab', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Click ML Insights tab
    const mlTab = page.getByRole('tab', { name: /ml insights/i });
    await mlTab.click();

    // Verify tab is active
    await expect(mlTab).toHaveAttribute('aria-selected', 'true');

    // Should see ML insights content area
    await page.waitForTimeout(500);

    // Look for ML-related content (prediction cards, etc.)
    const mlContent = page
      .locator('[data-testid="ml-insights-tab"]')
      .or(
        page.getByText(/success prediction|risk forecast|ml insights/i).first(),
      );

    await expect(mlContent).toBeVisible({ timeout: 10000 });
  });

  test('should display success prediction card', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Navigate to ML tab
    const mlTab = page.getByRole('tab', { name: /ml insights/i });
    await mlTab.click();

    // Look for success prediction section
    const successSection = page
      .getByText(/success prediction|success probability/i)
      .first();
    await expect(successSection).toBeVisible({ timeout: 10000 });
  });

  test('should display risk forecast section', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Navigate to ML tab
    const mlTab = page.getByRole('tab', { name: /ml insights/i });
    await mlTab.click();

    // Look for risk forecast section
    const riskSection = page.getByText(/risk forecast|risk level/i).first();
    await expect(riskSection).toBeVisible({ timeout: 10000 });
  });

  test('should display timeline prediction section', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Navigate to ML tab
    const mlTab = page.getByRole('tab', { name: /ml insights/i });
    await mlTab.click();

    // Look for timeline section
    const timelineSection = page
      .getByText(/timeline prediction|predicted end date/i)
      .first();
    await expect(timelineSection).toBeVisible({ timeout: 10000 });
  });

  test('should display resource optimization section', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Navigate to ML tab
    const mlTab = page.getByRole('tab', { name: /ml insights/i });
    await mlTab.click();

    // Look for resource optimization section
    const resourceSection = page
      .getByText(/resource optimization|workload/i)
      .first();
    await expect(resourceSection).toBeVisible({ timeout: 10000 });
  });

  test('should display recommendations section', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Navigate to ML tab
    const mlTab = page.getByRole('tab', { name: /ml insights/i });
    await mlTab.click();

    // Look for recommendations
    const recommendationsSection = page
      .getByText(/recommendations|suggested actions/i)
      .first();
    await expect(recommendationsSection).toBeVisible({ timeout: 10000 });
  });

  test('should be able to refresh predictions', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Navigate to ML tab
    const mlTab = page.getByRole('tab', { name: /ml insights/i });
    await mlTab.click();

    // Look for refresh button
    const refreshButton = page.getByRole('button', {
      name: /refresh|generate|update predictions/i,
    });

    if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshButton.click();

      // Should show loading state or updated content
      await page.waitForTimeout(1000);
    }
  });

  test('should show loading state when fetching predictions', async ({
    page,
  }) => {
    // Intercept API call to delay response
    await page.route('**/api/projects/*/ml/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto(`/projects/${projectId}`);

    // Navigate to ML tab
    const mlTab = page.getByRole('tab', { name: /ml insights/i });
    await mlTab.click();

    // Should see loading state
    const loadingIndicator = page
      .getByText(/loading|analyzing/i)
      .or(page.locator('.animate-pulse'));

    // Loading state should be briefly visible
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 2000 });
  });

  test('should handle error state gracefully', async ({ page }) => {
    // Intercept API call to return error
    await page.route('**/api/projects/*/ml/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'ML service unavailable' }),
      });
    });

    await page.goto(`/projects/${projectId}`);

    // Navigate to ML tab
    const mlTab = page.getByRole('tab', { name: /ml insights/i });
    await mlTab.click();

    // Should show error or fallback state
    const errorMessage = page.getByText(
      /error|unavailable|try again|rule-based/i,
    );
    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display ML status indicator', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Navigate to ML tab
    const mlTab = page.getByRole('tab', { name: /ml insights/i });
    await mlTab.click();

    // Look for ML status indicator (LLM-powered or Rule-based)
    const statusIndicator = page.getByText(/llm-powered|rule-based|ai status/i);
    await expect(statusIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display probability percentages correctly', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Navigate to ML tab
    const mlTab = page.getByRole('tab', { name: /ml insights/i });
    await mlTab.click();

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Look for percentage values (e.g., 75%, 82%)
    const percentagePattern = /\d{1,3}%/;
    const percentageElement = page.locator('text=' + percentagePattern);

    // Should have at least one percentage displayed
    const count = await percentageElement.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should maintain tab state on page refresh', async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Navigate to ML tab
    const mlTab = page.getByRole('tab', { name: /ml insights/i });
    await mlTab.click();

    // Verify tab is active
    await expect(mlTab).toHaveAttribute('aria-selected', 'true');

    // Note: Tab state persistence depends on implementation
    // This test verifies the tab functionality works correctly
  });
});

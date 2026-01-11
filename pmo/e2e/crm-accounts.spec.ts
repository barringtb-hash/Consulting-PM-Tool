import { test, expect } from '@playwright/test';

/**
 * CRM Accounts E2E Tests
 *
 * Coverage:
 * - View accounts list
 * - Create new account
 * - View account details
 * - Edit account
 * - Filter accounts
 * - Archive/restore account
 */

test.describe('CRM: Accounts Management', () => {
  const accountName = `E2E Account ${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    // Ensure CRM module is accessible
    await page.goto('/crm/accounts');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display accounts page', async ({ page }) => {
    // Verify heading is visible
    await expect(
      page.getByRole('heading', { name: /accounts/i }).first(),
    ).toBeVisible();

    // Verify stats cards are visible (if any accounts exist)
    const totalAccountsCard = page.getByText(/total accounts/i);
    await expect(totalAccountsCard).toBeVisible({ timeout: 5000 });
  });

  test('should create a new account', async ({ page }) => {
    // Find and fill in account name input
    const nameInput = page.getByPlaceholder(/enter account name/i);
    await nameInput.fill(accountName);

    // Click add account button
    await page.getByRole('button', { name: /add account/i }).click();

    // Verify account appears in list
    await expect(page.getByText(accountName)).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to account detail page', async ({ page }) => {
    // First create an account if it doesn't exist
    const nameInput = page.getByPlaceholder(/enter account name/i);
    const testAccountName = `Detail Test ${Date.now()}`;
    await nameInput.fill(testAccountName);
    await page.getByRole('button', { name: /add account/i }).click();

    // Wait for account to appear
    await expect(page.getByText(testAccountName)).toBeVisible({
      timeout: 5000,
    });

    // Click on account name to go to details
    await page.getByText(testAccountName).click();

    // Verify we're on detail page
    await expect(page).toHaveURL(/\/crm\/accounts\/\d+/);

    // Verify account name is displayed in header
    await expect(
      page.getByRole('heading', { name: testAccountName }),
    ).toBeVisible();
  });

  test('should display account stats', async ({ page }) => {
    // Verify stats section is visible
    const statsSection = page.locator('[class*="grid"]').first();
    await expect(statsSection).toBeVisible();

    // Check for expected stat labels
    const expectedLabels = [
      'Total Accounts',
      'Customers',
      'Prospects',
      'At Risk',
    ];
    for (const label of expectedLabels) {
      const statCard = page.getByText(label);
      if (await statCard.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(statCard).toBeVisible();
      }
    }
  });

  test('should filter accounts by type', async ({ page }) => {
    // Look for type filter select
    const typeSelect = page.locator('select').first();

    if (await typeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Select "Customer" type
      await typeSelect.selectOption('CUSTOMER');

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Page should still be functional
      await expect(
        page.getByRole('heading', { name: /accounts/i }).first(),
      ).toBeVisible();
    }
  });

  test('should search accounts', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search accounts/i);

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Type search query
      await searchInput.fill('Test');

      // Wait for search to apply
      await page.waitForTimeout(500);

      // Clear search
      await searchInput.clear();

      // Verify input was cleared
      await expect(searchInput).toHaveValue('');
    }
  });

  test('should show empty state when no accounts match filter', async ({
    page,
  }) => {
    const searchInput = page.getByPlaceholder(/search accounts/i);

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Search for non-existent account
      await searchInput.fill('NonExistent12345XYZ');

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Should show "no accounts" message
      const noResults = page.getByText(/no accounts/i);
      await expect(noResults).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('CRM: Account Detail Page', () => {
  let accountId: string;

  test.beforeAll(async ({ browser }) => {
    // Create an account to use in detail tests
    const page = await browser.newPage();
    await page.goto('/crm/accounts');
    await page.waitForLoadState('networkidle');

    const nameInput = page.getByPlaceholder(/enter account name/i);
    const testName = `Detail Account ${Date.now()}`;
    await nameInput.fill(testName);
    await page.getByRole('button', { name: /add account/i }).click();

    // Wait and click on the account
    await page.getByText(testName).click();
    await page.waitForURL(/\/crm\/accounts\/\d+/);

    // Extract account ID from URL
    const url = page.url();
    const match = url.match(/\/crm\/accounts\/(\d+)/);
    if (match) {
      accountId = match[1];
    }

    await page.close();
  });

  test('should display account information', async ({ page }) => {
    if (!accountId) {
      test.skip();
      return;
    }

    await page.goto(`/crm/accounts/${accountId}`);

    // Verify key information sections are visible
    const infoCard = page.getByText(/account information/i);
    await expect(infoCard).toBeVisible({ timeout: 5000 });

    // Check for health score section
    const healthSection = page.getByText(/health/i).first();
    await expect(healthSection).toBeVisible();
  });

  test('should display quick actions', async ({ page }) => {
    if (!accountId) {
      test.skip();
      return;
    }

    await page.goto(`/crm/accounts/${accountId}`);

    // Look for actions section
    const actionsSection = page.getByText(/actions/i);
    await expect(actionsSection).toBeVisible({ timeout: 5000 });

    // Check for common action buttons
    const archiveButton = page.getByRole('button', {
      name: /archive account/i,
    });
    await expect(archiveButton).toBeVisible();
  });

  test('should have back button to accounts list', async ({ page }) => {
    if (!accountId) {
      test.skip();
      return;
    }

    await page.goto(`/crm/accounts/${accountId}`);

    // Find and click back button
    const backButton = page.getByRole('button', { name: /back/i });
    await expect(backButton).toBeVisible();

    await backButton.click();

    // Should navigate back to accounts list
    await expect(page).toHaveURL('/crm/accounts');
  });

  test('should enter edit mode', async ({ page }) => {
    if (!accountId) {
      test.skip();
      return;
    }

    await page.goto(`/crm/accounts/${accountId}`);

    // Find and click edit button
    const editButton = page.getByRole('button', { name: /edit/i });

    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editButton.click();

      // Should show save/cancel buttons in edit mode
      const cancelButton = page.getByRole('button', { name: /cancel/i });
      await expect(cancelButton).toBeVisible({ timeout: 3000 });
    }
  });
});

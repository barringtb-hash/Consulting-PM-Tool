/**
 * Test Inbound Leads page with Dashboard and Analytics tabs
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('Inbound Leads Page with ML Tabs', () => {
  test('should display Leads tab with list', async ({ page }) => {
    await page.goto('/crm/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify tabs are visible
    await expect(page.getByRole('button', { name: /leads/i })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /dashboard/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /analytics/i }),
    ).toBeVisible();

    await page.screenshot({
      path: 'test-results/leads-tab.png',
      fullPage: true,
    });
    console.log('✓ Screenshot saved: leads-tab.png');
  });

  test('should display Dashboard tab with ML insights', async ({ page }) => {
    await page.goto('/crm/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click Dashboard tab
    await page.getByRole('button', { name: /dashboard/i }).click();
    await page.waitForTimeout(1500);

    // Should show pipeline stats card (use exact match to avoid page description)
    await expect(
      page.getByText('Pipeline Health', { exact: true }),
    ).toBeVisible();

    await page.screenshot({
      path: 'test-results/leads-dashboard-tab.png',
      fullPage: true,
    });
    console.log('✓ Screenshot saved: leads-dashboard-tab.png');
  });

  test('should display Analytics tab with metrics', async ({ page }) => {
    await page.goto('/crm/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click Analytics tab
    await page.getByRole('button', { name: /analytics/i }).click();
    await page.waitForTimeout(1500);

    // Should show analytics content
    await expect(page.getByText(/Lead Source Distribution/i)).toBeVisible();

    await page.screenshot({
      path: 'test-results/leads-analytics-tab.png',
      fullPage: true,
    });
    console.log('✓ Screenshot saved: leads-analytics-tab.png');
  });
});

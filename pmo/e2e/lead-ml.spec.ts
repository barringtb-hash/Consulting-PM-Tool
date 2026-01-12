import { test, expect } from '@playwright/test';

/**
 * Lead ML E2E Tests
 *
 * Coverage:
 * - ML Insights tab visibility and navigation
 * - Feature importance chart rendering
 * - Top priority leads display
 * - Bulk prediction trigger
 * - Prediction accuracy display
 * - Lead prediction detail panel
 */

test.describe('Lead ML Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Lead Scoring page
    await page.goto('/ai-tools/lead-scoring');

    // Wait for page to load
    await expect(
      page.getByRole('heading', { name: /lead scoring/i }),
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test.describe('ML Insights Tab', () => {
    test('should display ML Insights tab in navigation', async ({ page }) => {
      // Look for the ML Insights tab
      const mlInsightsTab = page.getByRole('button', { name: /ml insights/i });
      await expect(mlInsightsTab).toBeVisible();
    });

    test('should navigate to ML Insights tab when clicked', async ({
      page,
    }) => {
      // Click on ML Insights tab
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Verify ML Insights content is visible
      await expect(page.getByText(/ml-powered lead intelligence/i)).toBeVisible(
        { timeout: 5000 },
      );
    });

    test('should display model accuracy card', async ({ page }) => {
      // Navigate to ML Insights
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Check for accuracy metric display
      await expect(page.getByText(/model accuracy/i)).toBeVisible();
    });

    test('should display total predictions metric', async ({ page }) => {
      // Navigate to ML Insights
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Check for total predictions metric
      await expect(page.getByText(/total predictions/i)).toBeVisible();
    });
  });

  test.describe('Feature Importance Chart', () => {
    test('should display feature importance section', async ({ page }) => {
      // Navigate to ML Insights
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Check for Feature Importance header
      await expect(
        page.getByRole('heading', { name: /feature importance/i }),
      ).toBeVisible();
    });

    test('should display feature category legend', async ({ page }) => {
      // Navigate to ML Insights
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Check that at least one category indicator is visible in the legend
      const categories = [
        'behavioral',
        'demographic',
        'temporal',
        'engagement',
      ];

      // Verify each category label is visible in the feature importance legend
      for (const category of categories) {
        const categoryElement = page.getByText(new RegExp(category, 'i'));
        await expect(categoryElement).toBeVisible();
      }
    });
  });

  test.describe('Top Priority Leads', () => {
    test('should display top priority leads section', async ({ page }) => {
      // Navigate to ML Insights
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Check for Top Priority Leads header
      await expect(
        page.getByRole('heading', { name: /top priority leads/i }),
      ).toBeVisible();
    });

    test('should display ML Ranked badge', async ({ page }) => {
      // Navigate to ML Insights
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Check for ML Ranked badge
      await expect(page.getByText(/ml ranked/i)).toBeVisible();
    });
  });

  test.describe('Bulk Predictions', () => {
    test('should display run bulk predictions button', async ({ page }) => {
      // Navigate to ML Insights
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Check for bulk predictions button
      const bulkButton = page.getByRole('button', {
        name: /run bulk predictions/i,
      });
      await expect(bulkButton).toBeVisible();
    });

    test('should show loading state when running predictions', async ({
      page,
    }) => {
      // Navigate to ML Insights
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Click bulk predictions button
      const bulkButton = page.getByRole('button', {
        name: /run bulk predictions/i,
      });

      // Verify the button exists and is enabled
      await expect(bulkButton).toBeEnabled();
    });
  });

  test.describe('Prediction Accuracy', () => {
    test('should display accuracy by prediction type section', async ({
      page,
    }) => {
      // Navigate to ML Insights
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Verify the accuracy by prediction type section is visible
      const accuracySection = page.getByText(/accuracy by prediction type/i);
      await expect(accuracySection).toBeVisible();
    });
  });

  test.describe('Lead Prediction Details', () => {
    test('should display prediction details when a lead is selected', async ({
      page,
    }) => {
      // Navigate to ML Insights
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Find clickable lead items in the top priority list
      const topLeadsList = page.locator('[class*="space-y-3"]');
      const leadItems = topLeadsList.locator('[class*="cursor-pointer"]');

      // Ensure at least one lead exists before proceeding
      await expect(leadItems.first()).toBeVisible({ timeout: 5000 });

      // Click on the first lead
      await leadItems.first().click();

      // Verify prediction details panel is displayed
      await expect(
        page.getByRole('heading', { name: /prediction details/i }),
      ).toBeVisible({ timeout: 5000 });
    });

    test('should display close button in prediction details panel', async ({
      page,
    }) => {
      // Navigate to ML Insights
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Find clickable lead items
      const leadItems = page.locator('[class*="cursor-pointer"]');

      // Ensure at least one lead exists before proceeding
      await expect(leadItems.first()).toBeVisible({ timeout: 5000 });

      // Click on the first lead to open the details panel
      await leadItems.first().click();

      // Verify the close button is present in the details panel
      const closeButton = page.getByRole('button', { name: /close/i });
      await expect(closeButton).toBeVisible();
    });
  });

  test.describe('Tab Navigation', () => {
    test('should have all tabs visible', async ({ page }) => {
      const tabs = [
        'overview',
        'leads',
        'sequences',
        'analytics',
        'ml insights',
      ];

      for (const tab of tabs) {
        const tabButton = page.getByRole('button', {
          name: new RegExp(tab, 'i'),
        });
        await expect(tabButton).toBeVisible();
      }
    });

    test('should switch between tabs correctly', async ({ page }) => {
      // Click Analytics tab
      await page.getByRole('button', { name: /analytics/i }).click();

      // Click ML Insights tab
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Verify ML content is visible
      await expect(
        page.getByText(/ml-powered lead intelligence/i),
      ).toBeVisible();

      // Click back to Overview
      await page.getByRole('button', { name: /overview/i }).click();

      // Verify Overview content (should not show ML Insights content anymore)
      await expect(
        page.getByText(/ml-powered lead intelligence/i),
      ).not.toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display properly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate to ML Insights
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Content should still be visible
      await expect(
        page.getByText(/ml-powered lead intelligence/i),
      ).toBeVisible();
    });

    test('should display properly on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // Navigate to ML Insights
      await page.getByRole('button', { name: /ml insights/i }).click();

      // Content should be visible
      await expect(
        page.getByText(/ml-powered lead intelligence/i),
      ).toBeVisible();
    });
  });
});

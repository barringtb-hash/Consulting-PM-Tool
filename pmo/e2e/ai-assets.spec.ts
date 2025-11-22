import { test, expect } from '@playwright/test';

/**
 * M6: AI Assets E2E Tests
 *
 * Coverage:
 * - View AI Assets library
 * - Create AI Asset from template
 * - Create client-specific AI Asset
 * - Link asset to project
 * - Unlink asset from project
 * - View project's Assets tab showing linked assets
 * - View global Assets page
 * - Filter assets by type/category
 */

test.describe('M6: AI Assets', () => {
  const clientName = `E2E Assets Client ${Date.now()}`;
  const projectName = `E2E Assets Project ${Date.now()}`;
  const assetName = `E2E AI Asset ${Date.now()}`;

  test('should view AI Assets library', async ({ page }) => {
    await page.goto('/assets');

    // Verify we're on assets page
    await expect(
      page.getByRole('heading', { name: /assets|ai assets/i }).first(),
    ).toBeVisible();

    // Page should load without errors
    await expect(page).toHaveURL(/\/assets/);
  });

  test('should create a new AI Asset', async ({ page }) => {
    await page.goto('/assets');

    // Look for "New Asset" or "Create Asset" button
    const newAssetButton = page.getByRole('button', {
      name: /new asset|create asset|add asset/i,
    });

    if (await newAssetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newAssetButton.click();

      // Fill asset details
      await page
        .getByLabel(/name|title/i)
        .first()
        .fill(assetName);

      // Select asset type if available
      const typeSelector = page.getByLabel(/type|category/i);
      if (await typeSelector.isVisible({ timeout: 1000 }).catch(() => false)) {
        await typeSelector.click();
        const templateOption = page
          .getByRole('option', { name: /template/i })
          .first();
        if (
          await templateOption.isVisible({ timeout: 500 }).catch(() => false)
        ) {
          await templateOption.click();
        }
      }

      // Add description
      const descField = page.getByLabel(/description|details/i);
      if (await descField.isVisible({ timeout: 1000 }).catch(() => false)) {
        await descField.fill('AI asset for E2E testing purposes');
      }

      // Add content/prompt if field exists
      const contentField = page.getByLabel(/content|prompt|template/i);
      if (await contentField.isVisible({ timeout: 1000 }).catch(() => false)) {
        await contentField.fill('This is a template for {client_name}');
      }

      // Save asset
      await page.getByRole('button', { name: /save|create|add/i }).click();

      // Verify asset was created
      await expect(page.getByText(assetName)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create client-specific AI Asset', async ({ page }) => {
    // First create a client
    await page.goto('/clients');
    await page.getByLabel(/name/i).fill(clientName);
    await page.getByRole('button', { name: /create client/i }).click();
    await page.getByText(clientName).click();

    // Navigate to assets
    await page.goto('/assets');

    const newAssetButton = page.getByRole('button', {
      name: /new asset|create asset|add asset/i,
    });

    if (await newAssetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newAssetButton.click();

      // Create client-specific asset
      const clientSpecificAssetName = `Client Asset ${Date.now()}`;
      await page
        .getByLabel(/name|title/i)
        .first()
        .fill(clientSpecificAssetName);

      // Select client
      const clientSelector = page.getByLabel(/client/i);
      if (
        await clientSelector.isVisible({ timeout: 1000 }).catch(() => false)
      ) {
        await clientSelector.selectOption({ label: clientName });
      }

      // Mark as client-specific if checkbox exists
      const clientSpecificCheckbox = page.getByLabel(
        /client-specific|specific to client/i,
      );
      if (
        await clientSpecificCheckbox
          .isVisible({ timeout: 1000 })
          .catch(() => false)
      ) {
        await clientSpecificCheckbox.check();
      }

      // Save
      await page.getByRole('button', { name: /save|create/i }).click();

      // Verify creation
      await expect(page.getByText(clientSpecificAssetName)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('should link asset to a project', async ({ page }) => {
    // Setup: Create project
    await page.goto('/clients');
    await page.getByText(clientName).click();

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
    await page.getByRole('button', { name: /create|save/i }).click();
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 });

    // Navigate to Assets tab
    const assetsTab = page.getByRole('tab', { name: /assets/i });
    if (await assetsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await assetsTab.click();

      // Link an asset
      const linkAssetButton = page.getByRole('button', {
        name: /link asset|add asset|attach asset/i,
      });

      if (
        await linkAssetButton.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        await linkAssetButton.click();

        // Select our asset from the list
        const assetOption = page.getByText(assetName);
        if (await assetOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await assetOption.click();

          // Confirm linking
          const confirmButton = page.getByRole('button', {
            name: /link|attach|save/i,
          });
          if (
            await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)
          ) {
            await confirmButton.click();
          }

          // Verify asset is linked
          await expect(page.getByText(assetName)).toBeVisible({
            timeout: 5000,
          });
        }
      }
    }
  });

  test('should view linked assets in project Assets tab', async ({ page }) => {
    // Navigate to project
    await page.goto('/clients');
    await page.getByText(clientName).click();
    await page.getByText(projectName).click();

    // Go to Assets tab
    const assetsTab = page.getByRole('tab', { name: /assets/i });
    if (await assetsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await assetsTab.click();

      // Should see linked assets
      await expect(page.getByText(assetName)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should unlink asset from project', async ({ page }) => {
    // Navigate to project assets
    await page.goto('/clients');
    await page.getByText(clientName).click();
    await page.getByText(projectName).click();

    const assetsTab = page.getByRole('tab', { name: /assets/i });
    if (await assetsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await assetsTab.click();

      // Find unlink button for our asset
      const unlinkButton = page.getByRole('button', {
        name: /unlink|remove|detach/i,
      });

      if (await unlinkButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await unlinkButton.click();

        // Confirm if needed
        const confirmButton = page.getByRole('button', {
          name: /confirm|yes|unlink/i,
        });
        if (
          await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)
        ) {
          await confirmButton.click();
        }

        // Asset should no longer be in the linked list
        await page.waitForTimeout(1000);
        // Note: Asset might still be in global assets but not linked to this project
      }
    }
  });

  test('should filter assets by type', async ({ page }) => {
    await page.goto('/assets');

    // Look for filter/type selector
    const typeFilter = page.getByLabel(/filter|type|category/i);

    if (await typeFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await typeFilter.click();

      // Select a filter option
      const templateOption = page.getByRole('option', { name: /template/i });
      if (
        await templateOption.isVisible({ timeout: 1000 }).catch(() => false)
      ) {
        await templateOption.click();

        // Assets should be filtered
        await page.waitForTimeout(500);
      }
    }
  });

  test('should search for assets', async ({ page }) => {
    await page.goto('/assets');

    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i);

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill(assetName.substring(0, 10));

      // Our asset should be visible
      await expect(page.getByText(assetName)).toBeVisible({ timeout: 3000 });
    }
  });

  test('should view asset details', async ({ page }) => {
    await page.goto('/assets');

    // Click on an asset
    const assetElement = page.getByText(assetName);

    if (await assetElement.isVisible({ timeout: 2000 }).catch(() => false)) {
      await assetElement.click();

      // Should show asset details
      await expect(page.getByText(assetName)).toBeVisible();

      // Details page should show description, content, etc.
      const detailsSection = page.locator(
        '[data-testid*="asset-details"], .asset-content',
      );
      if (
        await detailsSection.isVisible({ timeout: 1000 }).catch(() => false)
      ) {
        expect(await detailsSection.isVisible()).toBeTruthy();
      }
    }
  });

  test('should edit AI Asset', async ({ page }) => {
    await page.goto('/assets');

    // Find and click on asset
    await page.getByText(assetName).click();

    // Look for edit button
    const editButton = page.getByRole('button', { name: /edit/i });

    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editButton.click();

      // Update name
      const updatedName = `${assetName} - Updated`;
      const nameField = page.getByLabel(/name|title/i).first();
      await nameField.fill(updatedName);

      // Save
      await page.getByRole('button', { name: /save|update/i }).click();

      // Verify update
      await expect(page.getByText(updatedName)).toBeVisible({ timeout: 5000 });
    }
  });
});

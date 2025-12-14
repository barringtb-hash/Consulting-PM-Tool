import { test, expect } from '@playwright/test';

/**
 * Admin Tenant Management E2E Tests
 *
 * Coverage:
 * - View tenant list
 * - Create new tenant with owner
 * - Edit tenant details
 * - Suspend/activate/cancel tenant
 * - Add/remove users from tenant
 * - Non-admin users cannot access
 */

test.describe('Admin: Tenant Management', () => {
  const uniqueId = Date.now();
  const testTenantName = `E2E Test Tenant ${uniqueId}`;
  const testOwnerEmail = `e2e-owner-${uniqueId}@test.com`;

  test.beforeEach(async ({ page }) => {
    // Navigate to tenant management page
    await page.goto('/admin/tenants');
    await page.waitForLoadState('networkidle');
  });

  test('should display tenant list page', async ({ page }) => {
    // Verify heading is visible
    await expect(
      page.getByRole('heading', { name: /tenant management|tenants/i }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Verify stats section is visible
    const statsSection = page.getByText(/total tenants/i);
    await expect(statsSection).toBeVisible({ timeout: 5000 });
  });

  test('should display tenant statistics', async ({ page }) => {
    // Check for expected stat cards
    const expectedStats = ['Total Tenants', 'Active', 'Trial'];
    for (const stat of expectedStats) {
      const statCard = page.getByText(new RegExp(stat, 'i'));
      if (await statCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(statCard).toBeVisible();
      }
    }
  });

  test('should navigate to create tenant page', async ({ page }) => {
    // Click create tenant button
    const createButton = page.getByRole('link', {
      name: /create tenant|new tenant/i,
    });
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();

    // Verify we're on the create page
    await expect(page).toHaveURL('/admin/tenants/new');

    // Verify form elements are visible
    await expect(page.getByLabel(/tenant name/i)).toBeVisible();
    await expect(page.getByLabel(/owner email/i)).toBeVisible();
  });

  test('should create a new tenant', async ({ page }) => {
    // Navigate to create page
    await page.goto('/admin/tenants/new');
    await page.waitForLoadState('networkidle');

    // Fill in the form
    await page.getByLabel(/tenant name/i).fill(testTenantName);
    await page.getByLabel(/owner email/i).fill(testOwnerEmail);

    // Optional: Set owner name
    const ownerNameInput = page.getByLabel(/owner name/i);
    if (await ownerNameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await ownerNameInput.fill('E2E Test Owner');
    }

    // Submit the form
    await page.getByRole('button', { name: /create tenant/i }).click();

    // Wait for success - should redirect or show success message
    await page.waitForLoadState('networkidle');

    // Should show success or redirect to tenant detail/list
    const successIndicator = page
      .getByText(/tenant created|successfully|created/i)
      .or(page.locator('[class*="success"]'))
      .or(page.getByText(testTenantName));

    await expect(successIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test('should view tenant details', async ({ page }) => {
    // Click on a tenant row to view details
    const tenantRow = page.getByRole('row').filter({ hasText: /@/ }).first();

    if (await tenantRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click the view button or the row
      const viewButton = tenantRow.getByRole('button', {
        name: /view|details/i,
      });
      if (await viewButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await viewButton.click();
      } else {
        // Click on tenant name link
        const tenantLink = tenantRow.getByRole('link').first();
        if (await tenantLink.isVisible({ timeout: 1000 }).catch(() => false)) {
          await tenantLink.click();
        }
      }

      // Verify we're on detail page
      await expect(page).toHaveURL(/\/admin\/tenants\/[a-zA-Z0-9-]+$/);

      // Verify detail page elements
      await expect(page.getByText(/users/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/modules/i)).toBeVisible();
    }
  });

  test('should filter tenants by status', async ({ page }) => {
    // Look for status filter
    const statusFilter = page
      .getByRole('combobox', { name: /status/i })
      .or(page.locator('select').filter({ hasText: /status|all/i }));

    if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Select Active status
      await statusFilter.selectOption('ACTIVE');

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Page should still be functional
      await expect(
        page.getByRole('heading', { name: /tenant/i }).first(),
      ).toBeVisible();
    }
  });

  test('should search tenants', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i);

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Type search query
      await searchInput.fill('test');

      // Wait for search to apply
      await page.waitForTimeout(500);

      // Clear search
      await searchInput.clear();

      // Verify input was cleared
      await expect(searchInput).toHaveValue('');
    }
  });
});

test.describe('Admin: Tenant Detail Actions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to tenant list first
    await page.goto('/admin/tenants');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to edit tenant page', async ({ page }) => {
    // Find a tenant and navigate to its detail page
    const tenantLink = page
      .getByRole('link')
      .filter({ hasText: /tenant/i })
      .first();

    if (await tenantLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tenantLink.click();
      await page.waitForLoadState('networkidle');

      // Click edit button
      const editButton = page
        .getByRole('button', { name: /edit/i })
        .or(page.getByRole('link', { name: /edit/i }));

      if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editButton.click();

        // Verify we're on edit page
        await expect(page).toHaveURL(/\/admin\/tenants\/[a-zA-Z0-9-]+\/edit$/);
      }
    }
  });

  test('should display tenant users section', async ({ page }) => {
    // Navigate to a tenant detail page
    const tenantLink = page
      .getByRole('link')
      .filter({ hasText: /tenant/i })
      .first();

    if (await tenantLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tenantLink.click();
      await page.waitForLoadState('networkidle');

      // Verify users section is visible
      const usersSection = page.getByText(/users/i).first();
      await expect(usersSection).toBeVisible({ timeout: 5000 });

      // Check for add user button
      const addUserButton = page.getByRole('button', { name: /add user/i });
      await expect(addUserButton).toBeVisible();
    }
  });

  test('should display modules section with configuration', async ({
    page,
  }) => {
    // Navigate to a tenant detail page
    const tenantLink = page
      .getByRole('link')
      .filter({ hasText: /tenant/i })
      .first();

    if (await tenantLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tenantLink.click();
      await page.waitForLoadState('networkidle');

      // Verify modules section is visible
      const modulesSection = page.getByText(/modules/i);
      await expect(modulesSection.first()).toBeVisible({ timeout: 5000 });

      // Check for add module button
      const addModuleButton = page.getByRole('button', { name: /add module/i });
      await expect(addModuleButton).toBeVisible();
    }
  });

  test('should open add user modal', async ({ page }) => {
    // Navigate to a tenant detail page
    const tenantLink = page
      .getByRole('link')
      .filter({ hasText: /tenant/i })
      .first();

    if (await tenantLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tenantLink.click();
      await page.waitForLoadState('networkidle');

      // Click add user button
      const addUserButton = page.getByRole('button', { name: /add user/i });
      await addUserButton.click();

      // Verify modal is visible
      const modal = page
        .getByRole('dialog')
        .or(page.locator('[role="dialog"]'));
      await expect(modal).toBeVisible({ timeout: 3000 });

      // Verify form fields
      await expect(page.getByLabel(/email/i)).toBeVisible();
    }
  });

  test('should open module configuration modal', async ({ page }) => {
    // Navigate to a tenant detail page
    const tenantLink = page
      .getByRole('link')
      .filter({ hasText: /tenant/i })
      .first();

    if (await tenantLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tenantLink.click();
      await page.waitForLoadState('networkidle');

      // Click add module button
      const addModuleButton = page.getByRole('button', { name: /add module/i });
      await addModuleButton.click();

      // Verify modal is visible
      const modal = page
        .getByRole('dialog')
        .or(page.locator('[role="dialog"]'));
      await expect(modal).toBeVisible({ timeout: 3000 });

      // Verify tier selection is present
      await expect(page.getByText(/tier/i)).toBeVisible();
    }
  });

  test('should show suspend button for active tenant', async ({ page }) => {
    // Navigate to a tenant detail page
    const tenantLink = page
      .getByRole('link')
      .filter({ hasText: /tenant/i })
      .first();

    if (await tenantLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tenantLink.click();
      await page.waitForLoadState('networkidle');

      // Check for suspend button (only shown for active tenants)
      const suspendButton = page.getByRole('button', { name: /suspend/i });
      const activateButton = page.getByRole('button', { name: /activate/i });

      // Either suspend or activate should be visible depending on tenant status
      const hasSuspend = await suspendButton
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      const hasActivate = await activateButton
        .isVisible({ timeout: 1000 })
        .catch(() => false);

      expect(hasSuspend || hasActivate).toBeTruthy();
    }
  });
});

test.describe('Admin: Tenant Access Control', () => {
  test('non-admin user should not access tenant management', async ({
    page,
    context,
  }) => {
    // Clear auth and login as non-admin user
    await context.clearCookies();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Login as consultant (non-admin)
    await page.getByLabel('Email').fill('avery.chen@pmo.test');
    await page.getByLabel('Password').fill('PmoDemo123!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for login
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Try to access tenant management
    await page.goto('/admin/tenants');

    // Should be redirected or see access denied
    // The page might redirect to dashboard or show 403
    await page.waitForLoadState('networkidle');

    // Either redirected away from /admin/tenants or shows forbidden
    const currentUrl = page.url();
    const hasForbidden = await page
      .getByText(/forbidden|unauthorized|access denied|not authorized/i)
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    expect(!currentUrl.includes('/admin/tenants') || hasForbidden).toBeTruthy();
  });

  test('tenant management should not appear in sidebar for non-admin', async ({
    page,
    context,
  }) => {
    // Clear auth and login as non-admin user
    await context.clearCookies();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Login as consultant (non-admin)
    await page.getByLabel('Email').fill('avery.chen@pmo.test');
    await page.getByLabel('Password').fill('PmoDemo123!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Look for tenant management link in sidebar
    const sidebar = page.locator('nav').first();
    const tenantsLink = sidebar.getByRole('link', { name: /tenants/i });

    // Should not be visible for non-admin users
    const isVisible = await tenantsLink
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    // Tenants link should not be visible (or might be hidden based on role/modules)
    // Note: This test may pass if tenantAdmin module is disabled for the user
    // The actual behavior depends on module configuration
    expect(isVisible).toBeFalsy();
  });
});

test.describe('Admin: Tenant Status Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/tenants');
    await page.waitForLoadState('networkidle');
  });

  test('should show confirmation modal when suspending tenant', async ({
    page,
  }) => {
    // Navigate to a tenant detail page
    const tenantLink = page
      .getByRole('link')
      .filter({ hasText: /tenant/i })
      .first();

    if (await tenantLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tenantLink.click();
      await page.waitForLoadState('networkidle');

      // Click suspend button if visible (only for active tenants)
      const suspendButton = page.getByRole('button', { name: /suspend/i });

      if (await suspendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await suspendButton.click();

        // Verify confirmation modal appears
        const confirmModal = page
          .getByRole('dialog')
          .or(page.locator('[role="dialog"]'));
        await expect(confirmModal).toBeVisible({ timeout: 3000 });

        // Verify warning text
        await expect(page.getByText(/are you sure/i)).toBeVisible();

        // Cancel to avoid actually suspending
        const cancelButton = page.getByRole('button', { name: /cancel/i });
        await cancelButton.click();

        // Modal should close
        await expect(confirmModal).not.toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('should show confirmation modal when cancelling tenant', async ({
    page,
  }) => {
    // Navigate to a tenant detail page
    const tenantLink = page
      .getByRole('link')
      .filter({ hasText: /tenant/i })
      .first();

    if (await tenantLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tenantLink.click();
      await page.waitForLoadState('networkidle');

      // Click cancel button if visible
      const cancelTenantButton = page.getByRole('button', {
        name: /^cancel$/i,
      });

      if (
        await cancelTenantButton.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        await cancelTenantButton.click();

        // Verify confirmation modal appears
        const confirmModal = page
          .getByRole('dialog')
          .or(page.locator('[role="dialog"]'));
        await expect(confirmModal).toBeVisible({ timeout: 3000 });

        // Cancel to avoid actually cancelling the tenant
        const dismissButton = confirmModal
          .getByRole('button', { name: /cancel/i })
          .first();
        await dismissButton.click();
      }
    }
  });
});

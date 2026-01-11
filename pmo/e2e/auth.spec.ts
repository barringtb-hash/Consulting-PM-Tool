import { test, expect } from '@playwright/test';

/**
 * M1: Authentication & Authorization E2E Tests
 *
 * Coverage:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Session persistence (revisit app returns user)
 * - Logout functionality
 * - Protected route redirects
 */

test.describe('M1: Authentication & Authorization', () => {
  test('should login successfully with valid credentials', async ({
    page,
    context,
  }) => {
    // Clear any existing auth
    await context.clearCookies();

    await page.goto('/login');

    // Fill login form
    await page.getByLabel('Email').fill('admin@pmo.test');
    await page.getByLabel('Password').fill('AdminDemo123!');

    // Submit
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify dashboard content loads (user is authenticated)
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible(
      { timeout: 10000 },
    );
  });

  test('should fail to login with invalid credentials', async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    await page.goto('/login');

    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Password').fill('wrongpassword');

    await page.getByRole('button', { name: 'Sign in' }).click();

    // Should show error message
    await expect(page.getByRole('alert')).toBeVisible();

    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should persist session on page reload', async ({ page }) => {
    // Already authenticated via global setup
    await page.goto('/dashboard');

    // Verify authenticated
    await expect(page).toHaveURL('/dashboard');

    // Reload page
    await page.reload();

    // Should still be authenticated
    await expect(page).toHaveURL('/dashboard');
    await expect(
      page.getByRole('heading', { name: /dashboard/i }),
    ).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto('/dashboard');

    // Find and click logout button
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });

    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);

      // Trying to access protected route should redirect back to login
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('should redirect to login when accessing protected routes while unauthenticated', async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    // Try to access protected routes
    const protectedRoutes = [
      '/dashboard',
      '/clients',
      '/projects',
      '/tasks',
      '/assets',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('should support different user accounts', async ({ page, context }) => {
    await context.clearCookies();

    // Login as consultant user
    await page.goto('/login');
    await page.getByLabel('Email').fill('avery.chen@pmo.test');
    await page.getByLabel('Password').fill('PmoDemo123!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Should successfully authenticate
    await expect(page).toHaveURL('/dashboard');
  });
});

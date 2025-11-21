import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth', 'user.json');

/**
 * Global setup to authenticate once before all tests.
 * This uses seeded test account from prisma/seed.ts
 */
setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Wait for page to load
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  // Fill in credentials (from seeded test account)
  await page.getByLabel('Email').fill('admin@pmo.test');
  await page.getByLabel('Password').fill('AdminDemo123!');

  // Submit form
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for navigation to complete (should redirect to dashboard)
  await page.waitForURL('/dashboard');

  // Verify we're authenticated
  await expect(page).toHaveURL('/dashboard');

  // Save signed-in state to file
  await page.context().storageState({ path: authFile });
});

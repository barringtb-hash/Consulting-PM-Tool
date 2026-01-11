import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth', 'user.json');

/**
 * Global setup to authenticate once before all tests.
 * This uses seeded test account from prisma/seed.ts
 */
setup('authenticate', async ({ page }) => {
  // Navigate to login page - use default 'load' waitUntil
  await page.goto('/login', { waitUntil: 'load' });

  // Wait for the email input to appear
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 30000 });

  // Fill in credentials (from seeded test account)
  await emailInput.fill('admin@pmo.test');

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill('AdminDemo123!');

  // Submit form
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for navigation to complete (should redirect to dashboard)
  await page.waitForURL('/dashboard', { timeout: 15000 });

  // Verify we're authenticated
  await expect(page).toHaveURL('/dashboard');

  // Save signed-in state to file
  await page.context().storageState({ path: authFile });
});

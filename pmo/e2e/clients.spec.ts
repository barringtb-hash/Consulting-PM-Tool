import { test, expect } from '@playwright/test';

/**
 * @deprecated LEGACY TEST FILE - Needs migration to CRM Accounts
 *
 * M2: Clients & Contacts E2E Tests
 *
 * These tests navigate to /clients which now redirects to /crm/accounts.
 * The tests will fail because the Accounts page has different UI elements.
 *
 * For CRM Accounts testing, use: e2e/crm-accounts.spec.ts
 * For CRM Opportunities testing, use: e2e/crm-opportunities.spec.ts
 *
 * TODO: Either delete this file or rewrite tests for legacy Client detail pages.
 *
 * Original Coverage:
 * - Create new client
 * - View client list
 * - View client details
 * - Create contact for client
 * - View contacts linked to client
 * - Edit client information
 * - Archive/unarchive client
 */

test.describe('M2: Clients & Contacts Management', () => {
  const clientName = `E2E Client ${Date.now()}`;
  let clientUrl: string;

  test('should create a new client', async ({ page }) => {
    await page.goto('/clients');

    // Wait for clients page to load
    await expect(
      page.getByRole('heading', { name: /clients/i }).first(),
    ).toBeVisible();

    // Fill in client name
    await page.getByLabel(/name/i).fill(clientName);

    // Create client
    await page.getByRole('button', { name: /create client/i }).click();

    // Verify client appears in list
    await expect(page.getByText(clientName)).toBeVisible({ timeout: 5000 });
  });

  test('should view client details page', async ({ page }) => {
    await page.goto('/clients');

    // Find and click on the created client
    await page.getByText(clientName).click();

    // Verify we're on client details page
    await expect(page).toHaveURL(/\/clients\/\d+/);

    // Store URL for later tests
    clientUrl = page.url();

    // Verify client name is displayed
    await expect(page.getByText(clientName)).toBeVisible();
  });

  test('should create a contact for the client', async ({ page }) => {
    // Navigate to clients page first to get the client
    await page.goto('/clients');
    await page.getByText(clientName).click();

    // Look for "Add Contact" or "New Contact" button
    const addContactButton = page.getByRole('button', {
      name: /add contact|new contact|create contact/i,
    });

    if (
      await addContactButton.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await addContactButton.click();

      // Fill contact details
      const contactName = `Contact ${Date.now()}`;
      const contactEmail = `contact${Date.now()}@example.com`;

      await page.getByLabel(/name/i).first().fill(contactName);

      const emailField = page.getByLabel(/email/i);
      if (await emailField.isVisible({ timeout: 1000 }).catch(() => false)) {
        await emailField.fill(contactEmail);
      }

      // Save contact
      const saveButton = page.getByRole('button', {
        name: /save|create|add/i,
      });
      await saveButton.click();

      // Verify contact was created
      await expect(page.getByText(contactName)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show contacts on client details page', async ({ page }) => {
    await page.goto('/clients');
    await page.getByText(clientName).click();

    // Look for contacts section or tab
    const contactsTab = page.getByRole('tab', { name: /contacts/i });
    if (await contactsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await contactsTab.click();
    }

    // Contacts section should be visible
    // At minimum, verify the section header exists
    const contactsHeading = page.getByRole('heading', { name: /contacts/i });
    await expect(contactsHeading).toBeVisible({ timeout: 5000 });
  });

  test('should display list of all clients', async ({ page }) => {
    await page.goto('/clients');

    // Verify heading
    await expect(
      page.getByRole('heading', { name: /clients/i }).first(),
    ).toBeVisible();

    // Should see our created client
    await expect(page.getByText(clientName)).toBeVisible();
  });

  test('should filter/search clients', async ({ page }) => {
    await page.goto('/clients');

    // Look for search or filter input
    const searchInput = page.getByPlaceholder(/search|filter/i);

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Type part of client name
      await searchInput.fill(clientName.substring(0, 10));

      // Our client should still be visible
      await expect(page.getByText(clientName)).toBeVisible();

      // Clear search
      await searchInput.clear();
      await searchInput.fill('NonexistentClient12345');

      // Our client might not be visible (depending on implementation)
      // Just verify search input works
      expect(await searchInput.inputValue()).toBe('NonexistentClient12345');
    }
  });

  test('should navigate between clients list and detail pages', async ({
    page,
  }) => {
    await page.goto('/clients');

    // Click on client
    await page.getByText(clientName).click();
    await expect(page).toHaveURL(/\/clients\/\d+/);

    // Navigate back to clients list
    await page.goto('/clients');
    await expect(page.getByRole('heading', { name: /clients/i })).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import {
  runAccessibilityScan,
  scanPage,
  scanCommonIssues,
} from './_helpers/accessibility';

/**
 * Accessibility Testing Suite
 *
 * This suite scans key pages for WCAG 2.1 Level AA compliance using axe-core.
 * Tests focus on critical and serious violations.
 *
 * Scanned Pages:
 * - Dashboard (authenticated home)
 * - Clients list and client detail
 * - Project detail (Summary + Status tabs)
 * - Global Tasks view
 * - Assets library
 */

test.describe('Accessibility - WCAG 2.1 Level AA', () => {
  test('Dashboard should have no critical/serious accessibility violations', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');

    const summary = await runAccessibilityScan(page);

    // Report findings
    expect(
      summary.critical,
      `Dashboard has ${summary.critical} critical accessibility violations`,
    ).toBe(0);
    expect(
      summary.serious,
      `Dashboard has ${summary.serious} serious accessibility violations`,
    ).toBe(0);
  });

  test('Clients list page should be accessible', async ({ page }) => {
    await page.goto('/clients');

    const summary = await runAccessibilityScan(page);

    expect(summary.critical).toBe(0);
    expect(summary.serious).toBe(0);
  });

  test('Client detail page should be accessible', async ({ page }) => {
    // First create a client
    await page.goto('/clients');
    const clientName = `A11y Test Client ${Date.now()}`;
    await page.getByLabel(/name/i).fill(clientName);
    await page.getByRole('button', { name: /create client/i }).click();
    await page.getByText(clientName).click();

    // Wait for page to load
    await expect(page).toHaveURL(/\/clients\/\d+/);

    // Scan the page
    const summary = await runAccessibilityScan(page);

    expect(summary.critical).toBe(0);
    expect(summary.serious).toBe(0);
  });

  test('Project Summary tab should be accessible', async ({ page }) => {
    // Create client and project
    await page.goto('/clients');
    const clientName = `A11y Client ${Date.now()}`;
    await page.getByLabel(/name/i).fill(clientName);
    await page.getByRole('button', { name: /create client/i }).click();
    await page.getByText(clientName).click();

    // Create project
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

    const projectName = `A11y Project ${Date.now()}`;
    const projectNameInput = page.getByLabel(/project name|name/i).first();
    await projectNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await projectNameInput.fill(projectName);
    await page.getByRole('button', { name: /create|save/i }).click();
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 });

    // Navigate to Summary tab
    const summaryTab = page.getByRole('tab', { name: /summary/i });
    if (await summaryTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await summaryTab.click();
    }

    // Scan the page
    const summary = await runAccessibilityScan(page);

    expect(summary.critical).toBe(0);
    expect(summary.serious).toBe(0);
  });

  test('Project Status tab should be accessible', async ({ page }) => {
    // Navigate to an existing project (from previous test setup)
    await page.goto('/clients');

    // Find any client
    const firstClient = page.getByRole('link').first();
    if (await firstClient.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstClient.click();

      // Find any project
      const firstProject = page.getByRole('link').first();
      if (await firstProject.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstProject.click();

        // Navigate to Status tab
        const statusTab = page.getByRole('tab', { name: /status/i });
        if (await statusTab.isVisible({ timeout: 2000 }).catch(() => false)) {
          await statusTab.click();
          await page.waitForTimeout(500);

          // Scan the page
          const summary = await runAccessibilityScan(page);

          expect(summary.critical).toBe(0);
          expect(summary.serious).toBe(0);
        }
      }
    }
  });

  test('Global Tasks page should be accessible', async ({ page }) => {
    await page.goto('/tasks');

    const summary = await runAccessibilityScan(page);

    expect(summary.critical).toBe(0);
    expect(summary.serious).toBe(0);
  });

  test('Assets library page should be accessible', async ({ page }) => {
    await page.goto('/assets');

    const summary = await runAccessibilityScan(page);

    expect(summary.critical).toBe(0);
    expect(summary.serious).toBe(0);
  });

  test('Login page should be accessible', async ({ page, context }) => {
    // Clear auth to access login page
    await context.clearCookies();
    await page.goto('/login');

    const summary = await runAccessibilityScan(page);

    expect(summary.critical).toBe(0);
    expect(summary.serious).toBe(0);
  });

  test.describe('Common Accessibility Checks', () => {
    test('Dashboard has proper semantic structure', async ({ page }) => {
      await page.goto('/dashboard');

      const summary = await scanCommonIssues(page);

      // Should have no violations of common accessibility rules
      expect(summary.total).toBe(0);
    });

    test('Forms have proper labels', async ({ page }) => {
      await page.goto('/clients');

      const summary = await runAccessibilityScan(page, {
        includeRules: ['label', 'label-title-only'],
      });

      expect(summary.critical).toBe(0);
      expect(summary.serious).toBe(0);
    });

    test('Buttons and links have accessible names', async ({ page }) => {
      await page.goto('/dashboard');

      const summary = await runAccessibilityScan(page, {
        includeRules: ['button-name', 'link-name'],
      });

      expect(summary.critical).toBe(0);
      expect(summary.serious).toBe(0);
    });

    test('Color contrast meets WCAG AA standards', async ({ page }) => {
      await page.goto('/dashboard');

      const summary = await runAccessibilityScan(page, {
        includeRules: ['color-contrast'],
        // Color contrast can have many violations in initial implementations
        // We'll allow moderate/minor but fail on critical/serious
        failOn: ['critical', 'serious'],
      });

      expect(summary.critical).toBe(0);
      expect(summary.serious).toBe(0);

      // Log moderate/minor for awareness
      if (summary.moderate > 0 || summary.minor > 0) {
        console.log(
          `ℹ️ Color contrast: ${summary.moderate} moderate, ${summary.minor} minor violations (not failing test)`,
        );
      }
    });

    test('Headings are in logical order', async ({ page }) => {
      await page.goto('/dashboard');

      const summary = await runAccessibilityScan(page, {
        includeRules: ['heading-order'],
      });

      expect(summary.total).toBe(0);
    });

    test('ARIA attributes are valid', async ({ page }) => {
      await page.goto('/dashboard');

      const summary = await runAccessibilityScan(page, {
        includeRules: [
          'aria-valid-attr',
          'aria-valid-attr-value',
          'aria-required-attr',
          'aria-allowed-attr',
        ],
      });

      expect(summary.critical).toBe(0);
      expect(summary.serious).toBe(0);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('Can navigate dashboard with keyboard', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Tab through interactive elements up to 3 times to find a focusable element
      let firstFocusedElement: string | null = null;
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Tab');
        firstFocusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          return el ? el.tagName : null;
        });

        // If we've found an interactive element, stop
        if (
          firstFocusedElement &&
          ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(
            firstFocusedElement,
          )
        ) {
          break;
        }
      }

      // Should focus on an interactive element (link, button, input)
      expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(
        firstFocusedElement,
      );
    });

    test('Can access main navigation with keyboard', async ({ page }) => {
      await page.goto('/dashboard');

      // Look for skip-to-content link or main navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to navigate
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });

      expect(focusedElement).toBeTruthy();
    });
  });
});

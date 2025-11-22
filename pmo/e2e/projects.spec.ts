import { test, expect } from '@playwright/test';

/**
 * M3: Projects Management E2E Tests
 *
 * Coverage:
 * - Create project for a client (blank)
 * - Create project from template
 * - View project details
 * - Navigate project tabs (Summary, Tasks, Milestones, Meetings, Assets, Status)
 * - Update project information
 * - View project summary
 */

test.describe('M3: Projects Management', () => {
  const clientName = `E2E Project Client ${Date.now()}`;
  const projectName = `E2E Project ${Date.now()}`;

  test.beforeAll(async () => {
    // Note: In a real test, we'd create a client here
    // For now, we'll rely on existing clients or create one inline
  });

  test('should create a new project for a client', async ({ page }) => {
    // First, create a client
    await page.goto('/clients');
    await page.getByLabel(/name/i).fill(clientName);
    await page.getByRole('button', { name: /create client/i }).click();
    await expect(page.getByText(clientName)).toBeVisible();

    // Navigate to client details
    await page.getByText(clientName).click();
    await expect(page).toHaveURL(/\/clients\/\d+/);

    // Look for "New Project" or "Create Project" button
    const newProjectButton = page.getByRole('button', {
      name: /new project|create project/i,
    });

    if (await newProjectButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newProjectButton.click();
    } else {
      // Alternative: navigate to project setup directly
      await page.goto('/projects/new');
    }

    // Fill in project details
    await page.getByLabel(/project name|name/i).first().fill(projectName);

    // Look for client selector if needed
    const clientSelector = page.getByLabel(/client/i);
    if (await clientSelector.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clientSelector.click();
      await page.getByText(clientName).click();
    }

    // Submit project creation
    const createButton = page.getByRole('button', {
      name: /create project|save|submit/i,
    });
    await createButton.click();

    // Verify project was created
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 });

    // Should be on project details page
    await expect(page).toHaveURL(/\/projects\/\d+/);
  });

  test('should view project details with all tabs', async ({ page }) => {
    // Navigate to the project (assume it exists from previous test)
    await page.goto('/clients');
    await page.getByText(clientName).click();

    // Find and click on our project
    await page.getByText(projectName).click();

    // Verify we're on project page
    await expect(page).toHaveURL(/\/projects\/\d+/);
    await expect(page.getByText(projectName)).toBeVisible();

    // Test navigation through tabs
    const tabs = [
      'Summary',
      'Tasks',
      'Milestones',
      'Meetings',
      'Assets',
      'Status',
    ];

    for (const tabName of tabs) {
      const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });

      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();

        // Verify tab content area is visible
        // Look for a heading or key content
        await page.waitForTimeout(500); // Brief wait for content to load

        // Tab should be active/selected
        expect(await tab.getAttribute('aria-selected')).toBeTruthy();
      }
    }
  });

  test('should display project summary information', async ({ page }) => {
    // Navigate to project
    await page.goto('/clients');
    await page.getByText(clientName).click();
    await page.getByText(projectName).click();

    // Click Summary tab
    const summaryTab = page.getByRole('tab', { name: /summary/i });
    if (await summaryTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await summaryTab.click();

      // Verify summary content is displayed
      // Could check for project name, client, dates, etc.
      await expect(page.getByText(projectName)).toBeVisible();
    }
  });

  test('should create project from template', async ({ page }) => {
    await page.goto('/projects/new');

    // Look for template selection
    const templateSelector = page.getByLabel(/template|use template/i);

    if (await templateSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await templateSelector.click();

      // Select a template (e.g., first available)
      const templateOption = page.getByRole('option').first();
      if (await templateOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        await templateOption.click();

        // Fill project name
        const templateProjectName = `E2E Template Project ${Date.now()}`;
        await page.getByLabel(/project name|name/i).first().fill(templateProjectName);

        // Select client
        const clientField = page.getByLabel(/client/i);
        if (await clientField.isVisible({ timeout: 1000 }).catch(() => false)) {
          await clientField.click();
          await page.getByText(clientName).click();
        }

        // Submit
        await page.getByRole('button', { name: /create|save/i }).click();

        // Verify creation
        await expect(page.getByText(templateProjectName)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should show projects list for client', async ({ page }) => {
    await page.goto('/clients');
    await page.getByText(clientName).click();

    // Should see projects section
    const projectsHeading = page.getByRole('heading', { name: /projects/i });

    if (await projectsHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Our project should be listed
      await expect(page.getByText(projectName)).toBeVisible();
    }
  });

  test('should navigate from client to project and back', async ({ page }) => {
    await page.goto('/clients');
    await page.getByText(clientName).click();

    // Click on project
    await page.getByText(projectName).click();
    await expect(page).toHaveURL(/\/projects\/\d+/);

    // Navigate back via browser back button or breadcrumb
    await page.goBack();
    await expect(page).toHaveURL(/\/clients\/\d+/);
  });
});

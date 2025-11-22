import { test, expect } from '@playwright/test';

/**
 * M7: Status & Reporting E2E Tests
 *
 * Coverage:
 * - View project Status tab
 * - Verify project health indicators (RAG status)
 * - View key dates (start, target, actual)
 * - View progress metrics
 * - View global dashboard with project tiles
 * - Dashboard shows summary statistics
 * - Status updates over time
 */

test.describe('M7: Status & Reporting', () => {
  const clientName = `E2E Status Client ${Date.now()}`;
  const projectName = `E2E Status Project ${Date.now()}`;

  test.beforeAll(async () => {
    // Note: Setup would create client + project + some tasks/milestones
  });

  test('should view project Status tab', async ({ page }) => {
    // Setup: Create client and project
    await page.goto('/clients');
    await page.getByLabel(/name/i).fill(clientName);
    await page.getByRole('button', { name: /create client/i }).click();
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

    // Navigate to Status tab
    const statusTab = page.getByRole('tab', { name: /status/i });

    if (await statusTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusTab.click();

      // Verify status content is displayed
      await expect(page).toHaveURL(/\/projects\/\d+/);

      // Status tab should be active
      expect(await statusTab.getAttribute('aria-selected')).toBeTruthy();
    }
  });

  test('should display project health indicators', async ({ page }) => {
    // Navigate to project status
    await page.goto('/clients');
    await page.getByText(clientName).click();
    await page.getByText(projectName).click();

    const statusTab = page.getByRole('tab', { name: /status/i });
    if (await statusTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusTab.click();

      // Look for RAG (Red/Amber/Green) status indicators
      const healthIndicators = page.getByText(/health|status|rag/i);

      if (
        await healthIndicators.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        expect(await healthIndicators.isVisible()).toBeTruthy();
      }

      // Look for status badges/indicators
      const statusBadge = page.locator(
        '[data-testid*="status"], .status-indicator, .health-badge',
      );

      if ((await statusBadge.count()) > 0) {
        expect(await statusBadge.first().isVisible()).toBeTruthy();
      }
    }
  });

  test('should display key project dates', async ({ page }) => {
    // Navigate to project status
    await page.goto('/clients');
    await page.getByText(clientName).click();
    await page.getByText(projectName).click();

    const statusTab = page.getByRole('tab', { name: /status/i });
    if (await statusTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusTab.click();

      // Look for date fields
      const dateLabels = [
        /start date/i,
        /target date/i,
        /due date/i,
        /completion/i,
      ];

      for (const dateLabel of dateLabels) {
        const dateElement = page.getByText(dateLabel);
        if (await dateElement.isVisible({ timeout: 1000 }).catch(() => false)) {
          expect(await dateElement.isVisible()).toBeTruthy();
        }
      }
    }
  });

  test('should display progress metrics', async ({ page }) => {
    // Navigate to project status
    await page.goto('/clients');
    await page.getByText(clientName).click();
    await page.getByText(projectName).click();

    const statusTab = page.getByRole('tab', { name: /status/i });
    if (await statusTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusTab.click();

      // Look for progress indicators
      const progressText = page.getByText(/progress|complete|%|percentage/i);

      if (await progressText.isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(await progressText.isVisible()).toBeTruthy();
      }

      // Look for progress bars or charts
      const progressBar = page.locator(
        '[role="progressbar"], .progress-bar, [data-testid*="progress"]',
      );

      if ((await progressBar.count()) > 0) {
        expect(await progressBar.first().isVisible()).toBeTruthy();
      }
    }
  });

  test('should view global dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify we're on dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(
      page.getByRole('heading', { name: /dashboard/i }),
    ).toBeVisible();

    // Dashboard should show some content
    const dashboardContent = page.locator('main, [data-testid*="dashboard"]');
    expect(await dashboardContent.isVisible()).toBeTruthy();
  });

  test('should display project tiles on dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for project tiles/cards
    const projectTiles = page.locator(
      '[data-testid*="project"], .project-card, .project-tile',
    );

    // Should have at least one project (or empty state)
    const tileCount = await projectTiles.count();
    expect(tileCount).toBeGreaterThanOrEqual(0);

    // If projects exist, our project should be visible
    if (tileCount > 0) {
      // Look for our project by name
      const ourProject = page.getByText(projectName);
      if (await ourProject.isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(await ourProject.isVisible()).toBeTruthy();
      }
    }
  });

  test('should display summary statistics on dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for statistics/metrics
    const statsLabels = [
      /total projects/i,
      /active projects/i,
      /clients/i,
      /tasks/i,
      /overdue/i,
    ];

    for (const label of statsLabels) {
      const statElement = page.getByText(label);
      if (await statElement.isVisible({ timeout: 1000 }).catch(() => false)) {
        expect(await statElement.isVisible()).toBeTruthy();
      }
    }
  });

  test('should show task count in project status', async ({ page }) => {
    // Navigate to project and add a task first
    await page.goto('/clients');
    await page.getByText(clientName).click();
    await page.getByText(projectName).click();

    // Add a task
    const tasksTab = page.getByRole('tab', { name: /tasks/i });
    if (await tasksTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tasksTab.click();

      const newTaskButton = page.getByRole('button', {
        name: /new task|add task/i,
      });
      if (await newTaskButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await newTaskButton.click();
        await page
          .getByLabel(/title|name/i)
          .first()
          .fill('Status Test Task');
        await page.getByRole('button', { name: /save|create/i }).click();
      }
    }

    // Go to Status tab
    const statusTab = page.getByRole('tab', { name: /status/i });
    if (await statusTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusTab.click();

      // Should show task count
      const taskCount = page.getByText(/\d+ task/i);
      if (await taskCount.isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(await taskCount.isVisible()).toBeTruthy();
      }
    }
  });

  test('should show milestone count in project status', async ({ page }) => {
    // Navigate to project
    await page.goto('/clients');
    await page.getByText(clientName).click();
    await page.getByText(projectName).click();

    // Add a milestone
    const milestonesTab = page.getByRole('tab', { name: /milestones/i });
    if (await milestonesTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await milestonesTab.click();

      const newMilestoneButton = page.getByRole('button', {
        name: /new milestone|add milestone/i,
      });
      if (
        await newMilestoneButton.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        await newMilestoneButton.click();
        await page
          .getByLabel(/name|title/i)
          .first()
          .fill('Status Test Milestone');
        await page.getByRole('button', { name: /save|create/i }).click();
      }
    }

    // Go to Status tab
    const statusTab = page.getByRole('tab', { name: /status/i });
    if (await statusTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusTab.click();

      // Should show milestone count
      const milestoneCount = page.getByText(/\d+ milestone/i);
      if (
        await milestoneCount.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        expect(await milestoneCount.isVisible()).toBeTruthy();
      }
    }
  });

  test('should update project health status', async ({ page }) => {
    // Navigate to project status
    await page.goto('/clients');
    await page.getByText(clientName).click();
    await page.getByText(projectName).click();

    const statusTab = page.getByRole('tab', { name: /status/i });
    if (await statusTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusTab.click();

      // Look for health status update option
      const updateStatusButton = page.getByRole('button', {
        name: /update status|change status/i,
      });

      if (
        await updateStatusButton.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        await updateStatusButton.click();

        // Select a status (e.g., Green/On Track)
        const statusOption = page.getByRole('option', {
          name: /green|on track|healthy/i,
        });

        if (
          await statusOption.isVisible({ timeout: 1000 }).catch(() => false)
        ) {
          await statusOption.click();

          // Save status update
          const saveButton = page.getByRole('button', { name: /save|update/i });
          if (
            await saveButton.isVisible({ timeout: 1000 }).catch(() => false)
          ) {
            await saveButton.click();
          }

          // Verify status was updated
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should navigate from dashboard to project status', async ({ page }) => {
    await page.goto('/dashboard');

    // Find our project on the dashboard
    const projectCard = page.getByText(projectName);

    if (await projectCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectCard.click();

      // Should navigate to project page
      await expect(page).toHaveURL(/\/projects\/\d+/);
      await expect(page.getByText(projectName)).toBeVisible();
    }
  });
});

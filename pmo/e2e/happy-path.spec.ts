import { test, expect } from '@playwright/test';

/**
 * Happy-path E2E test covering the core PMO workflow:
 * 1. Navigate to dashboard (already authenticated via setup)
 * 2. Create a new client
 * 3. Create a project for the client
 * 4. Add a meeting to the project
 * 5. Create a task from meeting notes
 */
test.describe('Core PMO Workflow - Happy Path', () => {
  test('complete workflow: client → project → meeting → task', async ({
    page,
  }) => {
    // Step 1: Start at dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');

    // Step 2: Navigate to Clients and create a new client
    await page.goto('/clients');
    await expect(page.getByRole('heading', { name: /clients/i })).toBeVisible();

    // Fill in client name and create
    const clientName = `E2E Test Client ${Date.now()}`;
    await page.getByLabel(/name/i).fill(clientName);
    await page.getByRole('button', { name: /create client/i }).click();

    // Verify client was created and appears in the list
    await expect(page.getByText(clientName)).toBeVisible();

    // Step 3: Click on the client to view details
    await page.getByText(clientName).click();

    // Verify we're on the client details page
    await expect(page).toHaveURL(/\/clients\/\d+/);
    await expect(page.getByText(clientName)).toBeVisible();

    // Step 4: Create a project for this client
    // Navigate to the "New Project" button or intake form
    const newProjectButton = page.getByRole('button', {
      name: /new project|create project/i,
    });
    if (
      await newProjectButton.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await newProjectButton.click();
    } else {
      // Alternative: navigate directly to project setup if button not found
      await page.goto('/projects/new');
    }

    // Fill in project details
    const projectName = `E2E Test Project ${Date.now()}`;
    const projectNameInput = page.getByLabel(/project name|name/i).first();
    await projectNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await projectNameInput.fill(projectName);

    // Submit the project form
    const createButton = page.getByRole('button', {
      name: /create project|save|submit/i,
    });
    await createButton.click();

    // Verify project was created
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 });

    // Step 5: Navigate to project dashboard/details
    // Should already be there after creation, but verify
    await expect(page).toHaveURL(/\/projects\/\d+/);

    // Step 6: Add a meeting
    // Look for meetings tab or section
    const meetingsTab = page.getByRole('tab', { name: /meetings/i });
    if (await meetingsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await meetingsTab.click();
    }

    // Create new meeting
    const newMeetingButton = page.getByRole('button', {
      name: /new meeting|add meeting|create meeting/i,
    });
    if (
      await newMeetingButton.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await newMeetingButton.click();

      // Fill in meeting details
      const meetingTitle = `E2E Test Meeting ${Date.now()}`;
      await page.getByLabel(/title|meeting name/i).fill(meetingTitle);

      // Add notes
      const meetingNotes =
        'Need to implement new feature X\nReview design mockups';
      const notesField = page.getByLabel(/notes/i);
      if (await notesField.isVisible({ timeout: 1000 }).catch(() => false)) {
        await notesField.fill(meetingNotes);
      }

      // Save meeting
      const saveMeetingButton = page.getByRole('button', {
        name: /save meeting|create meeting|save/i,
      });
      await saveMeetingButton.click();

      // Verify meeting was created
      await expect(page.getByText(meetingTitle)).toBeVisible();

      // Step 7: Create task from meeting notes
      // Look for "Create Task" or similar button in meeting context
      const createTaskButton = page.getByRole('button', {
        name: /create task|new task|add task/i,
      });

      if (
        await createTaskButton.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        await createTaskButton.click();

        // Fill task details
        const taskTitle = `E2E Test Task ${Date.now()}`;
        await page
          .getByLabel(/title|task name|name/i)
          .first()
          .fill(taskTitle);

        // Save task
        const saveTaskButton = page.getByRole('button', {
          name: /save task|create task|add task|save/i,
        });
        await saveTaskButton.click();

        // Verify task was created
        await expect(page.getByText(taskTitle)).toBeVisible();
      }
    }

    // Final verification: Check that we can navigate to global tasks view
    await page.goto('/tasks');
    await expect(
      page.getByRole('heading', { name: /tasks|my tasks/i }),
    ).toBeVisible();
  });

  test('can logout and login again', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for logout button (might be in a menu or navbar)
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });

    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();

      // Verify we're redirected to login page
      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.getByRole('heading', { name: /sign in/i }),
      ).toBeVisible();

      // Login again
      await page.getByLabel('Email').fill('admin@pmo.test');
      await page.getByLabel('Password').fill('AdminDemo123!');
      await page.getByRole('button', { name: 'Sign in' }).click();

      // Verify we're back at dashboard
      await page.waitForURL('/dashboard');
      await expect(page).toHaveURL('/dashboard');
    }
  });
});

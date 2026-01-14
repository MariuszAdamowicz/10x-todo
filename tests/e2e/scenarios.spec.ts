import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage';
import { ProjectSettingsPage } from './pages/ProjectSettingsPage';
import { SharedComponents } from './pages/SharedComponents';

const timestamp = Date.now();
const userEmail = `test-user-${timestamp}@example.com`;
const userPassword = 'password123';
const projectName = 'Projekt Testowy';

test.describe('Główny scenariusz aplikacji', () => {
  
  // Setup: Register a new user before running the test
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/register');
    await page.getByLabel('Email').fill(userEmail);
    await page.getByLabel('Password', { exact: true }).fill(userPassword);
    await page.getByLabel('Confirm Password').fill(userPassword);
    // Assuming there is a submit button on register page similar to login
    await page.getByRole('button', { name: /register|sign up/i }).click();
    
    // Wait for redirect to projects or login
    await page.waitForURL(/\/projects|\/login/);
    
    await page.close();
  });

  test('Pełny przepływ: Logowanie -> Projekt -> Zadania -> Ustawienia', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout for this long scenario
    const loginPage = new LoginPage(page);
    const projectsPage = new ProjectsPage(page);
    const projectDetailsPage = new ProjectDetailsPage(page);
    const settingsPage = new ProjectSettingsPage(page);
    const sharedComponents = new SharedComponents(page);

    // 1. Zaloguj się użytkownikiem testowym
    await loginPage.goto();
    await loginPage.login(userEmail, userPassword);
    await expect(page).toHaveURL('/projects');

    // 2. Utwórz nowy projekt o nazwie "Projekt Testowy"
    // Use a unique name to verify specific creation if needed, but scenario says "Projekt Testowy"
    // We will use the exact name requested.
    await projectsPage.createProject(projectName, 'Opis dla projektu testowego');

    // 3. Wejdź na stronę Projektu Testowego
    await projectsPage.openProject(projectName);
    // Verify we are on the project details page
    await expect(page.locator('h1')).toContainText(projectName);

    // 4. Dodaj "Zadanie 1"
    await projectDetailsPage.addTask('Zadanie 1');

    // 5. Dodaj "Zadanie 2"
    await projectDetailsPage.addTask('Zadanie 2');

    // 6. Wejdź do "Zadanie 1"
    await projectDetailsPage.openTask('Zadanie 1');
    // Verify we are in task details (title should be visible in breadcrumbs or header)
    // Assuming URL changes or breadcrumb updates.

    // 7. Dodaj "Zadanie 1-1"
    // Inside the task view, adding a task usually adds a subtask
    await projectDetailsPage.addTask('Zadanie 1-1');

    // 8. Używając BreadCrumb wróć na stronę projektu
    await projectDetailsPage.navigateBreadcrumb(projectName);

    // 9. Deleguj "Zadanie 2" asystentowi AI
    await projectDetailsPage.delegateTask('Zadanie 2');
    // Verify delegation (e.g., button state changes)
    // The button might change color or icon.
    // We can check if the aria-pressed attribute becomes true
    const task2 = projectDetailsPage.getTaskItem('Zadanie 2');
    await expect(task2.getByRole('button', { name: 'Delegate task' })).toHaveAttribute('aria-pressed', 'true');

    // 12. Przejdź do settingu Projektu
    await projectDetailsPage.openSettings();
    await expect(page).toHaveURL(/.*\/settings/);

    // 13. Naciśnij "oko" w celu pokazania API klucza
    await expect(await settingsPage.isApiKeyVisible()).toBe(false);
    await settingsPage.toggleApiKeyVisibility();
    await expect(await settingsPage.isApiKeyVisible()).toBe(true);

    // 14. Wyloguj się
    await sharedComponents.logout();
    await expect(page).toHaveURL(/\/login/);
  });
});

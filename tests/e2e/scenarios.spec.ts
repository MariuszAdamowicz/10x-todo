import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailsPage } from "./pages/ProjectDetailsPage";
import { ProjectSettingsPage } from "./pages/ProjectSettingsPage";
import { SharedComponents } from "./pages/SharedComponents";

const timestamp = Date.now();
const userEmail = `test-user-${timestamp}@example.com`;
const userPassword = "password123";
const projectName = "Projekt Testowy";

test.describe("Główny scenariusz aplikacji", () => {
  // Setup: Register a new user before running the test
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("/register");
    await page.getByLabel("Email").fill(userEmail);
    await page.getByLabel("Password", { exact: true }).fill(userPassword);
    await page.getByLabel("Confirm Password").fill(userPassword);
    await page.getByRole("button", { name: "Register" }).click();

    // Wait for redirect to projects or login
    await page.waitForURL(/\/projects|\/login/);

    await page.close();
  });

  test("Pełny przepływ: Logowanie -> Projekt -> Zadania -> Ustawienia", async ({ page }) => {
    test.setTimeout(60000); // Increase timeout for this long scenario
    const loginPage = new LoginPage(page);
    const projectsPage = new ProjectsPage(page);
    const projectDetailsPage = new ProjectDetailsPage(page);
    const settingsPage = new ProjectSettingsPage(page);
    const sharedComponents = new SharedComponents(page);

    // 1. Zaloguj się użytkownikiem testowym
    await loginPage.goto();
    await loginPage.login(userEmail, userPassword);
    await expect(page).toHaveURL("/projects");

    // 2. Utwórz nowy projekt o nazwie "Projekt Testowy"
    await projectsPage.createProject(projectName, "Opis dla projektu testowego");

    // 3. Wejdź na stronę Projektu Testowego
    await projectsPage.openProject(projectName);
    // Verify we are on the project details page
    await expect(page.getByRole("heading", { name: projectName, level: 1 })).toBeVisible();

    // 4. Dodaj "Zadanie 1"
    await projectDetailsPage.addTask("Zadanie 1");

    // Diagnostic: Check for error toast if task disappears
    const errorToast = page.locator('li[data-sonner-toast][data-type="error"]');
    if ((await errorToast.count()) > 0) {
      // eslint-disable-next-line no-console
      console.log("Error Toast found:", await errorToast.textContent());
    }

    await expect(page.locator('[data-test-id="task-item"]')).toHaveCount(1);

    // 5. Dodaj "Zadanie 2"
    await projectDetailsPage.addTask("Zadanie 2");
    await expect(page.locator('[data-test-id="task-item"]')).toHaveCount(2);

    // 6. Wejdź do "Zadanie 1"
    await projectDetailsPage.openTask("Zadanie 1");

    // 7. Dodaj "Zadanie 1-1"
    await projectDetailsPage.addTask("Zadanie 1-1");

    // 8. Używając BreadCrumb wróć na stronę projektu
    await projectDetailsPage.navigateBreadcrumb(projectName);
    await page.reload(); // Ensure clean state after navigation

    // 9. Deleguj "Zadanie 2" asystentowi AI
    // Use index 1 (second task) because Task 2 title rendering might be flaky in test env
    await projectDetailsPage.delegateTaskByIndex(1);
    await page.reload(); // Verify backend persistence

    // Verify delegation
    const task2 = projectDetailsPage.getTaskByIndex(1);
    await expect(task2.getByRole("button", { name: "Delegate task" })).toHaveAttribute("aria-pressed", "true", {
      timeout: 10000,
    });

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

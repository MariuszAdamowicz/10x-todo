import { type Page, type Locator, expect } from "@playwright/test";

export class ProjectDetailsPage {
  readonly page: Page;
  readonly newTaskInput: Locator;
  readonly addTaskBtn: Locator;
  readonly taskList: Locator;
  readonly settingsLink: Locator;
  readonly breadcrumbLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTaskInput = page.getByPlaceholder("Add a new task...");
    this.addTaskBtn = page.getByRole("button", { name: "Add Task" });
    this.taskList = page.getByRole("list").filter({ hasText: "Add Task" }).or(page.locator("ul").last());
    this.settingsLink = page.getByRole("link", { name: "Project Settings" });
    this.breadcrumbLink = page.getByRole("link");
  }

  getTaskItem(title: string): Locator {
    return this.page
      .locator('[data-test-id="task-item"]')
      .filter({ has: this.page.locator('[data-test-id="task-title"]', { hasText: title }) })
      .first();
  }

  async addTask(title: string) {
    await this.newTaskInput.fill(title);

    try {
      await expect(this.addTaskBtn).toBeEnabled({ timeout: 2000 });
    } catch {
      return "";
    }

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/tasks") &&
        response.request().method() === "POST" &&
        (response.status() === 200 || response.status() === 201)
    );

    await this.newTaskInput.press("Enter");
    await responsePromise;
    await expect(this.getTaskItem(title)).toBeVisible({ timeout: 5000 });
  }

  async openTask(title: string) {
    await this.page.waitForTimeout(1000);
    const taskItem = this.getTaskItem(title);
    await expect(taskItem).toBeVisible({ timeout: 10000 });
    await taskItem.getByText(title).click();
    await this.page.waitForURL(/\/tasks\//);
  }

  async navigateBreadcrumb(name: string) {
    await this.page.getByRole("link", { name }).click();
  }

  getTaskByIndex(index: number): Locator {
    return this.page.locator('[data-test-id="task-item"]').nth(index);
  }

  async delegateTaskByIndex(index: number) {
    const task = this.getTaskByIndex(index);

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/tasks/") && response.request().method() === "PATCH" && response.status() === 200
    );

    await task.getByRole("button", { name: "Delegate task" }).click();
    await responsePromise;
  }

  async openSettings() {
    await this.settingsLink.click();
  }
}

import { type Page, type Locator, expect } from '@playwright/test';

export class ProjectDetailsPage {
  readonly page: Page;
  readonly newTaskInput: Locator;
  readonly addTaskBtn: Locator;
  readonly taskList: Locator;
  readonly settingsLink: Locator;
  readonly breadcrumbLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTaskInput = page.getByPlaceholder('Add a new task...');
    this.addTaskBtn = page.getByRole('button', { name: 'Add Task' });
    this.taskList = page.getByRole('list').filter({ hasText: 'Add Task' }).or(page.locator('ul').last());
    this.settingsLink = page.getByRole('link', { name: 'Project Settings' });
    this.breadcrumbLink = page.getByRole('link');
  }

  getTaskItem(title: string): Locator {
    return this.page.getByRole('button').filter({ hasText: title }).first();
  }

  async addTask(title: string) {
    const responsePromise = this.page.waitForResponse(response => 
      response.url().includes('/api/tasks') && 
      response.request().method() === 'POST' &&
      (response.status() === 200 || response.status() === 201)
    );

    await this.newTaskInput.fill(title);

    try {
      await expect(this.addTaskBtn).toBeEnabled({ timeout: 2000 });
    } catch (e) {
      await this.newTaskInput.fill('');
      await this.newTaskInput.fill(title);
      await expect(this.addTaskBtn).toBeEnabled();
    }

    await this.newTaskInput.press('Enter');
    await expect(this.getTaskItem(title)).toBeVisible();
    await responsePromise;
  }

  async openTask(title: string) {
    await this.page.waitForTimeout(1000);
    await this.getTaskItem(title).getByText(title).click();
    await this.page.waitForURL(/\/tasks\//);
  }

  async navigateBreadcrumb(name: string) {
    await this.page.getByRole('link', { name }).click();
  }

  async delegateTask(title: string) {
    const task = this.getTaskItem(title);
    
    const responsePromise = this.page.waitForResponse(response => 
      response.url().includes('/api/tasks/') && 
      response.request().method() === 'PATCH' &&
      response.status() === 200
    );

    await task.getByRole('button', { name: 'Delegate task' }).click();
    await responsePromise;
  }

  async openSettings() {
    await this.settingsLink.click();
  }
}
import { type Page, type Locator, expect } from '@playwright/test';

export class ProjectsPage {
  readonly page: Page;
  readonly createProjectBtn: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly submitBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createProjectBtn = page.getByRole('button', { name: 'Utwórz nowy projekt' });
    this.nameInput = page.getByLabel('Nazwa projektu');
    this.descriptionInput = page.getByLabel('Opis');
    this.submitBtn = page.getByRole('button', { name: 'Utwórz projekt' });
  }

  async goto() {
    await this.page.goto('/projects');
  }

  async createProject(name: string, description: string = '') {
    await this.createProjectBtn.click();
    
    // Retry click if modal doesn't open (handles hydration timing issues)
    try {
      await expect(this.nameInput).toBeVisible({ timeout: 4000 });
    } catch (e) {
      await this.createProjectBtn.click();
    }

    await this.nameInput.fill(name);
    if (description) {
      await this.descriptionInput.fill(description);
    }
    await this.submitBtn.click();
  }

  async openProject(name: string) {
    await this.page.getByRole('link').filter({ hasText: name }).click();
  }
}

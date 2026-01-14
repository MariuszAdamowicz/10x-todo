import { type Page, type Locator } from '@playwright/test';

export class SharedComponents {
  readonly page: Page;
  readonly userMenuTrigger: Locator;
  readonly logoutBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userMenuTrigger = page.locator('button.rounded-full');
    this.logoutBtn = page.getByRole('menuitem', { name: 'Log out' });
  }

  async logout() {
    await this.userMenuTrigger.click();
    await this.logoutBtn.click();
  }
}

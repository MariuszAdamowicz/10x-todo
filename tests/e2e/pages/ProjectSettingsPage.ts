import { type Page, type Locator, expect } from '@playwright/test';

export class ProjectSettingsPage {
  readonly page: Page;
  readonly apiKeyInput: Locator;
  readonly toggleApiKeyBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.apiKeyInput = page.getByLabel('Your API Key');
    this.toggleApiKeyBtn = page.getByRole('button', { name: /Show API Key|Hide API Key/ });
  }

  async toggleApiKeyVisibility() {
    await this.toggleApiKeyBtn.click();
  }

  async getApiKey() {
    return await this.apiKeyInput.inputValue();
  }
  
  async isApiKeyVisible() {
    const type = await this.apiKeyInput.getAttribute('type');
    return type === 'text';
  }
}

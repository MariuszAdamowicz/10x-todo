import { type Page, type Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole("textbox", { name: "Email" });
    this.passwordInput = page.getByLabel("Password");
    this.submitBtn = page.getByRole("button", { name: "Log In" });
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.click();
    await this.emailInput.pressSequentially(email, { delay: 50 });
    await this.passwordInput.click();
    await this.passwordInput.pressSequentially(password, { delay: 50 });

    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes("/api/auth/login") && response.request().method() === "POST"
    );

    await this.submitBtn.click();
    await responsePromise;
    await this.page.waitForURL(/\/projects/, { timeout: 10000 });
  }
}

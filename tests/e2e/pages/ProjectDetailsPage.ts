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
      this.taskList = page.getByRole('list').filter({ hasText: 'Add Task' }).or(page.locator('ul').last()); // Fallback to finding the list
      this.settingsLink = page.getByRole('link', { name: 'Project Settings' });
      this.breadcrumbLink = page.getByRole('link'); // Simplified for breadcrumbs
    }
  
    getTaskItem(title: string): Locator {
      // Finds the task item (li with role=button) that contains the specific title
      // Using text filter on the listitem/button role
      return this.page.getByRole('button').filter({ hasText: title }).first();
    }
  
            async addTask(title: string) {
  
              // Setup listener for the API response BEFORE triggering the action
  
              const responsePromise = this.page.waitForResponse(response => 
  
                response.url().includes('/api/tasks') && 
  
                response.request().method() === 'POST' &&
  
                (response.status() === 200 || response.status() === 201)
  
              );
  
          
  
              await this.newTaskInput.fill(title);
  
            
  
            // Ensure button becomes enabled (React state sync)
  
            try {
  
                await expect(this.addTaskBtn).toBeEnabled({ timeout: 2000 });
  
            } catch (e) {
  
                // Retry fill if state didn't update
  
                await this.newTaskInput.fill('');
  
                await this.newTaskInput.fill(title);
  
                await expect(this.addTaskBtn).toBeEnabled();
  
            }
  
        
  
            await this.newTaskInput.press('Enter');
  
            
  
            // Wait for Optimistic UI
  
            await expect(this.getTaskItem(title)).toBeVisible();
  
        
  
            // Wait for Server Persistence (Critical for next steps)
  
            await responsePromise;
  
          }        async openTask(title: string) {
          // Wait for list to be stable after potential reordering
          await this.page.waitForTimeout(1000);
          // Click the text itself to avoid clicking buttons inside
          await this.getTaskItem(title).getByText(title).click();
          await this.page.waitForURL(/\/tasks\//);
        }    async navigateBreadcrumb(name: string) {
      await this.page.getByRole('link', { name }).click();
    }
  
    async delegateTask(title: string) {
      const task = this.getTaskItem(title);
      // Toggle button usually has an aria-label "Delegate task"
      await task.getByRole('button', { name: 'Delegate task' }).click();
    }
  
    async openSettings() {
      await this.settingsLink.click();
    }
  }

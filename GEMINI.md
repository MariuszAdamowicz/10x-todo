# Gemini Project Context: 10x To-Do App

## Project Overview

This is a "10x To-Do App" designed for developers and their AI assistants. The primary goal is to create a web-based task management tool that facilitates collaboration between a human developer and an AI. Developers can create projects, manage hierarchical task lists, and delegate specific tasks to an AI assistant.

The AI assistant interacts with the application through a REST API, allowing it to read delegated tasks, create and manage its own sub-tasks, and report progress back to the developer. The developer retains full control, with the ability to approve or reject the AI's proposed changes.

## Tech Stack

@./.gemini/tech-stack.md

## Project Structure

@./.gemini/project-structure.md

## Coding Practices

@./.gemini/coding-practices.md

## Frontend

@./.gemini/frontend.md

## Backend and Database

@./.gemini/backend.md

## Database: Create migration

@./.gemini/db-supabase-migrations.md

## Building and Running

### Prerequisites

*   Node.js v22.14.0 (as specified in `.nvmrc`)
*   npm (comes with Node.js)

### Key Commands

*   **Install dependencies:**
    ```bash
    npm install
    ```
*   **Run the development server:**
    ```bash
    npm run dev
    ```
*   **Build for production:**
    ```bash
    npm run build
    ```
*   **Preview the production build:**
    ```bash
    npm run preview
    ```
*   **Lint the code:**
    ```bash
    npm run lint
    ```
*   **Fix linting errors:**
    ```bash
    npm run lint:fix
    ```
*   **Format the code:**
    ```bash
    npm run format
    ```

## Development Conventions

*   **Code Style:** The project uses Prettier for automated code formatting. The configuration can be found in `.prettierrc.json`.
*   **Linting:** ESLint is used for static code analysis, with rules defined in `eslint.config.js`. This includes plugins for Astro, React, JSX A11y, and TypeScript.
*   **TypeScript:** The project uses a strict TypeScript configuration (`"extends": "astro/tsconfigs/strict"` in `tsconfig.json`).
*   **Git Hooks:** A `pre-commit` hook is configured using Husky and `lint-staged` to automatically lint and format staged files before they are committed.
*   **AI-Assisted Development:** The repository is configured to work with AI tools like GitHub Copilot, Cursor, and Windsurf to aid in development. Guidelines are present in the `.github/`, `.cursor/`, and `.windsurfrules` files.
*   **Path Aliases:** The project uses the `@/*` alias for the `./src/*` directory, as configured in `tsconfig.json`.

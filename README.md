# 10x To-Do App

A web-based task management tool designed to facilitate effective collaboration between developers and their AI assistants. This application allows users to manage projects, create hierarchical task lists, and delegate tasks to an AI, which interacts with the system via a dedicated REST API.

## Project Description

The 10x To-Do App addresses the need for a dedicated tool that allows developers to manage and delegate tasks to their own AI scripts or assistants. Unlike traditional to-do applications, it provides an open API designed specifically for human-machine collaboration.

The core workflow involves:
- A **developer** creating projects and breaking down work into hierarchical tasks.
- The developer **delegating** specific tasks to an AI assistant.
- The **AI assistant** using a project-specific API key to fetch delegated tasks, create its own sub-tasks to track its work, and propose the completion or cancellation of the main task.
- The developer **reviewing** the AI's proposals and either approving or rejecting them, maintaining full control over the project's progress.

## Tech Stack

| Category      | Technology                                                              |
|---------------|-------------------------------------------------------------------------|
| **Frontend**  | [Astro 5](https://astro.build/), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) |
| **Styling**   | [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn/ui](https://ui.shadcn.com/) |
| **Backend**   | [Supabase](https://supabase.com/) (PostgreSQL, Authentication, BaaS)      |
| **DevOps**    | [GitHub Actions](https://github.com/features/actions) for CI/CD, [Docker](https://www.docker.com/) |
| **Tooling**   | [Node.js](https://nodejs.org/), [ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [Husky](https://typicode.github.io/husky/) |

## Getting Started Locally

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

- **Node.js**: Version **`22.14.0`** or higher is required. We recommend using a version manager like `nvm` and running `nvm use`.
- **npm**: Should be included with your Node.js installation.

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/10x-todo.git
    cd 10x-todo
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file by copying the example file. This will contain your Supabase credentials.
    ```sh
    cp .env.example .env
    ```
    Fill in the required variables in the newly created `.env` file.

4.  **Run the development server:**
    ```sh
    npm run dev
    ```

The application should now be running at `http://localhost:4321`.

## Available Scripts

The following scripts are available in `package.json`:

- `npm run dev`: Starts the Astro development server with hot-reloading.
- `npm run build`: Builds the application for production.
- `npm run preview`: Serves the production build locally for previewing.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run lint:fix`: Lints the codebase and automatically fixes issues.
- `npm run format`: Formats all files using Prettier.

## Project Scope

### Key Features (MVP)

- **User Authentication**: Secure user registration and login.
- **Project Management**: Users can create projects, each with a unique, auto-generated API key for AI authentication.
- **Hierarchical Tasks**: Create and manage nested tasks in a "drill-down" interface.
- **Task Delegation**: Assign any task to an AI assistant.
- **Task Lifecycle**: Tasks move through a defined set of statuses: `To Do`, `Done`, `Canceled`, `Pending Approval`, etc.
- **AI REST API**:
    - Authenticate using the project API key.
    - Fetch all project tasks or only those delegated to the AI.
    - Create sub-tasks for delegated tasks (one level deep).
    - Propose status changes (`Done` or `Canceled`) for delegated tasks, which require user approval.
- **User Approval System**: UI for developers to accept or reject AI proposals with comments.

### Out of Scope (for now)

The following features are not planned for the initial MVP release:

- Project sharing between multiple users.
- Advanced notifications (e.g., email, push).
- User onboarding tutorials.
- Import/export functionality.
- Integrations with third-party services.
- Mobile applications.
- Password reset functionality.

## Project Status

**Active Development**

This is a training project currently under active development. The primary goal is to build a fully functional Minimum Viable Product (MVP) that successfully implements the core user-AI interaction loop.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

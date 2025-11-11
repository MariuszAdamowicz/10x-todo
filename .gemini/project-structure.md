## Project Structure

When introducing changes to the project, always follow the directory structure below:

- `./src` - source code
- `./src/layouts` - Astro layouts
- `./src/pages` - Astro pages
- `./src/pages/api` - API endpoints
- `./src/middleware/index.ts` - Astro middleware
- `./src/db` - Supabase clients and types
- `./src/types.ts` - Shared types for backend and frontend (Entities, DTOs)
- `./src/components` - Client-side components written in Astro (static) and React (dynamic)
- `./src/components/ui` - Client-side components from Shadcn/ui
- `./src/lib` - Shared libraries, services, schemas, and helpers
  - `./src/lib/services` - Business logic services
  - `./src/lib/schemas` - Zod validation schemas
  - `./src/lib/errors.ts` - Custom error classes
  - `./src/lib/utils.ts` - Utility functions
- `./src/assets` - static internal assets
- `./public` - public assets

When modifying the directory structure, always update this section.

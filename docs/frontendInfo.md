

# Frontend Page Access and Roles

## Page List and Access Rules

- **Home.tsx** (`/`)
  - Access: All visitors (anyone who opens the website)

- **Profile.tsx** (`/profile`)
  - Access: All authenticated users (regardless of role)

- **Documents.tsx** (`/documents`)
  - Access: All authenticated users

- **Files.tsx** (`/files`)
  - Access: All authenticated users

- **Tasks.tsx** (`/tasks`)
  - Access: All authenticated users

- **AdminPanel.tsx** (`/admin`)
  - Access: Only authenticated users with role = admin

- **MentorPanel.tsx** (`/mentor`)
  - Access: Only authenticated users with role = mentor

- **NotFound.tsx** (`*`)
  - Access: Functional page, rendered for errors or non-existent routes

## Role-based Navigation

- **Visitor**: Access only to Home page
- **User/Student**: Access to Home, Profile, Documents, Files, Tasks
- **Mentor**: Access to Home, Profile, Documents, Files, Tasks, MentorPanel
- **Admin**: Access to Home, Profile, Documents, Files, Tasks, AdminPanel

Login and role detection is handled via a custom React hook (`useSession`) which fetches data from `/api/status` and stores it in the `poligon_info` cookie.

Based on the user's role, the frontend renders the appropriate pages and navigation.

## Global Font Usage

The frontend uses three custom fonts, defined in global styles:
- **Playfair Display**: Headings
- **Source Sans Pro**: Body text
- **Open Sans**: Descriptions

Font files are located in `/src/assets/fonts/` and loaded via `@font-face` in the main CSS file.

## How to run the frontend (dev & production)

- Development (monorepo): from repository root run:

```
npm run dev
```

This runs both backend and frontend concurrently (frontend dev server runs on port 5173). The frontend dev server uses Webpack Dev Server and injects the bundle in memory; do not hard-code a `<script src="dist/bundle.js"></script>` in `frontend/index.html` during development.

- Production build (frontend only):

```
cd frontend
npm run build
```

Copy the contents of `frontend/dist` to your static hosting or configure your backend to serve `frontend/dist` and return `index.html` for unknown routes (SPA fallback).

## Frontend structure (new scaffold)

- `frontend/package.json` - scripts to run dev and build
- `frontend/webpack.config.js` - webpack + devServer config (devServer on port 5173)
- `frontend/src/` - React + TypeScript source
- `frontend/src/components/` - shared components (Header, Footer, AuthModal)
- `frontend/src/pages/` - page-level components
- `frontend/src/assets/global.css` - Tailwind entry and global variables

If you need Tailwind/shadcn component scaffolding, run the shadcn CLI in the `frontend` folder after `npm install` to generate component UI templates.


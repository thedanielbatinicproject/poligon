

# Frontend Page Access, Structure & Runtime (updated)
# Frontend Page Access, Structure & Runtime

## Page list and access rules

- Home (`/`): accessible to all visitors.
- Profile (`/profile`): accessible to authenticated users.
- Documents (`/documents`): accessible to authenticated users.
- Files (`/files`): accessible to authenticated users.
- Tasks (`/tasks`): accessible to authenticated users.
- AdminPanel (`/admin`): accessible to users with role `admin`.
- MentorPanel (`/mentor`): accessible to users with role `mentor`.
- NotFound (`*`): rendered for unknown routes or 404s.

Routing and access control are determined by the current session; the frontend adapts navigation and rendered pages based on the role present in the session information.

## Role-based navigation

- Visitor: Home only.
- User/Student: Home, Profile, Documents, Files, Tasks.
- Mentor: Home, Profile, Documents, Files, Tasks, MentorPanel.
- Admin: Home, Profile, Documents, Files, Tasks, AdminPanel.

Authentication and role detection are implemented via a `SessionProvider` and the `useSession` hook. The frontend obtains session state from the backend endpoint `/api/status` and stores a small, readable cookie named `poligon_local_info` for UI convenience. The authoritative session state is held server-side in an HttpOnly cookie.

## Global fonts and styles

Font assets (if present) are located under `frontend/src/assets/fonts/` and are registered via `@font-face` in the global stylesheet. The primary stylesheet is `frontend/src/styles.css`, which contains theme tokens (light/dark) exposed as CSS variables.

Theme tokens control core color and layout properties (background, panels, text, accents, borders, feedback). Themes are applied by toggling the `data-theme="dark"` attribute on the root element. A `ThemeProvider` persists user preference in the cookie `poligon_theme`.

## Notification system

- Implementation: `frontend/src/lib/notifications.tsx` (React provider and UI components).
- Styles: `frontend/src/styles.css` (notification container and item rules).
- React API: `useNotifications()` hook providing `{ push, remove }`.
- Global helper for non-React code: `window.__pushNotification(message, durationSec?, isError?)` (registered when `NotificationsProvider` mounts).

Behavior and constraints:
- `push(message: string, durationSec?: number, isError?: boolean)` enqueues a notification and returns an identifier. If `durationSec` is omitted, duration is computed as `ceil(words / 3)` seconds with a minimum of 2 seconds.
- Notifications render in the top-right corner beneath the header and stack new items above older ones.
- Each notification auto-dismisses after its computed or configured duration. Each item includes an explicit dismiss button that triggers an exit animation before removal.
- Error notifications (`isError === true`) are styled using the theme `--danger` token and a stronger visual emphasis.
- The frontend API client is instrumented to call the global helper with backend error messages when present. This provides immediate user feedback without altering exception semantics.
- The global helper is only available after `NotificationsProvider` has mounted. To support notifications during very early bootstrap, a module-level enqueue fallback can be implemented to buffer calls until the provider is ready.

## Development and production build

Development (monorepo): from the repository root execute:

```powershell
npm run dev
```

This typically runs the backend and the frontend dev server concurrently. The frontend dev server (Vite) serves the bundle in memory (default port 5173); do not hard-code production assets during development.

Production build (frontend only):

```powershell
cd frontend
npm run build
```

Built assets are emitted to `frontend/dist` (or equivalent depending on configuration). The backend should be configured to serve these static files (commonly copied into `backend/public`) and to return `index.html` for SPA route fallback.

## Project structure (current)

- `frontend/package.json` — frontend scripts and dependencies.
- `vite.config.ts` / `vite.config.js` — dev server and build configuration.
- `frontend/src/` — React + TypeScript source files.
  - `frontend/src/main.tsx` — application entry, mounts `ThemeProvider`, `SessionProvider`, and `NotificationsProvider`.
  - `frontend/src/styles.css` — global styles and theme tokens.
  - `frontend/src/components/` — shared components (Header, Footer, AuthModal, forms).
  - `frontend/src/pages/` — page-level components.
  - `frontend/src/lib/` — utilities and hooks (session, api, theme, notifications).
  - `frontend/src/assets/` — images, fonts and static assets.

## Backend endpoints used by the frontend

- POST `/api/auth/login-local` — local login endpoint.
- POST `/api/users/register-local` — local registration endpoint.
- GET `/api/status` — session/status endpoint used by `SessionProvider`.
- POST `/api/auth/logout` — logout endpoint.
- GET `/api/auth/aaiedu` — initiates AAIedu external login flow (redirect).

The frontend API utilities are implemented in `frontend/src/lib/api.ts` and use `credentials: 'include'` so that server-issued HttpOnly session cookies are sent with requests.

## Maintenance notes

- Example notification usage from React: `const { push } = useNotifications(); push('Saved successfully')`.
- Example notification usage from non-React code (when provider is mounted): `window.__pushNotification('Server error', 5, true)`.
- If static asset 404s are observed after a production build, verify that the backend static file root points to the frontend `dist` folder and that `index.html` is served for SPA route fallback.
- To ensure notifications are available during early bootstrap, consider implementing a module-level enqueue buffer that forwards calls to the provider once it mounts.

---

Document last updated on: 2025-10-30
  - POST `/api/auth/login-local` — local login

  - POST `/api/users/register-local` — local registration

# Poligon Clean React Frontend

## Structure
- `src/components` — your reusable React components
- `src/pages` — page views (Home.js, etc.)
- `src/hooks` — custom hooks (e.g. useSession)
- `src/services` — API calls and utilities
- `src/assets` — static files, global.css

## How it works
- Entry: `src/index.js` → `src/App.js` → React Router
- Home page: `src/pages/Home.js`
- Session: `src/hooks/useSession.js` fetches `/api/status` and stores info in cookie
- API: `src/services/api.js` for backend calls
- Global styles: `src/assets/global.css`

## Role-based logic
- After login, session info is fetched from `/api/status`
- Session cookie `poligon_info` stores user_id, name, email, role, etc.
- UI can be personalized and access controlled by reading session/role
- Roles: Visitor, Student, Mentor, Admin

## Next steps
- Add more pages in `src/pages`
- Add components in `src/components`
- Use `useSession` for role-based rendering
- Connect to backend API via `src/services/api.js`

See `/docs` for backend API details and role logic.

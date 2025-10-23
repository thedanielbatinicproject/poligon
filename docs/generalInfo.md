# General Information: Poligon v2.0

## Technologies Used

### Frontend
- React (TypeScript)
- Vite
- Chakra UI
- @emotion/react, @emotion/styled
- framer-motion

### Backend
- Node.js (TypeScript)
- Express
- MariaDB (10.6.23)
- mysql2
- dotenv
- multer (file uploads)
- morgan (logging)
- express-session
- passport
- @node-saml/passport-saml (AAI@EduHr SAML authentication)
- express-validator (input validation)

### Other
- RESTful API (all endpoints in English)
- Session-based authentication & authorization
- Audit logging for document actions
- Centralized error handling

## Project Structure
- `/backend` — Express backend (API, DB, uploads, auth)
- `/frontend` — React frontend (UI, assets, hooks, services)
- `/docs` — Documentation

## Authentication Flow
- SAML 2.0 via AAI@EduHr (SRCE)
- Users are auto-created on first login
- Session-based access control

## File Uploads
- Single file per request
- Download endpoint available

## API
- Standard RESTful structure (e.g., `/api/documents`, `/api/users`, `/api/files`)
- All responses and errors in English

---
For more details, see the rest of the documentation and codebase.

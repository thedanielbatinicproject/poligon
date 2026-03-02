# General Information: Poligon

## Overview

Poligon is a collaborative LaTeX document management platform designed for academic use. It allows students, mentors (professors), and administrators to create, edit, and manage LaTeX documents in real-time. The platform eliminates the need for users to install a local LaTeX environment by providing server-side rendering through TeX Live.

The project is structured as a monorepo containing three main components: a React-based frontend, an Express backend API, and a dedicated WebSocket server for real-time collaboration.

---

## Technologies

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type-safe development |
| Vite | Build tool and development server |
| CodeMirror 6 | LaTeX code editor with syntax highlighting |
| Yjs | CRDT-based real-time collaboration |
| y-codemirror.next | Yjs bindings for CodeMirror |
| y-websocket | WebSocket provider for Yjs synchronization |
| Socket.io Client | Real-time chat and notifications |
| React Router DOM | Client-side routing |
| React Big Calendar | Calendar view for task management |
| date-fns | Date manipulation utilities |

The frontend uses custom CSS with CSS variables for theming (light/dark mode support). No CSS framework is used; all styling is hand-written and located primarily in `styles.css`.

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express | Web framework |
| TypeScript | Type-safe development |
| MySQL2 | Database driver (MariaDB/MySQL) |
| Passport | Authentication middleware |
| passport-saml | AAI@EduHr SAML 2.0 authentication |
| bcrypt | Password hashing for local accounts |
| express-session | Session management |
| express-mysql-session | Session storage in database |
| Multer | File upload handling |
| Morgan | HTTP request logging |
| Nodemailer | Email notifications |
| Yjs | Server-side CRDT document handling |
| Luxon | Date/time handling |

### Socket Server

A standalone WebSocket server handles real-time collaborative editing:

| Technology | Purpose |
|------------|---------|
| y-websocket | Yjs WebSocket server implementation |
| ws | WebSocket library |

This server runs separately from the main backend and manages document synchronization between multiple connected clients.

### LaTeX Rendering

Poligon uses a local TeX Live installation for PDF compilation:

- **Engines supported:** pdflatex, xelatex
- **Execution:** Spawned as child processes with timeout protection
- **Temporary files:** Managed in system temp directory
- **Output:** PDF buffer returned to client or stored as document version

The rendering service supports both temporary compilations (for preview) and permanent version creation.

---

## Authentication

Poligon supports two authentication methods:

### AAI@EduHr (SAML 2.0)

The primary authentication method uses SAML 2.0 through the Croatian academic identity federation (AAI@EduHr). When a user logs in:

1. The user is redirected to the AAI@EduHr identity provider
2. After successful authentication, the IdP sends a SAML assertion back to Poligon
3. The backend validates the assertion and extracts user attributes (email, name, affiliation)
4. A new user record is created automatically on first login, or the existing user is matched by email
5. A session is established and stored in the database

### Local Authentication

For users without AAI@EduHr credentials, local registration is available:

1. User registers with email, first name, and last name
2. A password is generated and sent via email
3. The user can change their password after first login
4. Local users are stored in a separate `local_users` table linked to the main `users` table

Both authentication methods use the same session mechanism. If a user registers locally and later logs in via AAI@EduHr with the same email, the accounts are linked automatically.

---

## User Roles

The platform defines four user roles with different permission levels:

| Role | Description |
|------|-------------|
| **user** | Default role assigned when affiliation cannot be determined |
| **student** | Can edit assigned documents, submit for review, manage personal tasks |
| **mentor** | Can create documents, assign editors, review submissions, grade work |
| **admin** | Full system access including user management and system configuration |

Roles are assigned automatically based on institutional affiliation or manually by administrators.

---

## Real-Time Collaboration

Poligon implements real-time collaborative editing using Yjs, a CRDT (Conflict-free Replicated Data Type) library:

- **Document synchronization:** Changes are synchronized through a dedicated WebSocket server
- **Conflict resolution:** CRDT ensures that concurrent edits are merged without conflicts
- **Persistence:** Document state is stored in the database and restored when users reconnect
- **Awareness:** Users can see collaborator cursors and presence indicators in the editor

The collaboration system consists of:
- Frontend Yjs document bound to CodeMirror editor
- y-websocket client connecting to the socket server
- Server-side state persistence in `yjs_documents` table
- Optional update history in `yjs_updates` table for debugging

---

## Document Workflow

Documents progress through a structured workflow:

```
draft -> under_review -> finished -> graded
                  └─────> submitted (to faculty)
```

| Status | Description |
|--------|-------------|
| **draft** | Initial state; document is being edited |
| **under_review** | Student submitted for mentor review; editing disabled for students |
| **finished** | Mentor approved; document is complete |
| **graded** | Mentor assigned a grade (0-100) |
| **submitted** | Sent to faculty for final processing |

Each status change is recorded in the `workflow_history` table for audit purposes.

---

## Chat System

Poligon includes a real-time messaging system:

- **Protocol:** Socket.io for bidirectional communication
- **Features:** Direct messages between users, persistent history, presence indicators
- **UI:** Draggable chat widget in the bottom-right corner (desktop only)
- **Storage:** Messages stored in `messages` table

The chat server runs as part of the main backend process on a separate port.

---

## File Management

Users can upload files associated with documents:

| File Type | Description |
|-----------|-------------|
| **image** | PNG, JPG, GIF for inclusion in documents |
| **pdf** | Reference PDFs |
| **bib** | BibTeX bibliography files |
| **tex** | Additional LaTeX files |

Files are stored on disk in the `uploads/` directory, organized by document ID. Metadata is stored in the `file_uploads` table.

---

## API Structure

All API endpoints are prefixed with `/api`:

| Route Group | Purpose |
|-------------|---------|
| `/api/auth` | Authentication (login, logout, status) |
| `/api/users` | User management |
| `/api/documents` | Document CRUD, content, versions, editors |
| `/api/files` | File upload and download |
| `/api/utility` | Tasks, messages, document types, session |
| `/api/status` | Health check |

For detailed API documentation, see [apiInfo.md](./apiInfo.md).

---

## Environment Configuration

The backend requires environment variables for configuration. Key variables include:

- Database connection (host, port, user, password, database name)
- Session secret
- SAML configuration (IdP metadata, certificate paths)
- SMTP settings for email notifications
- File upload paths
- Allowed origins for CORS

Frontend environment variables (prefixed with `VITE_`) are embedded at build time.

---

## Deployment

### Development

From the repository root:

```bash
npm run dev
```

This starts both the backend and frontend development servers concurrently.

### Production Build

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. The build output is copied to `backend/public/` via the postbuild script

3. Start the backend:
   ```bash
   cd backend
   npm run build
   npm start
   ```

4. Start the socket server:
   ```bash
   cd socket
   npm start
   ```

The backend serves the frontend static files and handles SPA route fallback.

---

## Database

Poligon uses MariaDB (compatible with MySQL). The schema includes tables for:

- Users and local authentication
- Documents and versions
- Document editors and permissions
- Workflow history
- Tasks and messages
- File uploads
- Sessions
- Yjs collaboration state
- Audit logging
- API keys

For detailed schema documentation, see [poligonDatabase.md](./poligonDatabase.md).

---

## Security Considerations

- Session cookies are HttpOnly and secured in production
- Passwords are hashed with bcrypt
- SAML assertions are validated against IdP certificates
- File uploads are validated by type and size
- SQL queries use parameterized statements
- CORS is configured for allowed origins only

---

## Browser Support

Poligon is designed for modern browsers. The platform works best on desktop devices due to the complexity of the editor interface. Mobile devices display a simplified home page with limited functionality.

---

*Last updated: December 2025*

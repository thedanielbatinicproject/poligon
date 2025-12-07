# Poligon Backend API Documentation

This document provides a complete reference for all API endpoints available in the Poligon backend. All routes are prefixed with `/api` unless otherwise noted.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Documents](#documents)
4. [Files](#files)
5. [Uploads](#uploads)
6. [Utility](#utility)
   - [Playground](#playground)
   - [Document Types](#document-types)
   - [Tasks](#tasks)
   - [Messages](#messages)
   - [Sessions](#sessions)
   - [Admin Statistics](#admin-statistics)
7. [Public Endpoints](#public-endpoints)
8. [WebSocket Events](#websocket-events)
9. [Error Handling](#error-handling)

---

## Authentication

### SAML Authentication (AAI@EduHr)

#### GET `/api/auth/login/aaieduhr`

Initiates SAML 2.0 login flow. Redirects the user to the AAI@EduHr identity provider.

**Access:** Public

**Response:** HTTP redirect to IdP

---

#### POST `/api/auth/callback/aaieduhr`

SAML assertion consumer service endpoint. Processes the SAML response from the IdP, creates or updates the user record, and establishes a session.

**Access:** Called by IdP (not directly by clients)

**Response:**
```json
{ "success": true }
```

---

### Local Authentication

#### POST `/api/auth/login-local`

Authenticates a user with email and password.

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{ "success": true }
```

**Errors:**
- `400` - Missing email or password
- `401` - Invalid credentials

---

#### GET `/api/auth/status`

Returns the current session status and user information.

**Access:** Authenticated users

**Response:**
```json
{
  "user_id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "role": "student",
  "active_sessions": ["session_id_1", "session_id_2"],
  "current_session_id": "session_id_1"
}
```

---

#### POST `/api/auth/logout`

Destroys the current session and logs out the user.

**Access:** Authenticated users

**Response:**
```json
{ "message": "Logged out" }
```

---

## Users

### GET `/api/users`

Returns all users in the system including administrators.

**Access:** Admin only

**Response:** Array of user objects

---

### GET `/api/users/all`

Returns all users except administrators.

**Access:** Admin or Mentor

**Response:** Array of user objects (excludes admin users)

---

### GET `/api/users/reduced`

Returns a reduced user list for messaging purposes. Contains only essential fields (user_id, name, email).

**Access:** Authenticated users

**Response:** Array of reduced user objects

**Note:** Admins and mentors see admin users in the list; other users do not.

---

### POST `/api/users`

Creates a new user.

**Access:** Admin only

**Request Body:**
```json
{
  "principal_name": "user@edu.hr",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student",
  "preferred_language": "hr"
}
```

**Response:** Created user object

---

### PUT `/api/users/:user_id`

Updates a user's information.

**Access:** Admin (any user) or the user themselves (limited fields)

**Request Body:** Fields to update

**Note:** Non-admin users cannot modify `email` or `role` fields.

---

### DELETE `/api/users/:user_id`

Deletes a user from the system.

**Access:** Admin only

**Note:** Admins cannot delete other admin users.

---

### GET `/api/users/check/:user_id`

Returns detailed information for a specific user.

**Access:** Admin, Mentor, or the user themselves

---

### PUT `/api/users/bulk-role`

Updates the role for multiple users at once.

**Access:** Admin only

**Request Body:**
```json
{
  "user_ids": [1, 2, 3],
  "new_role": "student"
}
```

---

### POST `/api/users/register-local`

Registers a new local user account.

**Access:** Public

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com"
}
```

**Response:** 
```json
{ "success": true, "user_id": 1 }
```

**Note:** A random password is generated and sent to the user's email.

---

### POST `/api/users/local-change-password`

Changes the password for a local user account.

**Access:** Admin (any user) or the user themselves

**Request Body:**
```json
{
  "user_id": 1,
  "new_password": "newPassword123"
}
```

---

### POST `/api/users/resend-password`

Generates a new password and sends it to a specified email address.

**Access:** Admin only

**Request Body:**
```json
{
  "user_id": 1,
  "recipient_email": "alternate@example.com"
}
```

**Note:** This also logs out the user from all active sessions.

---

### GET `/api/users/:user_id/has-local`

Checks if a user has a local authentication entry.

**Access:** Admin only

**Response:**
```json
{ "has_local": true }
```

---

### GET `/api/users/sessions/:user_id`

Returns all active sessions for a specific user.

**Access:** Admin only

---

### DELETE `/api/users/sessions/:user_id`

Deletes all sessions for a user (force logout).

**Access:** Admin only

---

## Documents

### POST `/api/documents`

Creates a new document.

**Access:** Admin or Mentor

**Request Body:**
```json
{
  "type_id": 1,
  "title": "My Thesis",
  "abstract": "This thesis explores..."
}
```

---

### GET `/api/documents/all`

Returns all documents accessible to the current user (as owner, editor, mentor, or viewer).

**Access:** Authenticated users

---

### DELETE `/api/documents/:document_id`

Deletes a document.

**Access:** Admin (any document) or Mentor (owned documents only)

---

### PUT `/api/documents/:document_id`

Updates document metadata.

**Access:** Depends on field:
- Title, status, language, grade: Mentor only
- Abstract, latex_content: Mentor, Editor, or Owner

---

### GET `/api/documents/:document_id/content`

Returns the LaTeX content of a document.

**Access:** Editor, Owner, or Mentor of the document

---

### PUT `/api/documents/:document_id/content`

Updates the LaTeX content of a document.

**Access:** Editor, Owner, or Mentor of the document

**Request Body:**
```json
{
  "latex_content": "\\documentclass{article}..."
}
```

---

### GET `/api/documents/:document_id/hash`

Returns an encoded hash for public document sharing.

**Access:** Authenticated users

**Response:**
```json
{ "hash": "abc123xyz" }
```

---

### GET `/api/documents/:document_id/images`

Lists all uploaded images for a document.

**Access:** Editor, Owner, Mentor, or Admin

**Response:**
```json
{
  "images": [
    { "name": "figure1.png", "size": 12345, "url": "/api/uploads/1/figure1.png" }
  ]
}
```

---

### Editor Management

#### POST `/api/documents/:document_id/editors`

Adds an editor to a document.

**Access:** Owner or Admin

**Request Body:**
```json
{
  "user_id": 2,
  "editor_role": "editor"
}
```

**Valid roles:** `editor`, `viewer`, `mentor`

---

#### DELETE `/api/documents/:document_id/editors`

Removes an editor from a document.

**Access:** Owner or Admin

**Request Body:**
```json
{ "user_id": 2 }
```

---

#### GET `/api/documents/:document_id/editors`

Returns all editors for a document.

**Access:** Admin or any editor/viewer of the document

---

#### PUT `/api/documents/:document_id/editors/role`

Changes an editor's role on a document.

**Access:** Admin or Mentor with higher privileges

**Request Body:**
```json
{
  "user_id": 2,
  "new_role": "mentor"
}
```

---

### Rendering

#### POST `/api/documents/:document_id/render`

Triggers a permanent PDF render of the document. Creates a new document version.

**Access:** Mentor of the document or Admin

**Response:**
```json
{ "message": "Local render job started." }
```

---

#### GET `/api/documents/:document_id/render/status`

Checks if a render is currently in progress for a document.

**Access:** Authenticated users

**Response:**
```json
{ "rendering": true }
```

---

#### POST `/api/documents/:document_id/compile-temp`

Triggers a temporary compilation for preview purposes. Does not create a version.

**Access:** Editor, Owner, Mentor, or Admin

**Request Body:**
```json
{
  "latex_content": "\\documentclass{article}..."
}
```

**Response:**
```json
{ "success": true, "pdf": "temp-compile-2024-01-01-BY-1.pdf" }
```

**Note:** Only one temporary compile can run at a time per document (group lock).

---

#### GET `/api/documents/:document_id/compile-temp-latest`

Returns information about the most recent temporary compilation.

**Access:** Editor, Owner, Mentor, or Admin

**Response:**
```json
{
  "pdf": "temp-compile-2024-01-01-BY-1.pdf",
  "compiled_by": 1,
  "compiled_at": "2024-01-01T12-00-00",
  "url": "/api/uploads/1/temp/temp-compile-2024-01-01-BY-1.pdf"
}
```

---

### Versions

#### GET `/api/documents/:document_id/versions`

Returns all versions (permanent renders) of a document.

**Access:** Admin or any editor/viewer of the document

---

#### GET `/api/documents/:document_id/versions/:version_id/download`

Downloads the compiled PDF for a specific version.

**Access:** Admin or any editor/viewer of the document

---

### Workflow

#### PUT `/api/documents/:document_id/status`

Changes the workflow status of a document.

**Access:** Admin or Mentor of the document

**Request Body:**
```json
{ "status": "under_review" }
```

**Valid statuses:** `draft`, `submitted`, `under_review`, `finished`, `graded`

---

#### PUT `/api/documents/:document_id/grade`

Assigns a grade to a document.

**Access:** Mentor of the document only

**Request Body:**
```json
{ "grade": 85 }
```

---

#### GET `/api/documents/:document_id/workflow`

Returns the workflow history for a document.

**Access:** Admin or any editor/viewer of the document

---

### Audit

#### GET `/api/documents/:document_id/audit-log`

Returns the audit log for a specific document.

**Access:** Admin, Editor, Owner, or Mentor of the document

---

#### GET `/api/documents/audit-log`

Returns all audit logs in the system.

**Access:** Admin only

---

### Statistics

#### GET `/api/documents/renders/count`

Returns the total number of document renders (versions) in the system.

**Access:** Admin only

**Response:**
```json
{ "total_renders": 150 }
```

---

## Files

### POST `/api/files/upload/image`

Uploads an image file associated with a document.

**Access:** Authenticated users

**Request:** `multipart/form-data` with:
- `file` - The image file
- `document_id` - Target document ID

**Supported formats:** PNG, JPG, GIF, WebP, BMP, TIFF

---

### POST `/api/files/upload/document`

Uploads a document file (PDF, BibTeX, or TeX).

**Access:** Authenticated users

**Request:** `multipart/form-data` with:
- `file` - The document file
- `document_id` - Target document ID

**Supported formats:** PDF, BIB, TEX

---

### GET `/api/files/:file_id`

Returns metadata for a specific file.

**Access:** Authenticated users

---

### GET `/api/files/document/:document_id`

Lists all files attached to a document.

**Access:** Admin, Owner, Editor, or Mentor of the document

---

### DELETE `/api/files/:file_id`

Deletes a file from the system.

**Access:** Admin, the uploader, or a Mentor of the associated document

---

### GET `/api/files/download/:file_id`

Downloads a file.

**Access:** Admin or the uploader

---

## Uploads

### GET `/api/uploads/:document_id/:filename`

Serves an uploaded file (images, documents) with access control.

**Access:** Admin, Owner, Editor, or Mentor of the document

---

### GET `/api/uploads/:document_id/temp/:filename`

Serves a temporary compilation PDF.

**Access:** Admin, Owner, Editor, or Mentor of the document

---

## Utility

### Playground

#### POST `/api/utility/playground/compile`

Compiles LaTeX content and returns the PDF directly.

**Access:** Public (with rate limiting for unauthenticated users)

**Request Body:**
```json
{ "content": "\\documentclass{article}..." }
```

**Response:** Binary PDF data

**Rate Limit:** 15 renders per day per IP for unauthenticated users

---

#### POST `/api/utility/playground/render`

Checks if a render is allowed (rate limit check) without actually rendering.

**Access:** Public

**Response:**
```json
{ "allowed": true, "count": 5, "limit": 15 }
```

---

#### GET `/api/utility/playground/renders`

Returns the current render count for the requesting IP.

**Access:** Public

**Response:**
```json
{ "count": 5, "limit": 15 }
```

For authenticated users:
```json
{ "unlimited": true }
```

---

### Document Types

#### GET `/api/utility/document-types`

Returns all available document types.

**Access:** Authenticated users

---

#### POST `/api/utility/document-types`

Creates a new document type.

**Access:** Admin only

**Request Body:**
```json
{
  "type_name": "Bachelor Thesis",
  "description": "Undergraduate thesis document"
}
```

---

#### PUT `/api/utility/document-types/:type_id`

Updates a document type.

**Access:** Admin only

---

#### DELETE `/api/utility/document-types/:type_id`

Deletes a document type.

**Access:** Admin only

---

### Tasks

#### POST `/api/utility/tasks`

Creates a new task.

**Access:** Authenticated users (with document permission check if document_id provided)

**Request Body:**
```json
{
  "task_title": "Review Chapter 1",
  "task_description": "Check formatting and citations",
  "assigned_to": 2,
  "document_id": 1,
  "from": "2024-01-01T09:00:00Z",
  "due": "2024-01-15T17:00:00Z"
}
```

---

#### PUT `/api/utility/tasks/:task_id`

Updates a task.

**Access:** 
- Admin/Mentor: Can edit any field
- Task creator: Can edit any field
- Assigned user: Can only change `task_status`

---

#### DELETE `/api/utility/tasks/:task_id`

Deletes a task.

**Access:** Admin, task creator, or document creator

---

#### GET `/api/utility/tasks/document/:document_id`

Returns all tasks for a specific document.

**Access:** Admin/Mentor see all; others see only tasks they created or are assigned to

---

#### GET `/api/utility/tasks/user`

Returns all tasks for the current user.

**Access:** Authenticated users (Admin/Mentor see all global tasks)

---

#### GET `/api/utility/tasks/user/:user_id`

Returns all tasks for a specific user.

**Access:** Admin only

---

### Messages

#### POST `/api/utility/messages`

Sends a message to another user.

**Access:** Authenticated users

**Request Body:**
```json
{
  "receiver_id": 2,
  "message_content": "Hello, how are you?"
}
```

**Note:** Message is also emitted via Socket.io to the receiver.

---

#### DELETE `/api/utility/messages/:message_id`

Deletes a message.

**Access:** Admin or the message sender

---

#### GET `/api/utility/messages/partners`

Returns a list of user IDs with whom the current user has message history.

**Access:** Authenticated users

---

#### GET `/api/utility/messages/:user_id`

Returns all messages between the current user and the specified user.

**Access:** Authenticated users

---

### Sessions

#### POST `/api/utility/session`

Updates session attributes for the current user.

**Access:** Authenticated users

**Request Body (all fields optional):**
```json
{
  "last_route": "/documents",
  "last_document_id": 1,
  "editor_cursor_position": 150,
  "editor_scroll_line": 25,
  "scroll_position": 500,
  "sidebar_state": "open",
  "theme": "dark"
}
```

---

#### GET `/api/utility/session/:session_id`

Returns metadata for a specific session.

**Access:** Session owner or Admin

---

#### DELETE `/api/utility/session/:session_id`

Deletes a specific session (logout from that device).

**Access:** Session owner or Admin

---

### Admin Statistics

#### GET `/api/utility/storage`

Returns storage statistics (database and folder sizes).

**Access:** Admin only

**Response:**
```json
{
  "database_size": "150 MB",
  "folder_size": "2.5 GB"
}
```

---

#### GET `/api/utility/sessions/count`

Returns the count of active sessions.

**Access:** Admin only

**Response:**
```json
{ "active_sessions": 45 }
```

---

#### GET `/api/utility/sessions/all`

Returns all active sessions with user information.

**Access:** Admin only

---

#### GET `/api/utility/render-service/status`

Checks the availability of the LaTeX render service.

**Access:** Admin only

---

#### GET `/api/utility/admin-info`

Returns the administrator contact email.

**Access:** Public

**Response:**
```json
{ "email": "admin@poligon.live" }
```

---

## Public Endpoints

These endpoints are served directly from the Express app, not under `/api`.

### GET `/metadata`

Returns SAML Service Provider metadata in XML format.

**Access:** Public

---

### GET `/sp`

Returns the SAML Service Provider Entity ID.

**Access:** Public

---

### GET `/d/:hashCode`

Public document sharing endpoint. Serves the latest compiled PDF for a document.

**Access:** Public

**Parameters:**
- `hashCode` - Encoded document identifier

**Query Parameters:**
- `download=1` - Force download instead of inline display

**Behavior:**
- For bots/crawlers: Returns HTML with Open Graph meta tags
- For browsers: Serves PDF inline or renders a preview page

---

### GET `/api/status`

Health check endpoint with session and user information.

**Access:** Authenticated users

**Response:**
```json
{
  "status": "ok",
  "time": "2024-01-01T12:00:00.000Z",
  "session": { ... },
  "user": { ... }
}
```

---

## WebSocket Events

The backend uses Socket.io for real-time communication.

### Client to Server

#### `register_user`
Registers a user in their personal room for receiving messages.

**Payload:** `{ user_id: number }`

---

#### `send_message`
Sends a chat message (handled via REST API, but triggers socket events).

---

### Server to Client

#### `receive_message`
Emitted when a new message is received.

**Payload:**
```json
{
  "message_id": 1,
  "sender_id": 1,
  "receiver_id": 2,
  "message_content": "Hello!",
  "sent_at": "2024-01-01T12:00:00.000Z"
}
```

---

#### `message_deleted`
Emitted when a message is deleted.

**Payload:**
```json
{
  "message_id": 1,
  "sender_id": 1,
  "receiver_id": 2
}
```

---

#### `document:temp-compile:started`
Emitted when a temporary compile starts.

**Payload:**
```json
{
  "document_id": 1,
  "started_by": 1
}
```

---

#### `document:temp-compile:finished`
Emitted when a temporary compile finishes.

**Payload:**
```json
{
  "document_id": 1,
  "success": true,
  "started_by": 1
}
```

---

## Error Handling

All API endpoints return errors in a consistent JSON format:

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)"
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request (invalid input) |
| `401` | Not authenticated |
| `403` | Not authorized (insufficient permissions) |
| `404` | Resource not found |
| `409` | Conflict (e.g., duplicate resource, compile in progress) |
| `413` | File too large |
| `415` | Unsupported file type |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## Authentication Notes

- Most endpoints require authentication via session cookie
- Session cookies are HttpOnly and managed by express-session
- Frontend should use `credentials: 'include'` for all API requests
- Session duration is set to 5 years by default
- Multiple active sessions per user are supported

---

## Rate Limiting

Currently, rate limiting is only implemented for the playground render endpoint:
- Unauthenticated users: 15 renders per day per IP address
- Authenticated users: Unlimited renders

---

*Last updated: December 2025*

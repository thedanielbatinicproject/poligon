# Database Schema Documentation

## Overview

This database supports a document management and collaboration platform built around LaTeX document editing. It includes user management with dual authentication (AAI@EduHr federation and local accounts), document lifecycle handling with workflow states, real-time collaborative editing via Yjs CRDT, version control, task management with calendar integration, direct messaging, comprehensive audit logging, and persistent session management.

**Database Engine:** MariaDB 10.11+ (InnoDB)  
**Character Set:** utf8mb4 with unicode_ci collation

---

## Table: `users`

Stores information about all platform users. This is the central user table referenced by most other tables in the schema.

| Column             | Type                                              | Constraints | Description |
|--------------------|---------------------------------------------------|-------------|-------------|
| user_id            | INT UNSIGNED                                      | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier. |
| principal_name     | VARCHAR(255)                                      | NOT NULL, UNIQUE | SSO/AAI identifier for federated login (e.g., `user@edu.hr`). |
| first_name         | VARCHAR(100)                                      | NOT NULL | User's first name. |
| last_name          | VARCHAR(100)                                      | NOT NULL | User's last name. |
| email              | VARCHAR(255)                                      | NOT NULL, UNIQUE | Email address used for notifications and local login. |
| role               | ENUM('user', 'student', 'mentor', 'admin')        | NOT NULL, DEFAULT 'user' | User access role determining permissions. |
| preferred_language | ENUM('hr', 'en')                                  | DEFAULT 'hr' | Language preference for UI localization. |
| affiliation        | VARCHAR(255)                                      | NULL | User's institution or organization (from AAI attributes). |
| display_name       | VARCHAR(255)                                      | NULL | Optional display name for UI (overrides first_name + last_name). |
| created_at         | DATETIME                                          | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Account creation timestamp. |
| updated_at         | DATETIME                                          | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last profile update timestamp. |

**Role Descriptions:**
- `user` - Basic access, can use playground only
- `student` - Can create and edit documents, participate in collaboration
- `mentor` - Can review documents, assign grades, manage students
- `admin` - Full system access including user management

**Indexes:**
- PRIMARY KEY on `user_id`
- UNIQUE on `principal_name` - ensures one account per AAI identity
- UNIQUE on `email` - ensures one account per email address

**Referenced By:**
- `documents.created_by`
- `document_editors.user_id`, `document_editors.added_by`
- `document_versions.edited_by`
- `workflow_history.changed_by`
- `file_uploads.uploaded_by`
- `tasks.created_by`, `tasks.assigned_to`
- `messages.sender_id`, `messages.receiver_id`
- `audit_log.user_id`
- `api_keys.user_id`
- `sessions.user_id`
- `local_users.user_id`

---

## Table: `local_users`

Stores local login credentials for users who do not use AAI@EduHr federation. Each row extends a user from the `users` table with password-based authentication.

| Column        | Type                                      | Constraints | Description |
|---------------|-------------------------------------------|-------------|-------------|
| user_id       | INT UNSIGNED                              | PRIMARY KEY, FOREIGN KEY | Reference to the user in `users` table. |
| email         | VARCHAR(255)                              | NOT NULL, UNIQUE | Email address for local login (must match `users.email`). |
| password_hash | VARCHAR(255)                              | NOT NULL | Bcrypt-hashed password. |
| created_at    | DATETIME                                  | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Local credentials creation timestamp. |
| updated_at    | DATETIME                                  | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last password change timestamp. |

**Foreign Keys:**
- `user_id` → `users.user_id` ON DELETE CASCADE

**Notes:**
- Enables parallel existence of AAI and local users
- All user metadata is stored in `users` table; this table only holds authentication data
- Password is hashed using bcrypt with salt rounds
- When the parent user is deleted, local credentials are automatically removed

---

## Table: `document_types`

Defines categories for documents. Used to classify documents by purpose (thesis, seminar paper, report, etc.).

| Column       | Type                                      | Constraints | Description |
|--------------|-------------------------------------------|-------------|-------------|
| type_id      | INT UNSIGNED                              | PRIMARY KEY, AUTO_INCREMENT | Unique type identifier. |
| type_name    | VARCHAR(50)                               | NOT NULL, UNIQUE | Name of the document type (e.g., "Diplomski rad", "Seminar"). |
| description  | TEXT                                      | NULL | Extended description or metadata for the type. |

**Indexes:**
- PRIMARY KEY on `type_id`
- UNIQUE on `type_name` - prevents duplicate type definitions

**Referenced By:**
- `documents.type_id`

---

## Table: `documents`

Core table representing LaTeX documents created by users. Stores document metadata, content, compilation results, and workflow state.

| Column            | Type                                                              | Constraints | Description |
|-------------------|-------------------------------------------------------------------|-------------|-------------|
| document_id       | INT UNSIGNED                                                      | PRIMARY KEY, AUTO_INCREMENT | Unique document identifier. |
| type_id           | INT UNSIGNED                                                      | NOT NULL, FOREIGN KEY | References `document_types.type_id`. |
| title             | VARCHAR(255)                                                      | NOT NULL | Document title. |
| abstract          | TEXT                                                              | NULL | Short summary or description of the document. |
| latex_content     | LONGTEXT                                                          | NULL | Current LaTeX source code of the document. |
| compiled_pdf_path | VARCHAR(255)                                                      | NULL | Relative path to the most recently compiled PDF file. |
| status            | ENUM('draft', 'submitted', 'under_review', 'finished', 'graded')  | NOT NULL, DEFAULT 'draft' | Current workflow state of the document. |
| language          | ENUM('hr', 'en')                                                  | DEFAULT 'hr' | Document language (affects compilation settings). |
| grade             | TINYINT UNSIGNED                                                  | NULL | Grade assigned by mentor (1-5 scale, NULL if not graded). |
| created_by        | INT UNSIGNED                                                      | NOT NULL, FOREIGN KEY | References `users.user_id` - original document creator. |
| created_at        | DATETIME                                                          | NOT NULL | Document creation timestamp. |
| updated_at        | DATETIME                                                          | NOT NULL | Last modification timestamp. |

**Workflow States:**
- `draft` - Document is being written, not yet submitted
- `submitted` - Author has submitted for review
- `under_review` - Mentor is reviewing the document
- `finished` - Review complete, document finalized
- `graded` - Grade has been assigned

**Foreign Keys:**
- `type_id` → `document_types.type_id`
- `created_by` → `users.user_id`

**Indexes:**
- PRIMARY KEY on `document_id`
- INDEX on `type_id`
- INDEX on `created_by`

**Referenced By:**
- `document_editors.document_id`
- `document_versions.document_id`
- `workflow_history.document_id`
- `file_uploads.document_id`
- `tasks.document_id`
- `sessions.last_document_id`
- `yjs_documents.document_id`
- `yjs_updates.document_id`

---

## Table: `document_editors`

Junction table defining access permissions for users on documents. Implements role-based access control for document collaboration.

| Column       | Type                                                 | Constraints | Description |
|--------------|------------------------------------------------------|-------------|-------------|
| document_id  | INT UNSIGNED                                         | PRIMARY KEY (composite), FOREIGN KEY | References `documents.document_id`. |
| user_id      | INT UNSIGNED                                         | PRIMARY KEY (composite), FOREIGN KEY | References `users.user_id`. |
| role         | ENUM('owner', 'editor', 'viewer', 'mentor')          | NOT NULL, DEFAULT 'viewer' | Permission level for this user on this document. |
| added_by     | INT UNSIGNED                                         | NULL, FOREIGN KEY | User who granted this permission (NULL if system-assigned). |
| added_at     | DATETIME                                             | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Timestamp when permission was granted. |

**Editor Roles:**
- `owner` - Full control, can delete document and manage all editors
- `editor` - Can modify document content and upload files
- `viewer` - Read-only access to document
- `mentor` - Can review, comment, and grade the document

**Primary Key:** Composite (`document_id`, `user_id`) - ensures one role per user per document

**Foreign Keys:**
- `document_id` → `documents.document_id` ON DELETE CASCADE
- `user_id` → `users.user_id` ON DELETE CASCADE
- `added_by` → `users.user_id` ON DELETE SET NULL

**Indexes:**
- `idx_de_user` on `user_id` - speeds up "documents for user" queries
- `idx_de_document` on `document_id` - speeds up "editors for document" queries

---

## Table: `document_versions`

Tracks version history of documents. Each version captures a complete snapshot of the LaTeX content at a specific point in time.

| Column            | Type                                      | Constraints | Description |
|-------------------|-------------------------------------------|-------------|-------------|
| version_id        | INT UNSIGNED                              | PRIMARY KEY, AUTO_INCREMENT | Unique version identifier. |
| document_id       | INT UNSIGNED                              | NOT NULL, FOREIGN KEY | References `documents.document_id`. |
| version_number    | INT UNSIGNED                              | NOT NULL | Sequential version number within the document (1, 2, 3...). |
| edited_by         | INT UNSIGNED                              | NOT NULL, FOREIGN KEY | References `users.user_id` who created this version. |
| latex_snapshot    | LONGTEXT                                  | NOT NULL | Complete LaTeX source code at this version. |
| compiled_pdf_path | VARCHAR(255)                              | NULL | Path to compiled PDF for this specific version. |
| edited_at         | DATETIME                                  | NOT NULL | Timestamp when this version was created. |

**Foreign Keys:**
- `document_id` → `documents.document_id` ON DELETE CASCADE
- `edited_by` → `users.user_id`

**Indexes:**
- PRIMARY KEY on `version_id`
- INDEX on `document_id`
- INDEX on `edited_by`

**Notes:**
- Versions are created manually by users (explicit save points), not automatically on every edit
- The current working content is in `documents.latex_content`; versions are historical snapshots
- When a document is deleted, all its versions are automatically removed

---

## Table: `workflow_history`

Audit trail for document status changes. Records every transition in the document workflow lifecycle.

| Column       | Type                                                              | Constraints | Description |
|--------------|-------------------------------------------------------------------|-------------|-------------|
| workflow_id  | INT UNSIGNED                                                      | PRIMARY KEY, AUTO_INCREMENT | Unique workflow event identifier. |
| document_id  | INT UNSIGNED                                                      | NOT NULL, FOREIGN KEY | References `documents.document_id`. |
| status       | ENUM('draft', 'submitted', 'under_review', 'finished', 'graded')  | NOT NULL | The new status that was applied. |
| changed_by   | INT UNSIGNED                                                      | NOT NULL, FOREIGN KEY | References `users.user_id` who made the change. |
| changed_at   | DATETIME                                                          | NOT NULL | Timestamp of the status change. |

**Foreign Keys:**
- `document_id` → `documents.document_id`
- `changed_by` → `users.user_id`

**Indexes:**
- PRIMARY KEY on `workflow_id`
- INDEX on `document_id`
- INDEX on `changed_by`

**Notes:**
- Each row represents one status transition
- Full history allows tracking document progress and identifying bottlenecks
- Used by the audit log modal to show document lifecycle timeline

---

## Table: `file_uploads`

Stores metadata for files uploaded and associated with documents. Files can be images, PDFs, bibliography files, or additional TeX files.

| Column       | Type                                                | Constraints | Description |
|--------------|-----------------------------------------------------|-------------|-------------|
| file_id      | INT UNSIGNED                                        | PRIMARY KEY, AUTO_INCREMENT | Unique file identifier. |
| document_id  | INT UNSIGNED                                        | NOT NULL, FOREIGN KEY | References `documents.document_id`. |
| uploaded_by  | INT UNSIGNED                                        | NOT NULL, FOREIGN KEY | References `users.user_id`. |
| file_path    | VARCHAR(255)                                        | NOT NULL | Relative path to file on disk (within uploads directory). |
| file_name    | VARCHAR(255)                                        | NOT NULL | Original filename as uploaded by user. |
| file_type    | ENUM('image', 'pdf', 'bib', 'tex')                  | NOT NULL | Category of the uploaded file. |
| file_size    | INT UNSIGNED                                        | NOT NULL | File size in bytes. |
| uploaded_at  | DATETIME                                            | NOT NULL | Upload timestamp. |

**File Types:**
- `image` - PNG, JPG, SVG images for inclusion in document
- `pdf` - PDF files for reference or inclusion
- `bib` - BibTeX bibliography files
- `tex` - Additional TeX files (packages, includes)

**Foreign Keys:**
- `document_id` → `documents.document_id` ON DELETE CASCADE
- `uploaded_by` → `users.user_id`

**Indexes:**
- PRIMARY KEY on `file_id`
- INDEX on `document_id`
- INDEX on `uploaded_by`

**Notes:**
- Actual files are stored on disk; this table tracks metadata only
- File path is relative to the uploads directory structure: `uploads/{document_id}/`
- When a document is deleted, file records are removed (actual files should be cleaned by application)

---

## Table: `tasks`

Represents tasks with calendar integration. Tasks can be standalone or linked to specific documents.

| Column           | Type                                      | Constraints | Description |
|------------------|-------------------------------------------|-------------|-------------|
| task_id          | INT UNSIGNED                              | PRIMARY KEY, AUTO_INCREMENT | Unique task identifier. |
| created_by       | INT UNSIGNED                              | NOT NULL, FOREIGN KEY | References `users.user_id` - task creator. |
| assigned_to      | INT UNSIGNED                              | NULL, FOREIGN KEY | References `users.user_id` - assigned user (NULL if unassigned). |
| document_id      | INT UNSIGNED                              | NULL, FOREIGN KEY | References `documents.document_id` - related document (optional). |
| task_title       | VARCHAR(255)                              | NOT NULL | Short title of the task. |
| task_description | TEXT                                      | NULL | Detailed task description or instructions. |
| task_status      | ENUM('open', 'closed')                    | NOT NULL, DEFAULT 'open' | Current task status. |
| created_at       | DATETIME                                  | NOT NULL | Task creation timestamp. |
| updated_at       | DATETIME                                  | NOT NULL | Last modification timestamp. |
| task_from        | DATETIME                                  | NOT NULL | Task start date/time (for calendar display). |
| task_due         | DATETIME                                  | NULL | Task deadline (NULL if no deadline). |

**Foreign Keys:**
- `created_by` → `users.user_id`
- `assigned_to` → `users.user_id`
- `document_id` → `documents.document_id`

**Indexes:**
- PRIMARY KEY on `task_id`
- INDEX on `created_by`
- INDEX on `assigned_to`
- INDEX on `document_id`

**Notes:**
- Tasks appear on the user's calendar between `task_from` and `task_due` dates
- Tasks linked to documents provide quick navigation to related work
- Both creator and assignee can view and modify tasks

---

## Table: `messages`

Direct user-to-user messaging system for platform communication.

| Column          | Type                                      | Constraints | Description |
|-----------------|-------------------------------------------|-------------|-------------|
| message_id      | INT UNSIGNED                              | PRIMARY KEY, AUTO_INCREMENT | Unique message identifier. |
| sender_id       | INT UNSIGNED                              | NOT NULL, FOREIGN KEY | References `users.user_id` - message author. |
| receiver_id     | INT UNSIGNED                              | NOT NULL, FOREIGN KEY | References `users.user_id` - message recipient. |
| message_content | TEXT                                      | NOT NULL | Message text content. |
| sent_at         | DATETIME                                  | NOT NULL | Timestamp when message was sent. |

**Foreign Keys:**
- `sender_id` → `users.user_id`
- `receiver_id` → `users.user_id`

**Indexes:**
- PRIMARY KEY on `message_id`
- `idx_messages_sender_sentat` on (`sender_id`, `sent_at`) - optimizes sender's sent messages queries
- `idx_messages_receiver_sentat` on (`receiver_id`, `sent_at`) - optimizes inbox/received messages queries

**Notes:**
- Messages are one-to-one (no group messaging)
- Frontend displays conversations grouped by the other participant
- Composite indexes support efficient pagination and ordering by time

---

## Table: `audit_log`

Comprehensive audit trail for tracking all significant user actions. Used for accountability and debugging.

| Column           | Type                                                                  | Constraints | Description |
|------------------|-----------------------------------------------------------------------|-------------|-------------|
| audit_id         | INT UNSIGNED                                                          | PRIMARY KEY, AUTO_INCREMENT | Unique log entry identifier. |
| user_id          | INT UNSIGNED                                                          | NOT NULL, FOREIGN KEY | References `users.user_id` who performed the action. |
| action_type      | ENUM('edit', 'submit', 'grade', 'comment', 'upload', 'compile', 'delete', 'create') | NOT NULL | Type of action performed. |
| entity_type      | ENUM('document', 'file', 'task')                                      | NOT NULL | Type of entity affected by the action. |
| entity_id        | INT UNSIGNED                                                          | NOT NULL | ID of the affected entity (document_id, file_id, or task_id). |
| action_timestamp | DATETIME                                                              | NOT NULL | When the action occurred. |

**Action Types:**
- `create` - New entity was created
- `edit` - Entity content was modified
- `submit` - Document was submitted for review
- `grade` - Document was graded by mentor
- `comment` - Comment was added (future use)
- `upload` - File was uploaded
- `compile` - Document was compiled to PDF
- `delete` - Entity was deleted

**Foreign Keys:**
- `user_id` → `users.user_id`

**Indexes:**
- PRIMARY KEY on `audit_id`
- INDEX on `user_id`

**Notes:**
- Does not use foreign key to entity tables (entity may be deleted while keeping audit record)
- Provides complete traceability for compliance and debugging
- Displayed in the Audit Log modal for document history

---

## Table: `api_keys`

Manages API access tokens for external integrations and programmatic access.

| Column       | Type                                              | Constraints | Description |
|--------------|---------------------------------------------------|-------------|-------------|
| api_key_id   | INT UNSIGNED                                      | PRIMARY KEY, AUTO_INCREMENT | API key record identifier. |
| user_id      | INT UNSIGNED                                      | NOT NULL, FOREIGN KEY | References `users.user_id` - key owner. |
| api_key      | VARCHAR(255)                                      | NOT NULL, UNIQUE | The actual API key token (hashed or plain). |
| access_type  | ENUM('external', 'student', 'teacher', 'admin')   | NOT NULL | Scope/permission level of the API key. |
| created_at   | DATETIME                                          | NOT NULL | Key creation timestamp. |
| expires_at   | DATETIME                                          | NULL | Key expiration (NULL for non-expiring keys). |

**Access Types:**
- `external` - Limited external integration access
- `student` - Student-level API permissions
- `teacher` - Teacher/mentor-level API permissions
- `admin` - Full administrative API access

**Foreign Keys:**
- `user_id` → `users.user_id`

**Indexes:**
- PRIMARY KEY on `api_key_id`
- UNIQUE on `api_key`
- INDEX on `user_id`

**Notes:**
- API keys provide stateless authentication for programmatic access
- Each user can have multiple API keys with different scopes
- Expired keys should be checked at authentication time

---

## Table: `sessions`

Stores active user sessions with full editor state persistence. Enables seamless session restoration across browser sessions.

| Column                 | Type                                      | Constraints | Description |
|------------------------|-------------------------------------------|-------------|-------------|
| session_id             | VARCHAR(128)                              | PRIMARY KEY | Unique session token (generated by express-session). |
| user_id                | INT UNSIGNED                              | NOT NULL, FOREIGN KEY | References `users.user_id`. |
| session_data           | LONGTEXT                                  | NOT NULL, CHECK (json_valid) | Serialized session data (JSON format). |
| last_route             | VARCHAR(255)                              | NULL | Last visited route/page path. |
| last_document_id       | INT UNSIGNED                              | NULL, FOREIGN KEY | References `documents.document_id` - last opened document. |
| editor_cursor_position | INT                                       | DEFAULT 0 | Cursor position in CodeMirror editor. |
| editor_scroll_line     | INT                                       | DEFAULT 0 | Scroll line position in editor. |
| scroll_position        | INT                                       | DEFAULT 0 | Page scroll position. |
| sidebar_state          | ENUM('open', 'closed')                    | DEFAULT 'open' | Sidebar visibility state. |
| theme                  | ENUM('light', 'dark', 'auto')             | DEFAULT 'light' | User's theme preference. |
| user_agent             | TEXT                                      | NULL | Browser/client user agent string. |
| ip_address             | VARCHAR(45)                               | NULL | Client IP address (supports IPv6). |
| created_at             | DATETIME                                  | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Session creation timestamp. |
| last_activity          | DATETIME                                  | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last activity timestamp. |
| expires_at             | DATETIME                                  | NOT NULL | Session expiration timestamp. |

**Foreign Keys:**
- `user_id` → `users.user_id` ON DELETE CASCADE
- `last_document_id` → `documents.document_id` ON DELETE SET NULL

**Indexes:**
- PRIMARY KEY on `session_id`
- `idx_user_id` on `user_id` - speeds up user's active sessions lookup
- `idx_expires_at` on `expires_at` - speeds up expired session cleanup
- `idx_last_activity` on `last_activity` - speeds up activity-based queries

**Notes:**
- Session data is stored as validated JSON
- Editor state (cursor, scroll) is persisted for seamless resumption
- IP address field supports both IPv4 and IPv6 (45 chars for IPv6-mapped IPv4)
- Expired sessions are cleaned up by scheduled background job
- When user is deleted, all their sessions are automatically removed

---

## Table: `visitor_renders`

Rate limiting table for anonymous playground usage. Tracks render counts by IP address and date.

| Column       | Type                | Constraints | Description |
|--------------|---------------------|-------------|-------------|
| ip           | VARCHAR(45)         | PRIMARY KEY (composite) | Visitor IP address (supports IPv4/IPv6). |
| render_date  | DATE                | PRIMARY KEY (composite) | Date of renders (YYYY-MM-DD). |
| count        | INT UNSIGNED        | NOT NULL, DEFAULT 1 | Number of renders performed on this date. |

**Primary Key:** Composite (`ip`, `render_date`) - one row per IP per day

**Notes:**
- Enforces daily render limit for anonymous users (e.g., 15 renders per day)
- Counter is incremented atomically on each playground render
- Old entries can be safely pruned after expiration
- No foreign keys - completely standalone rate limiting table

---

## Table: `yjs_documents`

Stores the current Yjs CRDT state for real-time collaborative editing. Contains the merged state of all client edits.

| Column       | Type                                      | Constraints | Description |
|--------------|-------------------------------------------|-------------|-------------|
| document_id  | INT UNSIGNED                              | PRIMARY KEY, FOREIGN KEY | References `documents.document_id`. |
| yjs_state    | LONGBLOB                                  | NOT NULL | Binary Y.Doc state vector (compressed CRDT data). |
| updated_at   | DATETIME                                  | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last state update timestamp. |

**Foreign Keys:**
- `document_id` → `documents.document_id` ON DELETE CASCADE

**Notes:**
- One-to-one relationship with `documents` table
- Stores the complete Yjs document state as a binary blob
- State is loaded when users connect for collaborative editing
- Updated periodically as clients sync changes through WebSocket
- Automatically deleted when parent document is removed

---

## Table: `yjs_updates`

Stores incremental Yjs update deltas. Provides granular change history for debugging and potential history replay.

| Column       | Type                                      | Constraints | Description |
|--------------|-------------------------------------------|-------------|-------------|
| update_id    | INT UNSIGNED                              | PRIMARY KEY, AUTO_INCREMENT | Unique update identifier. |
| document_id  | INT UNSIGNED                              | NOT NULL, FOREIGN KEY | References `documents.document_id`. |
| yjs_update   | BLOB                                      | NOT NULL | Binary delta update (incremental change). |
| created_at   | DATETIME                                  | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Update timestamp. |

**Foreign Keys:**
- `document_id` → `documents.document_id` ON DELETE CASCADE

**Indexes:**
- PRIMARY KEY on `update_id`
- `idx_yjs_document_created` on (`document_id`, `created_at`) - optimizes history queries

**Notes:**
- Many-to-one relationship with `documents`
- Each row represents one incremental change (delta) to the document
- Can be used to reconstruct document state at any point in time
- Useful for debugging synchronization issues
- May be periodically compacted by merging old updates into `yjs_documents.yjs_state`

---

## Entity Relationship Summary

```
users (1) ──────────────────────────────────────────┐
   │                                                 │
   ├──< local_users (1:1 optional)                  │
   │                                                 │
   ├──< documents (1:N as created_by)               │
   │        │                                        │
   │        ├──< document_editors (N:M junction) ───┘
   │        │        └── users
   │        │
   │        ├──< document_versions (1:N)
   │        │        └── edited_by → users
   │        │
   │        ├──< workflow_history (1:N)
   │        │        └── changed_by → users
   │        │
   │        ├──< file_uploads (1:N)
   │        │        └── uploaded_by → users
   │        │
   │        ├──< tasks (1:N optional)
   │        │        ├── created_by → users
   │        │        └── assigned_to → users
   │        │
   │        ├──< yjs_documents (1:1)
   │        │
   │        └──< yjs_updates (1:N)
   │
   ├──< sessions (1:N)
   │        └── last_document_id → documents
   │
   ├──< messages (N:N self-referencing)
   │        ├── sender_id → users
   │        └── receiver_id → users
   │
   ├──< tasks (1:N as created_by, 1:N as assigned_to)
   │
   ├──< audit_log (1:N)
   │
   └──< api_keys (1:N)

document_types (1) ──< documents (1:N)

visitor_renders (standalone rate limiting)
```

---

## Cascade Delete Behavior

When entities are deleted, the following cascades occur:

| Parent Table | Child Table | On Delete |
|--------------|-------------|-----------|
| users | local_users | CASCADE |
| users | sessions | CASCADE |
| users | document_editors | CASCADE |
| documents | document_editors | CASCADE |
| documents | document_versions | CASCADE |
| documents | file_uploads | CASCADE |
| documents | yjs_documents | CASCADE |
| documents | yjs_updates | CASCADE |
| documents | sessions.last_document_id | SET NULL |
| users | document_editors.added_by | SET NULL |

---

## Index Strategy

The schema includes both primary key indexes and additional indexes optimized for common query patterns:

**User Lookups:**
- `users.principal_name` UNIQUE - SSO login lookup
- `users.email` UNIQUE - local login and notification lookup

**Document Queries:**
- `documents.type_id` - filter by document type
- `documents.created_by` - user's documents list
- `document_editors.user_id` - documents accessible to user
- `document_editors.document_id` - document's editor list

**Message Queries:**
- `messages(sender_id, sent_at)` - sent messages with time ordering
- `messages(receiver_id, sent_at)` - received messages with time ordering

**Session Management:**
- `sessions.user_id` - user's active sessions
- `sessions.expires_at` - cleanup expired sessions
- `sessions.last_activity` - idle session detection

**Yjs Collaboration:**
- `yjs_updates(document_id, created_at)` - document update history

---

## Data Types Notes

- **VARCHAR(45)** for IP addresses supports full IPv6 notation (39 chars) plus IPv6-mapped IPv4
- **LONGTEXT** for LaTeX content supports documents up to 4GB
- **LONGBLOB** for Yjs state supports large CRDT structures
- **ENUM** types enforce valid values at database level
- **JSON CHECK** constraint on session_data ensures valid JSON storage
- **DATETIME** used throughout for timezone-aware timestamps

# Database Schema Documentation

## Overview

This database supports a document management and collaboration platform. It includes user management, document lifecycle handling, versioning, task assignments, messaging, audit logging, and session management.

---

## Table: `users`

Stores information about all platform users.

| Column             | Type                                              | Description |
|--------------------|---------------------------------------------------|-------------|
| user_id            | INT UNSIGNED, PRIMARY KEY, AUTO_INCREMENT         | Unique user identifier. |
| first_name         | VARCHAR(100), NOT NULL                            | User's first name. |
| last_name          | VARCHAR(100), NOT NULL                            | User's last name. |
| email              | VARCHAR(255), NOT NULL, UNIQUE                    | Email address (must be unique). |
| role               | ENUM('user', 'student', 'mentor', 'admin')        | User access role. Default is `user`. |
| preferred_language | ENUM('hr', 'en')                                  | Language preference for UI. Default is `hr`. |
| created_at         | DATETIME, NOT NULL                                | Account creation timestamp. |
| updated_at         | DATETIME, NOT NULL                                | Last update timestamp. |

**Relationships:**
- Referenced by `documents.created_by`, `document_versions.edited_by`, `messages.sender_id`, `messages.receiver_id`, `tasks.created_by`, `tasks.assigned_to`, `audit_log.user_id`, `api_keys.user_id`, `sessions.user_id`, etc.

---

## Table: `document_types`

Defines categories for documents (e.g., thesis, report).

| Column       | Type                                      | Description |
|--------------|-------------------------------------------|-------------|
| type_id      | INT UNSIGNED, PRIMARY KEY, AUTO_INCREMENT | Unique type identifier. |
| type_name    | VARCHAR(50), NOT NULL, UNIQUE             | Name of the document type. |
| description  | TEXT                                      | Description or metadata for the type. |

**Relationships:**
- Referenced by `documents.type_id`.

---

## Table: `documents`

Represents a document created by a user.

| Column             | Type                                                              | Description |
|--------------------|-------------------------------------------------------------------|-------------|
| document_id        | INT UNSIGNED, PRIMARY KEY, AUTO_INCREMENT                         | Unique document identifier. |
| type_id            | INT UNSIGNED, FOREIGN KEY                                         | References `document_types.type_id`. |
| title              | VARCHAR(255), NOT NULL                                            | Document title. |
| abstract           | TEXT                                                              | Short summary or description. |
| latex_content      | LONGTEXT                                                          | Main LaTeX content. |
| compiled_pdf_path  | VARCHAR(255)                                                      | File path of the compiled PDF. |
| status             | ENUM('draft', 'submitted', 'under_review', 'finished', 'graded') | Current document status. |
| language           | ENUM('hr', 'en')                                                  | Language of the document. |
| grade              | TINYINT UNSIGNED                                                  | Optional grade if applicable. |
| created_by         | INT UNSIGNED, FOREIGN KEY                                         | References `users.user_id`. |
| created_at         | DATETIME, NOT NULL                                                | Creation timestamp. |
| updated_at         | DATETIME, NOT NULL                                                | Last update timestamp. |

**Relationships:**
- One-to-many with `document_versions`.
- Many-to-many with users through `document_editors`.
- Many-to-many with mentors through `document_mentors`.
- Referenced by `tasks.document_id`, `file_uploads.document_id`, `workflow_history.document_id`.

---

## Table: `document_mentors`

Links mentors to documents (many-to-many relationship).

| Column       | Type               | Description |
|--------------|---------------------|-------------|
| document_id  | INT UNSIGNED, FK    | References `documents.document_id`. |
| mentor_id    | INT UNSIGNED, FK    | References `users.user_id`. |

**Primary Key:** (`document_id`, `mentor_id`)

---

## Table: `document_editors`

Defines editing permissions for users on documents.

| Column       | Type                                                 | Description |
|--------------|------------------------------------------------------|-------------|
| document_id  | INT UNSIGNED, FK                                     | References `documents.document_id`. |
| user_id      | INT UNSIGNED, FK                                     | References `users.user_id`. |
| role         | ENUM('owner','editor','viewer')                      | Editing or viewing role. |
| added_by     | INT UNSIGNED, FK (nullable)                          | User who granted the permission. |
| added_at     | DATETIME, DEFAULT CURRENT_TIMESTAMP                  | Timestamp when the permission was added. |

**Primary Key:** (`document_id`, `user_id`)

---

## Table: `document_versions`

Tracks version history of documents.

| Column          | Type                                      | Description |
|-----------------|-------------------------------------------|-------------|
| version_id      | INT UNSIGNED, PRIMARY KEY, AUTO_INCREMENT | Unique version ID. |
| document_id     | INT UNSIGNED, FK                         | References `documents.document_id`. |
| version_number  | INT UNSIGNED, NOT NULL                   | Incremental version number. |
| edited_by       | INT UNSIGNED, FK                         | References `users.user_id`. |
| latex_snapshot  | LONGTEXT, NOT NULL                       | Snapshot of LaTeX content at this version. |
| compiled_pdf_path | VARCHAR(255)                           | Path to compiled PDF of this version. |
| edited_at       | DATETIME, NOT NULL                       | Timestamp of edit. |

---

## Table: `workflow_history`

Tracks status changes of documents over time.

| Column       | Type                                                              | Description |
|--------------|-------------------------------------------------------------------|-------------|
| workflow_id  | INT UNSIGNED, PRIMARY KEY, AUTO_INCREMENT                         | Unique workflow event ID. |
| document_id  | INT UNSIGNED, FK                                                 | References `documents.document_id`. |
| status       | ENUM('draft', 'submitted', 'under_review', 'finished', 'graded') | New status applied. |
| changed_by   | INT UNSIGNED, FK                                                 | References `users.user_id`. |
| changed_at   | DATETIME, NOT NULL                                               | Timestamp of the status change. |

---

## Table: `audit_log`

Stores all significant user actions for traceability.

| Column         | Type                                                  | Description |
|----------------|-------------------------------------------------------|-------------|
| audit_id       | INT UNSIGNED, PRIMARY KEY, AUTO_INCREMENT             | Unique log entry ID. |
| user_id        | INT UNSIGNED, FK                                      | References `users.user_id`. |
| action_type    | ENUM('edit', 'submit', 'grade', 'comment', 'upload', 'compile') | Type of action performed. |
| entity_type    | ENUM('document', 'file', 'task')                      | Affected entity type. |
| entity_id      | INT UNSIGNED                                          | ID of the affected entity. |
| action_timestamp | DATETIME, NOT NULL                                  | When the action occurred. |

---

## Table: `tasks`

Represents tasks created within the system.

| Column         | Type                                      | Description |
|----------------|-------------------------------------------|-------------|
| task_id        | INT UNSIGNED, PRIMARY KEY, AUTO_INCREMENT | Task identifier. |
| created_by     | INT UNSIGNED, FK                         | Task creator (`users.user_id`). |
| assigned_to    | INT UNSIGNED, FK (nullable)              | Assigned user. |
| document_id    | INT UNSIGNED, FK (nullable)              | Optional related document. |
| task_title     | VARCHAR(255), NOT NULL                   | Title of the task. |
| task_description | TEXT                                   | Detailed task description. |
| task_status    | ENUM('open', 'closed')                   | Status (open/closed). |
| created_at     | DATETIME, NOT NULL                       | Creation timestamp. |
| updated_at     | DATETIME, NOT NULL                       | Last update timestamp. |

---

## Table: `messages`

User-to-user messages.

| Column         | Type                                      | Description |
|----------------|-------------------------------------------|-------------|
| message_id     | INT UNSIGNED, PRIMARY KEY, AUTO_INCREMENT | Unique message ID. |
| sender_id      | INT UNSIGNED, FK                         | References `users.user_id`. |
| receiver_id    | INT UNSIGNED, FK                         | References `users.user_id`. |
| message_content| TEXT, NOT NULL                           | Message text content. |
| sent_at        | DATETIME, NOT NULL                       | Timestamp of sending. |

---

## Table: `file_uploads`

Stores file metadata linked to documents.

| Column       | Type                                                | Description |
|--------------|-----------------------------------------------------|-------------|
| file_id      | INT UNSIGNED, PRIMARY KEY, AUTO_INCREMENT           | File identifier. |
| document_id  | INT UNSIGNED, FK                                    | References `documents.document_id`. |
| uploaded_by  | INT UNSIGNED, FK                                    | References `users.user_id`. |
| file_path    | VARCHAR(255), NOT NULL                              | Location of the file on disk. |
| file_type    | ENUM('image', 'pdf', 'bib', 'tex')                  | Type of file uploaded. |
| file_size    | INT UNSIGNED, NOT NULL                              | File size in bytes. |
| uploaded_at  | DATETIME, NOT NULL                                  | Timestamp of upload. |

---

## Table: `api_keys`

Manages user API access.

| Column       | Type                                      | Description |
|--------------|-------------------------------------------|-------------|
| api_key_id   | INT UNSIGNED, PRIMARY KEY, AUTO_INCREMENT | API key identifier. |
| user_id      | INT UNSIGNED, FK                         | References `users.user_id`. |
| api_key      | VARCHAR(255), NOT NULL, UNIQUE           | The actual API key token. |
| access_type  | ENUM('external', 'student', 'teacher', 'admin') | Scope of access. |
| created_at   | DATETIME, NOT NULL                       | Creation timestamp. |
| expires_at   | DATETIME (nullable)                      | Expiration datetime. |

---

## Table: `sessions`

Stores active user sessions and editor states.

| Column                | Type                                      | Description |
|-----------------------|-------------------------------------------|-------------|
| session_id            | VARCHAR(128), PRIMARY KEY                | Unique session token. |
| user_id               | INT UNSIGNED, FK                         | Logged-in user ID. |
| session_data          | JSON, NOT NULL                           | Serialized session information. |
| last_route            | VARCHAR(255)                             | Last visited route/page. |
| last_document_id      | INT UNSIGNED, FK (nullable)              | References `documents.document_id`. |
| editor_cursor_position| INT DEFAULT 0                            | Cursor position in editor. |
| editor_scroll_line    | INT DEFAULT 0                            | Editor scroll position. |
| scroll_position       | INT DEFAULT 0                            | UI scroll location. |
| sidebar_state         | ENUM('open', 'closed') DEFAULT 'open'    | UI sidebar state. |
| theme                 | ENUM('light', 'dark', 'auto') DEFAULT 'light' | UI theme preference. |
| user_agent            | TEXT                                      | Browser user agent data. |
| ip_address            | VARCHAR(45)                               | IP address of the session. |
| created_at            | DATETIME DEFAULT CURRENT_TIMESTAMP        | Session creation time. |
| last_activity         | DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last user action. |
| expires_at            | DATETIME, NOT NULL                        | Expiration time. |

---

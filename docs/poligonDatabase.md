# Database Schema Documentation

## Overview

This documentation describes the structure of the database for a collaborative document management system. It includes user roles, documents, versioning, workflow history, tasks, messages, session tracking, and audit logging.

---

## 1. Users

Stores all registered users.

| Column              | Type                                    | Description |
|---------------------|------------------------------------------|-------------|
| id                  | INT, PK                                 | Unique user identifier |
| first_name          | VARCHAR                                 | First name |
| last_name           | VARCHAR                                 | Last name |
| email               | VARCHAR, UNIQUE                         | Unique email address |
| role                | ENUM('user','student','mentor','admin') | Defines user permissions |
| preferred_language  | VARCHAR                                 | Preferred UI or document language |
| created_at          | TIMESTAMP                               | Record creation time |
| updated_at          | TIMESTAMP                               | Last update time |

**Relationships:**
- One-to-many with **Documents** (author).
- Many-to-many with **Documents** via `Document_mentors` and `Document_editors`.
- One-to-many with **Tasks**, **Messages**, **Api_keys**, **File_uploads**, **Audit_log**, and **Workflow_history**.

---

## 2. Document_types

Defines types or categories of documents.

| Column      | Type        | Description |
|-------------|-------------|-------------|
| id          | INT, PK     | Unique identifier |
| type_name   | VARCHAR     | Name of the document type |
| description | TEXT        | Description or purpose of this type |

**Relationships:**
- One-to-many with **Documents**

---

## 3. Documents

Main entity representing documents created by users.

| Column        | Type        | Description |
|---------------|-------------|-------------|
| id            | INT, PK     | Document ID |
| title         | VARCHAR     | Document title |
| abstract      | TEXT        | Summary of content |
| content_latex | LONGTEXT    | Raw LaTeX source |
| pdf_path      | VARCHAR     | Compiled PDF file path |
| status        | ENUM('draft','submitted','under_review','finished','graded') | Workflow state |
| language      | VARCHAR     | Language of the document |
| grade         | INT, NULL   | Optional grade |
| author_id     | INT, FK -> Users(id) | Author of the document |
| type_id       | INT, FK -> Document_types(id) | Document type |
| created_at    | TIMESTAMP   | Creation timestamp |
| updated_at    | TIMESTAMP   | Last modification timestamp |

**Relationships:**
- Many-to-one with **Users** and **Document_types**
- Many-to-many with **Users** via `Document_mentors` and `Document_editors`
- One-to-many with **Document_versions**, **Workflow_history**, **Tasks**, **File_uploads**, **Audit_log**

---

## 4. Document_mentors

Links mentors to documents.

| Column      | Type          | Description |
|-------------|---------------|-------------|
| document_id | INT, FK -> Documents(id) | Document reference |
| mentor_id   | INT, FK -> Users(id)     | Mentor assigned |
| assigned_at | TIMESTAMP     | Time of assignment |

**Relationship:** Many-to-many (Users ↔ Documents)

---

## 5. Document_editors

Stores additional access permissions for users.

| Column      | Type                                     | Description |
|-------------|-------------------------------------------|-------------|
| document_id | INT, FK -> Documents(id)                 | Document |
| user_id     | INT, FK -> Users(id)                     | User with access |
| role        | ENUM('owner','editor','viewer')          | Access level |
| granted_by  | INT, FK -> Users(id)                     | Who granted permissions |
| granted_at  | TIMESTAMP                                | Timestamp |

---

## 6. Document_versions

Tracks version history for documents.

| Column            | Type        | Description |
|-------------------|-------------|-------------|
| id                | INT, PK     | Unique version ID |
| document_id       | INT, FK -> Documents(id) | Document |
| version_number    | INT         | Version index |
| content_snapshot  | LONGTEXT    | LaTeX content snapshot |
| pdf_path          | VARCHAR     | PDF for this version |
| editor_id         | INT, FK -> Users(id) | Editor of this version |
| created_at        | TIMESTAMP   | Version timestamp |

---

## 7. Workflow_history

Logs changes in document status.

| Column         | Type        | Description |
|----------------|-------------|-------------|
| id             | INT, PK     | Record ID |
| document_id    | INT, FK -> Documents(id) | Document |
| previous_status| ENUM        | Old status |
| new_status     | ENUM        | New status |
| changed_by     | INT, FK -> Users(id) | User who changed the status |
| changed_at     | TIMESTAMP   | Timestamp |

---

## 8. Audit_log

Records significant user actions.

| Column       | Type        | Description |
|--------------|-------------|-------------|
| id           | INT, PK     | Log ID |
| user_id      | INT, FK -> Users(id) | Actor |
| entity_type  | VARCHAR     | Entity type (document/file/task) |
| entity_id    | INT         | Related entity |
| action       | VARCHAR     | Action (edit/upload/compile/etc.) |
| description  | TEXT        | Additional data |
| created_at   | TIMESTAMP   | Timestamp |

---

## 9. Tasks

Task system related to documents.

| Column       | Type        | Description |
|--------------|-------------|-------------|
| id           | INT, PK     | Task ID |
| creator_id   | INT, FK -> Users(id) | Creator |
| assignee_id  | INT, FK -> Users(id) | Assigned user |
| document_id  | INT, FK -> Documents(id) | Related document |
| title        | VARCHAR     | Title |
| description  | TEXT        | Details |
| status       | ENUM('open','closed') | Task state |
| created_at   | TIMESTAMP   | Created |
| updated_at   | TIMESTAMP   | Updated |

---

Would you like me to include **Messages**, **File_uploads**, **Api_keys**, **Sessions**, or an **ER diagram section** as well?

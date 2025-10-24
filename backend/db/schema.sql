-- SQL template za kreiranje baze podataka
-- Zalijepite ovaj kod u SQL editor phpMyAdmin-a

-- USERS
CREATE TABLE users (
  user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role ENUM('user', 'student', 'mentor', 'admin') NOT NULL DEFAULT 'user',
  preferred_language ENUM('hr', 'en') DEFAULT 'hr',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DOCUMENT TYPES
CREATE TABLE document_types (
  type_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type_name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DOCUMENTS
CREATE TABLE documents (
  document_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  abstract TEXT,
  latex_content LONGTEXT,
  compiled_pdf_path VARCHAR(255),
  status ENUM('draft', 'submitted', 'under_review', 'finished', 'graded') NOT NULL DEFAULT 'draft',
  language ENUM('hr', 'en') DEFAULT 'hr',
  grade TINYINT UNSIGNED,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (type_id) REFERENCES document_types(type_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DOCUMENT EDITORS (many-to-many: documents <-> users)
CREATE TABLE IF NOT EXISTS document_editors (
  document_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  role ENUM('owner','editor','viewer', 'mentor') NOT NULL DEFAULT 'viewer',
  added_by INT UNSIGNED DEFAULT NULL,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id, user_id),
  INDEX idx_de_user (user_id),
  INDEX idx_de_document (document_id),
  CONSTRAINT fk_de_document FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
  CONSTRAINT fk_de_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_de_added_by FOREIGN KEY (added_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DOCUMENT VERSIONS
CREATE TABLE document_versions (
  version_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  document_id INT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  edited_by INT UNSIGNED NOT NULL,
  latex_snapshot LONGTEXT NOT NULL,
  compiled_pdf_path VARCHAR(255),
  edited_at DATETIME NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
  FOREIGN KEY (edited_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- WORKFLOW HISTORY
CREATE TABLE workflow_history (
  workflow_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  document_id INT UNSIGNED NOT NULL,
  status ENUM('draft', 'submitted', 'under_review', 'finished', 'graded') NOT NULL,
  changed_by INT UNSIGNED NOT NULL,
  changed_at DATETIME NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(document_id),
  FOREIGN KEY (changed_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AUDIT LOG
CREATE TABLE audit_log (
  audit_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  action_type ENUM('edit', 'submit', 'grade', 'comment', 'upload', 'compile', 'delete', 'create') NOT NULL,
  entity_type ENUM('document', 'file', 'task') NOT NULL,
  entity_id INT UNSIGNED NOT NULL,
  action_timestamp DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TASKS
CREATE TABLE tasks (
  task_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_by INT UNSIGNED NOT NULL,
  assigned_to INT UNSIGNED DEFAULT NULL,
  document_id INT UNSIGNED DEFAULT NULL,
  task_title VARCHAR(255) NOT NULL,
  task_description TEXT,
  task_status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(user_id),
  FOREIGN KEY (assigned_to) REFERENCES users(user_id),
  FOREIGN KEY (document_id) REFERENCES documents(document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MESSAGES
CREATE TABLE messages (
  message_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_id INT UNSIGNED NOT NULL,
  receiver_id INT UNSIGNED NOT NULL,
  message_content TEXT NOT NULL,
  sent_at DATETIME NOT NULL,
  FOREIGN KEY (sender_id) REFERENCES users(user_id),
  FOREIGN KEY (receiver_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FILE UPLOADS
CREATE TABLE file_uploads (
  file_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  document_id INT UNSIGNED NOT NULL,
  uploaded_by INT UNSIGNED NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_type ENUM('image', 'pdf', 'bib', 'tex') NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  uploaded_at DATETIME NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API KEYS
CREATE TABLE api_keys (
  api_key_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  api_key VARCHAR(255) NOT NULL UNIQUE,
  access_type ENUM('external', 'student', 'teacher', 'admin') NOT NULL,
  created_at DATETIME NOT NULL,
  expires_at DATETIME DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SESSIONS
CREATE TABLE sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  session_data JSON NOT NULL,
  last_route VARCHAR(255),
  last_document_id INT UNSIGNED DEFAULT NULL,
  editor_cursor_position INT DEFAULT 0,
  editor_scroll_line INT DEFAULT 0,
  scroll_position INT DEFAULT 0,
  sidebar_state ENUM('open', 'closed') DEFAULT 'open',
  theme ENUM('light', 'dark', 'auto') DEFAULT 'light',
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_last_activity (last_activity),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (last_document_id) REFERENCES documents(document_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
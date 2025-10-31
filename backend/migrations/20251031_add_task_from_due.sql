-- Migration: add task_from (NOT NULL) and task_due (NULLABLE) to tasks table
-- Run this against your MySQL database (development only)

ALTER TABLE tasks
  ADD COLUMN task_from DATETIME NOT NULL AFTER task_description,
  ADD COLUMN task_due DATETIME NULL AFTER task_from;

-- Optional: create an index on task_from/task_due for calendar queries
CREATE INDEX idx_tasks_task_from ON tasks (task_from);
CREATE INDEX idx_tasks_task_due ON tasks (task_due);

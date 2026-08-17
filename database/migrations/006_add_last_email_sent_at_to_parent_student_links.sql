-- Migration 006: Add last_email_sent_at column to parent_student_links table
ALTER TABLE parent_student_links ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE parent_student_links ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE parent_student_links ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

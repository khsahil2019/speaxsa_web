-- Migration 002: Add linked_at, created_at, and last_email_sent_at columns to parent_student_links table
ALTER TABLE parent_student_links ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE parent_student_links ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE parent_student_links ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ DEFAULT NOW();

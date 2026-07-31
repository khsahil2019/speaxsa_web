-- Migration 004: Safe ALTER TABLE for signature_image column
DO $$ 
BEGIN
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS signature_image TEXT;
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS teacher_checklist JSONB DEFAULT '{}';
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS agreement_signed BOOLEAN DEFAULT false;
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS digital_signature VARCHAR(255);
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS availability TEXT;
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS item_approvals JSONB DEFAULT '{}';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Notice on teacher_sop alter in migration 004: %', SQLERRM;
END $$;

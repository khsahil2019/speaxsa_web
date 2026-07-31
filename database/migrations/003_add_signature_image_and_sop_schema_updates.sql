-- Migration 003: Add signature_image and SOP/certificate schema updates with permission exception handling
DO $$ 
BEGIN
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS teacher_checklist JSONB DEFAULT '{}';
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS agreement_signed BOOLEAN DEFAULT false;
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS digital_signature VARCHAR(255);
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS availability TEXT;
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS item_approvals JSONB DEFAULT '{}';
  ALTER TABLE teacher_sop ADD COLUMN IF NOT EXISTS signature_image TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Notice on teacher_sop alter: %', SQLERRM;
END $$;

-- Ensure teacher_certificates table exists with all required columns
CREATE TABLE IF NOT EXISTS teacher_certificates (
  id VARCHAR(100) PRIMARY KEY,
  teacher_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
  certificate_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT TRUE,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  verified_by VARCHAR(100),
  digital_signature VARCHAR(255)
);

DO $$ 
BEGIN
  ALTER TABLE teacher_certificates ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;
  ALTER TABLE teacher_certificates ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE teacher_certificates ADD COLUMN IF NOT EXISTS verified_by VARCHAR(100);
  ALTER TABLE teacher_certificates ADD COLUMN IF NOT EXISTS digital_signature VARCHAR(255);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Notice on teacher_certificates alter: %', SQLERRM;
END $$;

DO $$ 
BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_plain VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS qualification VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS subject_expertise VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS languages VARCHAR(255);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS board VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS grade VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS student_code VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_level VARCHAR(50) DEFAULT NULL;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS alt_email VARCHAR(200);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(50);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS learning_streak INT DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS impersonated_by VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(150);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(150);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_ifsc_code VARCHAR(50);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Notice on users alter: %', SQLERRM;
END $$;

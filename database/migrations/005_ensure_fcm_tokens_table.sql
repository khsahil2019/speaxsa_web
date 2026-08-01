-- Migration 005: Ensure fcm_tokens table & unique constraint
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  device_type VARCHAR(30) DEFAULT 'web',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fcm_tokens_user_id_token_key'
  ) THEN
    ALTER TABLE fcm_tokens ADD CONSTRAINT fcm_tokens_user_id_token_key UNIQUE (user_id, token);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

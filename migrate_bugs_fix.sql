-- ============================================================
-- On A Daily Logs Bug-Fix Migration
-- Run this in your Supabase SQL editor ONCE
-- ============================================================

-- ── Bug #2: Fix deposits.method CHECK constraint ──────────────
-- Allows 'oxapay' and 'nowpayments' as valid deposit methods
ALTER TABLE deposits DROP CONSTRAINT IF EXISTS deposits_method_check;
ALTER TABLE deposits ADD CONSTRAINT deposits_method_check
  CHECK (method IN ('bitcoin', 'usdt', 'oxapay', 'nowpayments'));

-- ── Bug #3: Reveal tokens table (replaces in-memory Map) ──────
-- Serverless-safe: tokens survive across Vercel function instances
CREATE TABLE IF NOT EXISTS reveal_tokens (
  token       VARCHAR(64)  PRIMARY KEY,
  order_id    UUID         NOT NULL REFERENCES orders(id)  ON DELETE CASCADE,
  user_id     UUID         NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ  NOT NULL,
  used        BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reveal_tokens_user_order
  ON reveal_tokens (user_id, order_id, created_at);

-- ── Bug #7: Password reset tokens table ───────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token       VARCHAR(64)  PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ  NOT NULL,
  used        BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens (user_id);

-- ── Cleanup job: auto-purge expired tokens ────────────────────
-- (Optional: run periodically via pg_cron or a scheduled function)
-- DELETE FROM reveal_tokens       WHERE expires_at < NOW() - INTERVAL '1 day';
-- DELETE FROM password_reset_tokens WHERE expires_at < NOW() - INTERVAL '1 day';

SELECT 'Migration applied successfully ✅' AS result;

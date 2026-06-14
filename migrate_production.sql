-- ============================================================
-- On A Daily Logs — Production Migration Script
-- Run ONCE on your live database after deployment.
-- Usage: psql $DATABASE_URL -f migrate_production.sql
-- ============================================================

-- ── 1. Credential access audit columns on orders ────────────────────────────
-- Tracks WHO accessed credentials and WHEN (IP + timestamp).
-- Added as nullable so existing rows are unaffected.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS credentials_accessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS credentials_access_ip   VARCHAR(64);

-- ── 2. Index for quick admin audit lookups ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_cred_access
  ON orders(credentials_accessed_at)
  WHERE credentials_accessed_at IS NOT NULL;

-- ── 3. Fix schema.sql stock comment (cosmetic) ───────────────────────────────
-- The stock column comment says "-1 means unlimited" but the app now
-- enforces stock >= 1. This is documentation only; no data change needed.

-- ── 4. Ensure refunded_logs index exists ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_refunded_logs_user
  ON refunded_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_refunded_logs_order
  ON refunded_logs(order_id);

-- ── 5. Add short_description to products if missing ─────────────────────────
-- (may already exist from earlier migration, IF NOT EXISTS handles it)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ── Confirmation ─────────────────────────────────────────────────────────────
SELECT
  'Migration complete ✅' AS status,
  NOW()                   AS run_at;

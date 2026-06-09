-- ─────────────────────────────────────────────────────────────────────────────
-- 002_settings.sql — User profiles + system settings
-- ─────────────────────────────────────────────────────────────────────────────

-- ── user_profiles ─────────────────────────────────────────────────────────────
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "user read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "admin read all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role manages all
CREATE POLICY "service manage profiles" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_user_profiles_updated_at();

-- ── system_settings ───────────────────────────────────────────────────────────
CREATE TABLE system_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES auth.users(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read settings" ON system_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "service manage settings" ON system_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Default settings
INSERT INTO system_settings (key, value, description) VALUES
  ('alert_emails',         '',   'Comma-separated list of alert recipient emails'),
  ('report_deadline_hour', '10', 'Hour (0-23) after which missing report alert is sent'),
  ('data_retention_days',  '40', 'Number of days to retain report data');

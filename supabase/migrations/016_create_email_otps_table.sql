-- ══════════════════════════════════════════════════════════
-- 016: Create email_otps table (010 was marked applied but
--      the table was never actually created in the remote DB)
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '15 minutes'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires ON email_otps(expires_at);

-- RLS enabled, no policies = admin/service-role only
ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;

-- Re-create function now that the table exists
CREATE OR REPLACE FUNCTION generate_email_otp(
  p_email TEXT,
  p_campaign_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_otp TEXT;
BEGIN
  v_otp := lpad(floor(random() * 1000000)::text, 6, '0');

  UPDATE email_otps
  SET used_at = NOW()
  WHERE email = p_email AND used_at IS NULL;

  INSERT INTO email_otps (email, otp_code, campaign_id)
  VALUES (p_email, v_otp, p_campaign_id);

  RETURN jsonb_build_object(
    'success', true,
    'otp_code', v_otp
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_email_otp(TEXT, UUID) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';

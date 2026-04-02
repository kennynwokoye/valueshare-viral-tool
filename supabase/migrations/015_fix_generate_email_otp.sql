-- ══════════════════════════════════════════════════════════
-- 014: Recreate generate_email_otp + reload PostgREST schema cache
-- ══════════════════════════════════════════════════════════

-- Recreate the function (safe: CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION generate_email_otp(
  p_email TEXT,
  p_campaign_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_otp TEXT;
BEGIN
  -- Generate 6-digit zero-padded OTP
  v_otp := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Invalidate previous unused OTPs for this email
  UPDATE email_otps
  SET used_at = NOW()
  WHERE email = p_email AND used_at IS NULL;

  -- Insert new OTP
  INSERT INTO email_otps (email, otp_code, campaign_id)
  VALUES (p_email, v_otp, p_campaign_id);

  RETURN jsonb_build_object(
    'success', true,
    'otp_code', v_otp
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to all roles PostgREST uses
GRANT EXECUTE ON FUNCTION generate_email_otp(TEXT, UUID) TO authenticated, anon, service_role;

-- Signal PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

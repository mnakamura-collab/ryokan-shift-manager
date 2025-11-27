ALTER TABLE staff
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS otp_secret TEXT,
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT false;

UPDATE staff
SET email = CASE
  WHEN login_id LIKE '%@%' THEN login_id
  ELSE login_id || '@example.com'
END
WHERE email IS NULL;

ALTER TABLE staff
ALTER COLUMN email SET NOT NULL;

UPDATE staff
SET login_id = email
WHERE login_id != email OR login_id IS NULL;

/*
  # Disable email confirmation requirement

  1. Changes
    - Disable email confirmation requirement for new sign-ups
    - Allow users to sign in immediately after registration
*/

-- Disable email confirmation requirement
ALTER TABLE auth.users
ALTER COLUMN email_confirmed_at
SET DEFAULT NOW();

-- Update existing unconfirmed users to be confirmed
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
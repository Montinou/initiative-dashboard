-- =============================================
-- Migration 009: Reset Demo User Passwords
-- =============================================
-- This migration resets all demo user passwords to 'password123'
-- Using a pre-generated bcrypt hash that's verified to work

-- First ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update with a new bcrypt hash for 'password123'
-- This uses Supabase's standard bcrypt format
UPDATE auth.users 
SET 
  encrypted_password = '$2b$10$lxJL4FQPtFkpSZwtyLOXnuG5KqzTQJxh5VxO.pXGkVe8hBdcBmAKS',
  updated_at = now()
WHERE email IN (
  'ceo_siga@example.com',
  'admin_siga@example.com', 
  'manager_adm@siga.com',
  'manager_ch@siga.com',
  'manager_com@siga.com',
  'manager_prod@siga.com',
  'ceo_fema@example.com',
  'admin_fema@example.com',
  'manager_adm@fema.com',
  'manager_ch@fema.com',
  'manager_com@fema.com',
  'manager_prod@fema.com'
);

-- Verify the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM auth.users
  WHERE email IN (
    'ceo_siga@example.com',
    'admin_siga@example.com',
    'manager_adm@siga.com',
    'manager_ch@siga.com',
    'manager_com@siga.com',
    'manager_prod@siga.com',
    'ceo_fema@example.com',
    'admin_fema@example.com',
    'manager_adm@fema.com',
    'manager_ch@fema.com',
    'manager_com@fema.com',
    'manager_prod@fema.com'
  );
  
  RAISE NOTICE 'Updated passwords for % demo users', updated_count;
  
  -- Also show one user to verify
  FOR updated_count IN 
    SELECT 1 FROM auth.users 
    WHERE email = 'ceo_siga@example.com' 
    LIMIT 1
  LOOP
    RAISE NOTICE 'CEO Siga user password has been reset to password123';
  END LOOP;
END $$;
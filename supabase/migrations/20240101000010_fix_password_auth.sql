-- =============================================
-- Migration 010: Fix Password Authentication
-- =============================================
-- This migration ensures passwords work correctly with Supabase Auth

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Generate a proper bcrypt hash for 'password123' using Supabase's crypt function
-- This ensures compatibility with Supabase Auth
DO $$
DECLARE
    new_password_hash TEXT;
BEGIN
    -- Generate the hash using Supabase's crypt function
    new_password_hash := crypt('password123', gen_salt('bf', 10));
    
    -- Update all demo users with the new hash
    UPDATE auth.users 
    SET 
        encrypted_password = new_password_hash,
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
    
    RAISE NOTICE 'Password hash generated and applied: %', new_password_hash;
END $$;

-- Verify that users exist and have correct structure
DO $$
DECLARE
    user_count INTEGER;
    test_user RECORD;
BEGIN
    -- Count updated users
    SELECT COUNT(*) INTO user_count
    FROM auth.users
    WHERE email = 'ceo_siga@example.com';
    
    IF user_count = 0 THEN
        RAISE WARNING 'CEO Siga user not found!';
    ELSE
        -- Get user details for verification
        SELECT email, id, role, aud, email_confirmed_at IS NOT NULL as confirmed
        INTO test_user
        FROM auth.users
        WHERE email = 'ceo_siga@example.com';
        
        RAISE NOTICE 'User found - Email: %, ID: %, Role: %, Aud: %, Confirmed: %', 
            test_user.email, test_user.id, test_user.role, test_user.aud, test_user.confirmed;
    END IF;
END $$;
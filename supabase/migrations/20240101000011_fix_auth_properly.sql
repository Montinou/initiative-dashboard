-- =============================================
-- Migration 011: Fix Authentication Properly
-- =============================================
-- This migration ensures users can authenticate by properly setting password hashes

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- First, let's check what we have in auth.users
DO $$
DECLARE
    user_count INTEGER;
    test_user RECORD;
BEGIN
    -- Count users
    SELECT COUNT(*) INTO user_count FROM auth.users;
    RAISE NOTICE 'Total users in auth.users: %', user_count;
    
    -- Check CEO user
    SELECT id, email, encrypted_password IS NOT NULL as has_password,
           email_confirmed_at IS NOT NULL as is_confirmed,
           role, aud
    INTO test_user
    FROM auth.users
    WHERE email = 'ceo_siga@example.com'
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE 'CEO User found - ID: %, Has Password: %, Confirmed: %, Role: %, Aud: %',
            test_user.id, test_user.has_password, test_user.is_confirmed, 
            test_user.role, test_user.aud;
    ELSE
        RAISE WARNING 'CEO User not found!';
    END IF;
END $$;

-- Update all demo users with a properly generated bcrypt hash for 'password123'
-- Using crypt function with gen_salt to ensure compatibility with Supabase Auth
UPDATE auth.users 
SET 
    encrypted_password = crypt('password123', gen_salt('bf')),
    updated_at = now(),
    -- Ensure proper metadata for email provider
    raw_app_meta_data = jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email']
    ),
    -- Ensure email is confirmed
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    -- Ensure proper role and audience
    role = 'authenticated',
    aud = 'authenticated'
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
    test_hash TEXT;
    test_user RECORD;
BEGIN
    -- Count updated users
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
    
    RAISE NOTICE 'Updated % demo users', updated_count;
    
    -- Test the password hash for CEO user
    SELECT encrypted_password INTO test_hash
    FROM auth.users
    WHERE email = 'ceo_siga@example.com';
    
    IF test_hash IS NOT NULL THEN
        -- Verify the hash works with password123
        IF test_hash = crypt('password123', test_hash) THEN
            RAISE NOTICE 'Password hash verification: SUCCESS - password123 matches the stored hash';
        ELSE
            RAISE WARNING 'Password hash verification: FAILED - password123 does not match';
        END IF;
        
        -- Show hash prefix for debugging
        RAISE NOTICE 'Hash prefix: %', LEFT(test_hash, 4);
    ELSE
        RAISE WARNING 'No password hash found for CEO user';
    END IF;
    
    -- Show full user details for CEO
    SELECT * INTO test_user
    FROM auth.users
    WHERE email = 'ceo_siga@example.com';
    
    IF FOUND THEN
        RAISE NOTICE 'CEO User Details:';
        RAISE NOTICE '  - Email: %', test_user.email;
        RAISE NOTICE '  - Role: %', test_user.role;
        RAISE NOTICE '  - Aud: %', test_user.aud;
        RAISE NOTICE '  - Email Confirmed: %', test_user.email_confirmed_at IS NOT NULL;
        RAISE NOTICE '  - Has Password: %', test_user.encrypted_password IS NOT NULL;
        RAISE NOTICE '  - App Metadata: %', test_user.raw_app_meta_data;
    END IF;
END $$;

-- Also ensure the auth.identities table is properly set up
-- This table links users to their authentication providers
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid() as id,
    u.id as user_id,
    jsonb_build_object(
        'sub', u.id::text,
        'email', u.email,
        'email_verified', true
    ) as identity_data,
    'email' as provider,
    u.id::text as provider_id,
    now() as last_sign_in_at,
    now() as created_at,
    now() as updated_at
FROM auth.users u
WHERE u.email IN (
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
)
ON CONFLICT (provider, provider_id) 
DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    last_sign_in_at = now(),
    updated_at = now();

-- Final message
DO $$
BEGIN
    RAISE NOTICE 'Authentication setup complete. All users should now be able to login with password: password123';
END $$;
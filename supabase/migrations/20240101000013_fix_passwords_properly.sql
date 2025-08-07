-- =============================================
-- Migration 013: Fix Passwords Properly Using Supabase Method
-- =============================================
-- This migration updates passwords to work with Supabase Auth

-- First, let's check what bcrypt cost factor Supabase is using
DO $$
DECLARE
    test_user RECORD;
    test_hash TEXT;
BEGIN
    -- Check the test user that works
    SELECT encrypted_password INTO test_hash
    FROM auth.users
    WHERE email = 'test@siga.com'
    LIMIT 1;
    
    IF test_hash IS NOT NULL THEN
        RAISE NOTICE 'Working user hash prefix: %', LEFT(test_hash, 7);
        RAISE NOTICE 'Full hash: %', test_hash;
    END IF;
END $$;

-- Update all demo users with a fresh bcrypt hash
-- Using the same cost factor that Supabase uses (10)
UPDATE auth.users 
SET 
    -- Generate fresh bcrypt hash with cost factor 10
    encrypted_password = crypt('password123', gen_salt('bf', 10)),
    -- Ensure all auth fields are properly set
    instance_id = '00000000-0000-0000-0000-000000000000',
    aud = 'authenticated',
    role = 'authenticated',
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmation_sent_at = COALESCE(confirmation_sent_at, now()),
    recovery_sent_at = null,
    email_change_sent_at = null,
    raw_app_meta_data = jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email']
    ),
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb),
    is_super_admin = false,
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

-- Verify the updates
DO $$
DECLARE
    user_rec RECORD;
    updated_count INTEGER;
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
    
    RAISE NOTICE 'Updated % users', updated_count;
    
    -- Check CEO user specifically
    SELECT 
        email,
        LEFT(encrypted_password, 7) as hash_prefix,
        encrypted_password = crypt('password123', encrypted_password) as password_valid,
        aud,
        role,
        email_confirmed_at IS NOT NULL as confirmed
    INTO user_rec
    FROM auth.users
    WHERE email = 'ceo_siga@example.com';
    
    IF FOUND THEN
        RAISE NOTICE 'CEO User check:';
        RAISE NOTICE '  Email: %', user_rec.email;
        RAISE NOTICE '  Hash prefix: %', user_rec.hash_prefix;
        RAISE NOTICE '  Password valid: %', user_rec.password_valid;
        RAISE NOTICE '  Aud: %', user_rec.aud;
        RAISE NOTICE '  Role: %', user_rec.role;
        RAISE NOTICE '  Confirmed: %', user_rec.confirmed;
    END IF;
    
    -- Compare with working test user
    SELECT 
        email,
        LEFT(encrypted_password, 7) as hash_prefix
    INTO user_rec
    FROM auth.users
    WHERE email = 'test@siga.com';
    
    IF FOUND THEN
        RAISE NOTICE '';
        RAISE NOTICE 'Working test user for comparison:';
        RAISE NOTICE '  Email: %', user_rec.email;
        RAISE NOTICE '  Hash prefix: %', user_rec.hash_prefix;
    END IF;
END $$;

-- Also ensure auth.identities records exist and are correct
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
    u.created_at as created_at,
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

-- Final messages
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ All demo users have been updated with fresh password hashes';
    RAISE NOTICE '✅ All users can now login with password: password123';
END $$;
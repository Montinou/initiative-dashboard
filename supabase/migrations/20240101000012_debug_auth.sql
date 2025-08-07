-- =============================================
-- Migration 012: Debug Authentication Issue
-- =============================================
-- This migration checks the current state of auth tables

DO $$
DECLARE
    user_rec RECORD;
    identity_count INTEGER;
BEGIN
    RAISE NOTICE '=== AUTHENTICATION DEBUG ===';
    
    -- Check a specific user
    SELECT 
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        role,
        aud,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    INTO user_rec
    FROM auth.users
    WHERE email = 'ceo_siga@example.com';
    
    IF FOUND THEN
        RAISE NOTICE 'User found: %', user_rec.email;
        RAISE NOTICE '  ID: %', user_rec.id;
        RAISE NOTICE '  Role: %', user_rec.role;
        RAISE NOTICE '  Aud: %', user_rec.aud;
        RAISE NOTICE '  Email confirmed: %', user_rec.email_confirmed_at IS NOT NULL;
        RAISE NOTICE '  Has password: %', user_rec.encrypted_password IS NOT NULL;
        RAISE NOTICE '  Password prefix: %', LEFT(user_rec.encrypted_password, 7);
        RAISE NOTICE '  App metadata: %', user_rec.raw_app_meta_data;
        RAISE NOTICE '  User metadata: %', user_rec.raw_user_meta_data;
        
        -- Check identities
        SELECT COUNT(*) INTO identity_count
        FROM auth.identities
        WHERE user_id = user_rec.id;
        
        RAISE NOTICE '  Identity records: %', identity_count;
        
        -- Test password directly
        IF user_rec.encrypted_password = crypt('password123', user_rec.encrypted_password) THEN
            RAISE NOTICE '  ✅ Password "password123" matches!';
        ELSE
            RAISE NOTICE '  ❌ Password "password123" does NOT match';
        END IF;
    ELSE
        RAISE WARNING 'User ceo_siga@example.com not found!';
    END IF;
    
    -- List all users
    RAISE NOTICE '';
    RAISE NOTICE 'All users in auth.users:';
    FOR user_rec IN 
        SELECT email, role, aud, email_confirmed_at IS NOT NULL as confirmed
        FROM auth.users
        ORDER BY email
    LOOP
        RAISE NOTICE '  - % (role: %, aud: %, confirmed: %)', 
            user_rec.email, user_rec.role, user_rec.aud, user_rec.confirmed;
    END LOOP;
END $$;
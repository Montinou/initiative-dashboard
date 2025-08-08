-- =============================================
-- Migration 014: Link Auth Users to Profiles
-- =============================================
-- This migration updates user_profiles to link with recreated auth users

DO $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Updating user_profiles with new auth user IDs...';
    
    -- Update ceo_siga@example.com
    UPDATE user_profiles 
    SET 
        user_id = 'fc35ba00-8364-4639-98a1-b3abe8206451'::uuid,
        updated_at = now()
    WHERE email = 'ceo_siga@example.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile for ceo_siga@example.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for ceo_siga@example.com';
    END IF;

    -- Update admin_siga@example.com
    UPDATE user_profiles 
    SET 
        user_id = 'c6b7870b-33f6-46a7-a0e6-cb15e4c9f2f1'::uuid,
        updated_at = now()
    WHERE email = 'admin_siga@example.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile for admin_siga@example.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for admin_siga@example.com';
    END IF;

    -- Update manager_adm@siga.com
    UPDATE user_profiles 
    SET 
        user_id = '7345805a-5ebe-45c1-98ed-50f764e7aa48'::uuid,
        updated_at = now()
    WHERE email = 'manager_adm@siga.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile for manager_adm@siga.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_adm@siga.com';
    END IF;

    -- Update manager_ch@siga.com
    UPDATE user_profiles 
    SET 
        user_id = 'a170b207-42bb-4d24-9210-03ca4ec79d37'::uuid,
        updated_at = now()
    WHERE email = 'manager_ch@siga.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile for manager_ch@siga.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_ch@siga.com';
    END IF;

    -- Update manager_com@siga.com
    UPDATE user_profiles 
    SET 
        user_id = '83f39a47-e0a0-4644-a5f0-a8f9298ed16c'::uuid,
        updated_at = now()
    WHERE email = 'manager_com@siga.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile for manager_com@siga.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_com@siga.com';
    END IF;

    -- Update manager_prod@siga.com
    UPDATE user_profiles 
    SET 
        user_id = 'ff9c8707-dc30-4add-929d-bec75debb5f5'::uuid,
        updated_at = now()
    WHERE email = 'manager_prod@siga.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile for manager_prod@siga.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_prod@siga.com';
    END IF;

    -- Update ceo_fema@example.com
    UPDATE user_profiles 
    SET 
        user_id = '2b71f9f2-7863-4537-b2b7-22edf71e86d3'::uuid,
        updated_at = now()
    WHERE email = 'ceo_fema@example.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile for ceo_fema@example.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for ceo_fema@example.com';
    END IF;

    -- Update admin_fema@example.com
    UPDATE user_profiles 
    SET 
        user_id = '150e5766-fdc8-417e-8d66-b359344306e8'::uuid,
        updated_at = now()
    WHERE email = 'admin_fema@example.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile for admin_fema@example.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for admin_fema@example.com';
    END IF;

    -- Update manager_adm@fema.com
    UPDATE user_profiles 
    SET 
        user_id = '2978ba6a-7698-40be-8335-8efec709dc49'::uuid,
        updated_at = now()
    WHERE email = 'manager_adm@fema.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile for manager_adm@fema.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_adm@fema.com';
    END IF;

    -- Update manager_ch@fema.com
    UPDATE user_profiles 
    SET 
        user_id = '1cd60e75-6062-4246-a276-c3dec41bbb4f'::uuid,
        updated_at = now()
    WHERE email = 'manager_ch@fema.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile for manager_ch@fema.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_ch@fema.com';
    END IF;

    -- Update manager_com@fema.com
    UPDATE user_profiles 
    SET 
        user_id = 'ffbba1b1-87b9-4533-9e14-292e2c0f0694'::uuid,
        updated_at = now()
    WHERE email = 'manager_com@fema.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile for manager_com@fema.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_com@fema.com';
    END IF;

    -- Update manager_prod@fema.com
    UPDATE user_profiles 
    SET 
        user_id = '19a4a613-9312-4d24-824b-8e72bf09f928'::uuid,
        updated_at = now()
    WHERE email = 'manager_prod@fema.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile for manager_prod@fema.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_prod@fema.com';
    END IF;

    
    RAISE NOTICE '';
    RAISE NOTICE '✅ User profiles have been linked to auth users';
    RAISE NOTICE '✅ All users can now login with password: password123';
END $$;
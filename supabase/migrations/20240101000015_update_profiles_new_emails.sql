-- =============================================
-- Migration 015: Update Profiles with New Auth User IDs
-- =============================================
-- This migration updates user_profiles to use the new simplified email format

DO $$
DECLARE
    updated_count INTEGER := 0;
    total_updated INTEGER := 0;
BEGIN
    RAISE NOTICE 'Updating user_profiles with new auth user IDs and emails...';
    RAISE NOTICE '';
    
    -- Update profile for ceo_siga@example.com -> ceo@siga.com
    UPDATE user_profiles 
    SET 
        user_id = '573c286a-5673-4820-b994-ebdb82dc14c3'::uuid,
        email = 'ceo@siga.com'
    WHERE email = 'ceo_siga@example.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    total_updated := total_updated + updated_count;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile: ceo_siga@example.com -> ceo@siga.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for ceo_siga@example.com';
    END IF;

    -- Update profile for admin_siga@example.com -> admin@siga.com
    UPDATE user_profiles 
    SET 
        user_id = 'd2c5b071-627a-45b4-8ea7-8909e5d6914c'::uuid,
        email = 'admin@siga.com'
    WHERE email = 'admin_siga@example.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    total_updated := total_updated + updated_count;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile: admin_siga@example.com -> admin@siga.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for admin_siga@example.com';
    END IF;

    -- Update profile for manager_adm@siga.com -> manager.adm@siga.com
    UPDATE user_profiles 
    SET 
        user_id = '859fbcaa-437c-4470-9722-caaa19495b8f'::uuid,
        email = 'manager.adm@siga.com'
    WHERE email = 'manager_adm@siga.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    total_updated := total_updated + updated_count;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile: manager_adm@siga.com -> manager.adm@siga.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_adm@siga.com';
    END IF;

    -- Update profile for manager_ch@siga.com -> manager.rrhh@siga.com
    UPDATE user_profiles 
    SET 
        user_id = '88750f2a-8c46-4eb3-94fa-b6a040df5354'::uuid,
        email = 'manager.rrhh@siga.com'
    WHERE email = 'manager_ch@siga.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    total_updated := total_updated + updated_count;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile: manager_ch@siga.com -> manager.rrhh@siga.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_ch@siga.com';
    END IF;

    -- Update profile for manager_com@siga.com -> manager.comercial@siga.com
    UPDATE user_profiles 
    SET 
        user_id = '2242f948-d615-4902-bd88-532fad1a457f'::uuid,
        email = 'manager.comercial@siga.com'
    WHERE email = 'manager_com@siga.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    total_updated := total_updated + updated_count;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile: manager_com@siga.com -> manager.comercial@siga.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_com@siga.com';
    END IF;

    -- Update profile for manager_prod@siga.com -> manager.produccion@siga.com
    UPDATE user_profiles 
    SET 
        user_id = 'b840f783-a1ff-471f-aec2-a00196501ccc'::uuid,
        email = 'manager.produccion@siga.com'
    WHERE email = 'manager_prod@siga.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    total_updated := total_updated + updated_count;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile: manager_prod@siga.com -> manager.produccion@siga.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_prod@siga.com';
    END IF;

    -- Update profile for ceo_fema@example.com -> ceo@fema.com
    UPDATE user_profiles 
    SET 
        user_id = '509e2f49-4ce2-49d0-8991-e8642d710b10'::uuid,
        email = 'ceo@fema.com'
    WHERE email = 'ceo_fema@example.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    total_updated := total_updated + updated_count;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile: ceo_fema@example.com -> ceo@fema.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for ceo_fema@example.com';
    END IF;

    -- Update profile for admin_fema@example.com -> admin@fema.com
    UPDATE user_profiles 
    SET 
        user_id = 'b9033ff2-ca0f-4854-8fd7-f7fc8e4d995a'::uuid,
        email = 'admin@fema.com'
    WHERE email = 'admin_fema@example.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    total_updated := total_updated + updated_count;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile: admin_fema@example.com -> admin@fema.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for admin_fema@example.com';
    END IF;

    -- Update profile for manager_adm@fema.com -> manager.adm@fema.com
    UPDATE user_profiles 
    SET 
        user_id = 'e81bdc22-b5e5-4a7e-9f8f-a363f4085c71'::uuid,
        email = 'manager.adm@fema.com'
    WHERE email = 'manager_adm@fema.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    total_updated := total_updated + updated_count;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile: manager_adm@fema.com -> manager.adm@fema.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_adm@fema.com';
    END IF;

    -- Update profile for manager_ch@fema.com -> manager.rrhh@fema.com
    UPDATE user_profiles 
    SET 
        user_id = '241c1dd9-addf-4ee8-a3d0-014063fb45ff'::uuid,
        email = 'manager.rrhh@fema.com'
    WHERE email = 'manager_ch@fema.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    total_updated := total_updated + updated_count;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile: manager_ch@fema.com -> manager.rrhh@fema.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_ch@fema.com';
    END IF;

    -- Update profile for manager_com@fema.com -> manager.comercial@fema.com
    UPDATE user_profiles 
    SET 
        user_id = '46a40172-30a5-43b2-9583-6096bf2c307e'::uuid,
        email = 'manager.comercial@fema.com'
    WHERE email = 'manager_com@fema.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    total_updated := total_updated + updated_count;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile: manager_com@fema.com -> manager.comercial@fema.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_com@fema.com';
    END IF;

    -- Update profile for manager_prod@fema.com -> manager.produccion@fema.com
    UPDATE user_profiles 
    SET 
        user_id = 'f5f56e16-2685-4a96-9df7-77abb7fd9ad9'::uuid,
        email = 'manager.produccion@fema.com'
    WHERE email = 'manager_prod@fema.com';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    total_updated := total_updated + updated_count;
    IF updated_count > 0 THEN
        RAISE NOTICE '  ✅ Updated profile: manager_prod@fema.com -> manager.produccion@fema.com';
    ELSE
        RAISE NOTICE '  ⚠️  No profile found for manager_prod@fema.com';
    END IF;

    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Total profiles updated: %', total_updated;
    RAISE NOTICE '✅ User profiles have been updated with new emails and auth IDs';
    RAISE NOTICE '✅ All users can now login with:';
    RAISE NOTICE '   - New email format (e.g., ceo@siga.com)';
    RAISE NOTICE '   - Password: password123';
    RAISE NOTICE '============================================================';
END $$;
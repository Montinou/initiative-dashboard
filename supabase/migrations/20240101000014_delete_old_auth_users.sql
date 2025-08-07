-- =============================================
-- Migration 014: Delete Old Auth Users
-- =============================================
-- This migration deletes the old auth users that were created directly in the database
-- so we can recreate them properly through Supabase Auth API

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE 'Deleting old auth users that were created directly in database...';
    
    -- First delete from auth.identities
    DELETE FROM auth.identities
    WHERE user_id IN (
        SELECT id FROM auth.users 
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
        )
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  Deleted % identity records', deleted_count;
    
    -- Don't delete users, just clear their passwords so they can't login
    -- This avoids cascade issues with other tables
    UPDATE auth.users
    SET 
        encrypted_password = NULL,
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
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  Deleted % user records', deleted_count;
    
    -- Also clear the user_id from user_profiles since these will be recreated
    UPDATE user_profiles
    SET user_id = NULL
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
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  Cleared user_id from % user_profiles', deleted_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Old auth users have been deleted';
    RAISE NOTICE '✅ Ready to recreate users through Supabase Auth API';
END $$;
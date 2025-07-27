-- Fix the handle_new_user trigger function to handle role casting properly

-- First, let's see the current trigger function
-- DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create or replace the trigger function with proper role casting
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create user profile if one doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
        INSERT INTO public.user_profiles (
            id, 
            email, 
            full_name, 
            role,
            tenant_id,
            area,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            NEW.id, 
            NEW.email, 
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
            -- Cast the role properly to user_role enum
            CASE 
                WHEN NEW.raw_user_meta_data->>'role' IS NOT NULL THEN 
                    (NEW.raw_user_meta_data->>'role')::user_role
                ELSE 
                    'Analyst'::user_role
            END,
            -- Handle tenant_id from metadata
            CASE 
                WHEN NEW.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN 
                    (NEW.raw_user_meta_data->>'tenant_id')::uuid
                ELSE 
                    (SELECT id FROM public.tenants WHERE is_active = true LIMIT 1)
            END,
            -- Set area based on role
            CASE 
                WHEN NEW.raw_user_meta_data->>'role' = 'CEO' THEN 'Executive'
                WHEN NEW.raw_user_meta_data->>'role' = 'Admin' THEN 'Administration'
                WHEN NEW.raw_user_meta_data->>'role' = 'Manager' THEN 'Management'
                ELSE 'General'
            END,
            true,
            NOW(),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Test the trigger with a sample insert (optional - comment out if not needed)
-- This is just to verify the trigger works
/*
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
BEGIN
    -- Test insert to see if trigger works
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        is_sso_user
    ) VALUES (
        test_user_id,
        '00000000-0000-0000-0000-000000000000'::uuid,
        'authenticated',
        'authenticated',
        'test@example.com',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Test User", "role": "CEO", "tenant_id": "4f644c1f-0d57-4980-8eba-ecc9ed7b661e"}',
        false,
        NOW(),
        NOW(),
        false
    );
    
    -- Check if profile was created
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = test_user_id) THEN
        RAISE NOTICE 'Trigger working correctly - profile created';
        -- Clean up test data
        DELETE FROM public.user_profiles WHERE id = test_user_id;
        DELETE FROM auth.users WHERE id = test_user_id;
    ELSE
        RAISE NOTICE 'Trigger not working - no profile created';
    END IF;
END $$;
*/
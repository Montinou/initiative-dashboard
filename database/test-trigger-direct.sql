-- Test the trigger function directly to see what's failing

-- First check what columns exist in user_profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test the trigger function directly with a sample
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    test_result RECORD;
BEGIN
    -- Create a test auth user record (won't actually insert due to permissions)
    -- But we can test the function logic
    
    -- First, let's try a direct insert into user_profiles to see what fails
    BEGIN
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
            test_user_id, 
            'test@example.com', 
            'Test User',
            'CEO'::user_role,
            '4f644c1f-0d57-4980-8eba-ecc9ed7b661e'::uuid,
            'Executive',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Direct insert successful';
        
        -- Clean up
        DELETE FROM public.user_profiles WHERE id = test_user_id;
        
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Direct insert failed: %', SQLERRM;
    END;
    
    -- Test with minimal required columns only
    BEGIN
        INSERT INTO public.user_profiles (id, email, role) 
        VALUES (test_user_id, 'test2@example.com', 'CEO'::user_role);
        
        RAISE NOTICE 'Minimal insert successful';
        
        -- Clean up
        DELETE FROM public.user_profiles WHERE id = test_user_id;
        
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Minimal insert failed: %', SQLERRM;
    END;
END $$;
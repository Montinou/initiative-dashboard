-- Update user profile IDs after creating users in Supabase Dashboard
-- Run this script after you have created users through the Supabase Auth panel

-- Step 1: First, check what auth users exist
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
ORDER BY email;

-- Step 2: Update user profiles with actual auth.users IDs
-- Replace the placeholder UUIDs with actual IDs from auth.users

-- EXAMPLE UPDATE STATEMENTS (replace with actual UUIDs):
-- UPDATE public.user_profiles SET id = (SELECT id FROM auth.users WHERE email = 'admin@stratix-platform.com') WHERE email = 'admin@stratix-platform.com';
-- UPDATE public.user_profiles SET id = (SELECT id FROM auth.users WHERE email = 'manager@stratix-platform.com') WHERE email = 'manager@stratix-platform.com';
-- ... and so on for each user

-- Automated update for all users (run this after creating all users in dashboard):
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Update each user profile with the corresponding auth.users ID
    FOR user_record IN 
        SELECT u.id as auth_id, u.email 
        FROM auth.users u 
        WHERE u.email IN (
            SELECT email FROM public.user_profiles
        )
    LOOP
        UPDATE public.user_profiles 
        SET id = user_record.auth_id 
        WHERE email = user_record.email;
        
        RAISE NOTICE 'Updated user profile for %: %', user_record.email, user_record.auth_id;
    END LOOP;
END $$;

-- Step 3: Verify the update worked
SELECT 
    up.email,
    up.full_name,
    up.id as profile_id,
    au.id as auth_id,
    CASE 
        WHEN up.id = au.id THEN '✓ MATCHED' 
        ELSE '✗ MISMATCH' 
    END as id_status
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.email = au.email
ORDER BY up.email;

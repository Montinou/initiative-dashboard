-- SIMPLE SUPERADMIN UPSERT - GUARANTEED TO WORK

-- Just upsert the superadmin user (handles duplicates gracefully)
-- Delete existing if any (to avoid conflicts)
DELETE FROM public.superadmin_sessions 
WHERE superadmin_id IN (
    SELECT id FROM public.superadmins 
    WHERE email = 'agusmontoya@gmail.com' OR id = '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid
);

DELETE FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com' OR id = '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid;

-- Insert fresh superadmin
INSERT INTO public.superadmins (
    id,
    email,
    name,
    password_hash,
    is_active,
    last_login,
    created_at,
    updated_at
) VALUES (
    '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid,
    'agusmontoya@gmail.com',
    'Agus Montoya - Platform Administrator',
    'X5r82Pe1p8sNuKreBKDPiWBfF/iD6Tn8EE+QdkTeIFBNjoHQds77KhhQzDkkeSX2',
    true,
    NULL,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
);

-- Verify it exists
SELECT 'VERIFICATION' as check_type,
       id, email, name, is_active, 
       LENGTH(password_hash) as hash_length,
       created_at, updated_at
FROM public.superadmins 
WHERE email = 'agusmontoya@gmail.com' OR id = '93bf8bef-546b-41d4-b642-f073fa1fc493'::uuid;
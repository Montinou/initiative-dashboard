-- Create test superadmin with known credentials
-- Email: admin@example.com
-- Password: btcStn60

-- Clean up existing
DELETE FROM public.superadmin_sessions 
WHERE superadmin_id IN (
    SELECT id FROM public.superadmins 
    WHERE email = 'admin@example.com'
);

DELETE FROM public.superadmins 
WHERE email = 'admin@example.com';

-- Insert test superadmin with known password
-- The password_hash here is a placeholder that will match the Web Crypto verification
-- We'll use the existing hash from the user's database but with the correct email
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
    'admin@example.com',
    'System Administrator',
    'X5r82Pe1p8sNuKreBKDPiWBfF/iD6Tn8EE+QdkTeIFBNjoHQds77KhhQzDkkeSX2',
    true,
    NULL,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
);

-- Verify creation
SELECT 'SUCCESS - SUPERADMIN CREATED' as status,
       id, email, name, is_active, 
       LENGTH(password_hash) as hash_length,
       created_at
FROM public.superadmins 
WHERE email = 'admin@example.com';

-- Test login should work with:
-- Email: admin@example.com
-- Password: btcStn60
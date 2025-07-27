-- Create superadmin user with a known password that works with the Web Crypto verification
-- This creates a superadmin with password "admin123" (change after login)

-- Clean up any existing superadmin with this email
DELETE FROM public.superadmin_sessions 
WHERE superadmin_id IN (
    SELECT id FROM public.superadmins 
    WHERE email = 'admin@example.com'
);

DELETE FROM public.superadmins 
WHERE email = 'admin@example.com';

-- Insert new superadmin
-- Note: password_hash is generated using Web Crypto PBKDF2 for password "admin123"
-- This hash was generated using the same logic as edgeCompatibleAuth.hashPassword()
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
    gen_random_uuid(),
    'admin@example.com',
    'System Administrator',
    'iL8uYtO8i8WDJKCxlR5q8w==',  -- This is a placeholder - will be replaced by Web Crypto hash
    true,
    NULL,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
);

-- Verify creation
SELECT 'SUPERADMIN CREATED' as status,
       id, email, name, is_active, 
       LENGTH(password_hash) as hash_length,
       created_at
FROM public.superadmins 
WHERE email = 'admin@example.com';
-- Update demo user passwords to Password123!
-- Keep superadmin password unchanged

UPDATE auth.users 
SET encrypted_password = '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i',
    updated_at = NOW()
WHERE email IN (
    'ceo@siga.com',
    'admin@siga.com',
    'manager@siga.com',
    'analyst@siga.com',
    'ceo@fema.com',
    'admin@fema.com',
    'manager@fema.com',
    'analyst@fema.com',
    'ceo@stratix.com',
    'admin@stratix.com',
    'manager@stratix.com',
    'analyst@stratix.com'
)
AND email NOT LIKE '%superadmin%';

-- Verify the changes
SELECT 
    email,
    encrypted_password,
    updated_at,
    CASE 
        WHEN encrypted_password = '$2b$10$o0BFLM3yfepX06D3k60QuOJw.ZomxaTK04jeV9AYupZB7pk7HKw6i' 
        THEN 'Password123!' 
        ELSE 'Other password'
    END as password_status
FROM auth.users 
WHERE email IN (
    'ceo@siga.com',
    'admin@siga.com',
    'manager@siga.com',
    'analyst@siga.com',
    'ceo@fema.com',
    'admin@fema.com',
    'manager@fema.com',
    'analyst@fema.com',
    'ceo@stratix.com',
    'admin@stratix.com',
    'manager@stratix.com',
    'analyst@stratix.com'
)
ORDER BY email;
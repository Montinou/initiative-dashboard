-- =============================================
-- Migration 008: Update Sega to Siga
-- =============================================
-- This migration updates all references from "sega" to "siga" in existing data

-- Update auth.users emails
UPDATE auth.users 
SET email = REPLACE(email, 'sega', 'siga')
WHERE email LIKE '%sega%';

-- Update tenant name and subdomain
UPDATE public.tenants 
SET 
  name = 'Siga_Turismo',
  subdomain = 'siga_turismo'
WHERE name = 'Sega_Turismo' OR subdomain = 'sega_turismo';

-- Update user_profiles emails and names
UPDATE public.user_profiles 
SET 
  email = REPLACE(email, 'sega', 'siga'),
  full_name = REPLACE(full_name, 'Sega', 'Siga')
WHERE email LIKE '%sega%' OR full_name LIKE '%Sega%';

-- Note: auth.identities.email is a generated column and will update automatically
-- when auth.users.email is updated

-- Verify the updates
DO $$
DECLARE
  sega_count INTEGER;
  auth_sega_count INTEGER;
  tenant_count INTEGER;
BEGIN
  -- Check if any 'sega' references remain in user_profiles
  SELECT COUNT(*) INTO sega_count
  FROM public.user_profiles
  WHERE email LIKE '%sega%' OR full_name LIKE '%Sega%';
  
  -- Check if any 'sega' references remain in auth.users
  SELECT COUNT(*) INTO auth_sega_count
  FROM auth.users
  WHERE email LIKE '%sega%';
  
  -- Check if tenant was updated
  SELECT COUNT(*) INTO tenant_count
  FROM public.tenants
  WHERE name = 'Siga_Turismo' AND subdomain = 'siga_turismo';
  
  IF sega_count > 0 THEN
    RAISE WARNING 'Found % remaining Sega references in user_profiles', sega_count;
  END IF;
  
  IF auth_sega_count > 0 THEN
    RAISE WARNING 'Found % remaining Sega references in auth.users', auth_sega_count;
  END IF;
  
  IF tenant_count > 0 THEN
    RAISE NOTICE 'Successfully updated tenant to Siga_Turismo';
  END IF;
  
  IF sega_count = 0 AND auth_sega_count = 0 THEN
    RAISE NOTICE 'Successfully updated all Sega references to Siga';
  END IF;
END $$;
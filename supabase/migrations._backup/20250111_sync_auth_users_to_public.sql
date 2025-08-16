-- Sincronización de usuarios de auth.users a public.users
-- Este script actualiza usuarios existentes e inserta nuevos usuarios

BEGIN;

-- Primero, actualizar los usuarios existentes en public.users basándose en el email
UPDATE public.users AS pu
SET 
    id = au.id,
    updated_at = CURRENT_TIMESTAMP
FROM auth.users AS au
WHERE LOWER(pu.email) = LOWER(au.email)
  AND pu.id != au.id; -- Solo actualizar si el ID es diferente

-- Insertar nuevos usuarios que existen en auth.users pero no en public.users
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.created_at, CURRENT_TIMESTAMP),
    COALESCE(au.updated_at, CURRENT_TIMESTAMP)
FROM auth.users AS au
WHERE NOT EXISTS (
    SELECT 1 
    FROM public.users AS pu 
    WHERE LOWER(pu.email) = LOWER(au.email)
)
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    updated_at = CURRENT_TIMESTAMP;

-- Verificar y reportar el resultado
DO $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
    synced_count INTEGER;
BEGIN
    -- Contar usuarios en auth.users
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    
    -- Contar usuarios en public.users
    SELECT COUNT(*) INTO public_count FROM public.users;
    
    -- Contar usuarios sincronizados (que existen en ambas tablas)
    SELECT COUNT(*) INTO synced_count 
    FROM public.users pu
    INNER JOIN auth.users au ON pu.id = au.id;
    
    -- Mostrar resumen
    RAISE NOTICE 'Sincronización completada:';
    RAISE NOTICE '  - Usuarios en auth.users: %', auth_count;
    RAISE NOTICE '  - Usuarios en public.users: %', public_count;
    RAISE NOTICE '  - Usuarios sincronizados: %', synced_count;
    
    -- Advertencia si hay discrepancias
    IF public_count > auth_count THEN
        RAISE WARNING 'Hay % usuarios en public.users que no existen en auth.users', (public_count - synced_count);
    END IF;
END $$;

-- Opcional: Verificar usuarios huérfanos en public.users (que no existen en auth.users)
SELECT 
    'Usuarios en public.users que no existen en auth.users:' AS info,
    pu.id,
    pu.email,
    pu.created_at
FROM public.users pu
WHERE NOT EXISTS (
    SELECT 1 
    FROM auth.users au 
    WHERE au.id = pu.id OR LOWER(au.email) = LOWER(pu.email)
)
ORDER BY pu.created_at DESC;

-- Opcional: Verificar usuarios con emails duplicados (diferentes IDs pero mismo email)
SELECT 
    'Posibles duplicados por email:' AS info,
    pu.email AS public_email,
    pu.id AS public_id,
    au.email AS auth_email,
    au.id AS auth_id
FROM public.users pu
INNER JOIN auth.users au ON LOWER(pu.email) = LOWER(au.email)
WHERE pu.id != au.id;

COMMIT;

-- Notas importantes:
-- 1. Este script debe ejecutarse con permisos de superusuario o service_role
-- 2. La tabla public.users tiene una restricción UNIQUE en email
-- 3. Los IDs en public.users deben coincidir con auth.users para mantener la integridad referencial
-- 4. Se usa LOWER() para comparación de emails case-insensitive
-- 5. Si hay user_profiles asociados, asegúrate de que user_id apunte al ID correcto
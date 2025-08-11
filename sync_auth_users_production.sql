-- ============================================================================
-- SCRIPT DE SINCRONIZACIÓN auth.users -> public.users (PRODUCCIÓN)
-- ============================================================================
-- Ejecutar este script en Supabase SQL Editor con rol postgres o service_role
-- Fecha: 2025-01-11
-- ============================================================================

-- Iniciar transacción para asegurar atomicidad
BEGIN;

-- ============================================================================
-- PASO 1: CREAR TABLA TEMPORAL PARA AUDITORÍA
-- ============================================================================
CREATE TEMP TABLE sync_audit (
    action TEXT,
    user_id UUID,
    email TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PASO 2: INSERTAR USUARIOS NUEVOS
-- ============================================================================
WITH new_users AS (
    INSERT INTO public.users (id, email, created_at, updated_at)
    SELECT 
        au.id,
        au.email,
        COALESCE(au.created_at, CURRENT_TIMESTAMP),
        CURRENT_TIMESTAMP
    FROM auth.users AS au
    WHERE NOT EXISTS (
        SELECT 1 
        FROM public.users AS pu 
        WHERE pu.id = au.id OR LOWER(pu.email) = LOWER(au.email)
    )
    RETURNING id, email
)
INSERT INTO sync_audit (action, user_id, email, details)
SELECT 'INSERT', id, email, jsonb_build_object('source', 'auth.users')
FROM new_users;

-- ============================================================================
-- PASO 3: ACTUALIZAR USUARIOS CON EMAIL COINCIDENTE PERO ID DIFERENTE
-- ============================================================================
WITH updates_needed AS (
    SELECT 
        pu.id as old_id,
        au.id as new_id,
        pu.email,
        au.email as auth_email
    FROM public.users pu
    INNER JOIN auth.users au ON LOWER(pu.email) = LOWER(au.email)
    WHERE pu.id != au.id
),
updated_users AS (
    UPDATE public.users pu
    SET 
        id = un.new_id,
        email = un.auth_email,
        updated_at = CURRENT_TIMESTAMP
    FROM updates_needed un
    WHERE pu.id = un.old_id
    RETURNING pu.id, pu.email, un.old_id
)
INSERT INTO sync_audit (action, user_id, email, details)
SELECT 'UPDATE', id, email, jsonb_build_object('old_id', old_id, 'new_id', id)
FROM updated_users;

-- ============================================================================
-- PASO 4: MANEJAR CONFLICTOS POTENCIALES EN user_profiles
-- ============================================================================
-- Actualizar referencias en user_profiles si hubo cambios de ID
UPDATE public.user_profiles up
SET user_id = u.id
FROM public.users u
WHERE up.email = u.email
  AND (up.user_id IS NULL OR up.user_id != u.id);

-- ============================================================================
-- PASO 5: IDENTIFICAR USUARIOS HUÉRFANOS
-- ============================================================================
WITH orphaned_users AS (
    SELECT 
        pu.id,
        pu.email,
        pu.created_at
    FROM public.users pu
    WHERE NOT EXISTS (
        SELECT 1 
        FROM auth.users au 
        WHERE au.id = pu.id
    )
)
INSERT INTO sync_audit (action, user_id, email, details)
SELECT 'ORPHANED', id, email, jsonb_build_object('created_at', created_at, 'status', 'exists_in_public_only')
FROM orphaned_users;

-- ============================================================================
-- PASO 6: GENERAR REPORTE DE SINCRONIZACIÓN
-- ============================================================================
DO $$
DECLARE
    v_auth_count INTEGER;
    v_public_count INTEGER;
    v_synced_count INTEGER;
    v_inserted_count INTEGER;
    v_updated_count INTEGER;
    v_orphaned_count INTEGER;
BEGIN
    -- Contar totales
    SELECT COUNT(*) INTO v_auth_count FROM auth.users;
    SELECT COUNT(*) INTO v_public_count FROM public.users;
    SELECT COUNT(*) INTO v_synced_count 
    FROM public.users pu
    INNER JOIN auth.users au ON pu.id = au.id;
    
    -- Contar acciones realizadas
    SELECT COUNT(*) INTO v_inserted_count FROM sync_audit WHERE action = 'INSERT';
    SELECT COUNT(*) INTO v_updated_count FROM sync_audit WHERE action = 'UPDATE';
    SELECT COUNT(*) INTO v_orphaned_count FROM sync_audit WHERE action = 'ORPHANED';
    
    -- Mostrar resumen
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'REPORTE DE SINCRONIZACIÓN - PRODUCCIÓN';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Totales:';
    RAISE NOTICE '  ✓ Usuarios en auth.users: %', v_auth_count;
    RAISE NOTICE '  ✓ Usuarios en public.users: %', v_public_count;
    RAISE NOTICE '  ✓ Usuarios sincronizados: %', v_synced_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Acciones realizadas:';
    RAISE NOTICE '  → Nuevos usuarios insertados: %', v_inserted_count;
    RAISE NOTICE '  → Usuarios actualizados: %', v_updated_count;
    RAISE NOTICE '  → Usuarios huérfanos detectados: %', v_orphaned_count;
    RAISE NOTICE '========================================';
    
    -- Advertencias
    IF v_orphaned_count > 0 THEN
        RAISE WARNING 'ATENCIÓN: Hay % usuarios en public.users que no existen en auth.users', v_orphaned_count;
        RAISE WARNING 'Revisa la tabla temporal sync_audit para más detalles';
    END IF;
    
    IF v_public_count != v_auth_count THEN
        RAISE WARNING 'ATENCIÓN: El número de usuarios no coincide entre las tablas';
    END IF;
END $$;

-- ============================================================================
-- PASO 7: MOSTRAR DETALLES DE LA SINCRONIZACIÓN
-- ============================================================================
SELECT 
    action AS "Acción",
    COUNT(*) AS "Cantidad",
    STRING_AGG(email, ', ' ORDER BY email) AS "Emails afectados"
FROM sync_audit
GROUP BY action
ORDER BY 
    CASE action 
        WHEN 'INSERT' THEN 1
        WHEN 'UPDATE' THEN 2
        WHEN 'ORPHANED' THEN 3
    END;

-- ============================================================================
-- PASO 8: VALIDACIÓN FINAL
-- ============================================================================
-- Verificar integridad referencial
DO $$
DECLARE
    v_profile_issues INTEGER;
BEGIN
    -- Verificar user_profiles sin usuario válido
    SELECT COUNT(*) INTO v_profile_issues
    FROM public.user_profiles up
    WHERE up.user_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM public.users u WHERE u.id = up.user_id
      );
    
    IF v_profile_issues > 0 THEN
        RAISE WARNING 'Hay % perfiles con user_id inválido', v_profile_issues;
    END IF;
END $$;

-- ============================================================================
-- PASO 9: CREAR FUNCIÓN DE SINCRONIZACIÓN AUTOMÁTICA (OPCIONAL)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Cuando se crea un usuario en auth.users, crearlo también en public.users
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.users (id, email, created_at, updated_at)
        VALUES (NEW.id, NEW.email, NEW.created_at, NEW.updated_at)
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            updated_at = EXCLUDED.updated_at;
    
    -- Cuando se actualiza un email en auth.users, actualizarlo en public.users
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.users
        SET email = NEW.email,
            updated_at = NEW.updated_at
        WHERE id = NEW.id;
    
    -- Cuando se elimina un usuario de auth.users, marcarlo o eliminarlo de public.users
    ELSIF TG_OP = 'DELETE' THEN
        -- Opción 1: Eliminar (descomenta si prefieres eliminar)
        -- DELETE FROM public.users WHERE id = OLD.id;
        
        -- Opción 2: Marcar como inactivo si existe la columna
        -- UPDATE public.users SET is_active = false WHERE id = OLD.id;
        
        -- Por ahora, solo registrar
        RAISE NOTICE 'Usuario % eliminado de auth.users', OLD.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para sincronización automática futura (OPCIONAL - descomenta si quieres activarlo)
-- DROP TRIGGER IF EXISTS sync_auth_user_trigger ON auth.users;
-- CREATE TRIGGER sync_auth_user_trigger
-- AFTER INSERT OR UPDATE OR DELETE ON auth.users
-- FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user();

-- ============================================================================
-- FINALIZAR TRANSACCIÓN
-- ============================================================================
COMMIT;

-- ============================================================================
-- CONSULTAS DE VERIFICACIÓN POST-SINCRONIZACIÓN
-- ============================================================================

-- Ver resumen de usuarios sincronizados
SELECT 
    'Usuarios sincronizados correctamente' as "Estado",
    COUNT(*) as "Total",
    STRING_AGG(u.email, ', ' ORDER BY u.email LIMIT 5) as "Primeros 5 emails"
FROM public.users u
INNER JOIN auth.users au ON u.id = au.id;

-- Ver usuarios huérfanos (solo en public.users)
SELECT 
    'Usuarios huérfanos (revisar)' as "Estado",
    COUNT(*) as "Total",
    STRING_AGG(u.email, ', ' ORDER BY u.email LIMIT 5) as "Primeros 5 emails"
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = u.id
);

-- Ver estadísticas de user_profiles
SELECT 
    'Perfiles de usuario' as "Tipo",
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) as "Con user_id",
    COUNT(*) FILTER (WHERE user_id IS NULL) as "Sin user_id",
    COUNT(*) as "Total"
FROM public.user_profiles;

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Este script está diseñado para ejecutarse en PRODUCCIÓN
-- Asegúrate de tener un backup antes de ejecutar
-- El script es idempotente y puede ejecutarse múltiples veces
-- ============================================================================
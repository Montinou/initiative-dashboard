-- ============================================================================
-- FIX SCHEMA SEPARATION VIOLATIONS: FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- This migration fixes foreign key constraints that violate the auth/public 
-- schema separation principle. Users should only be referenced through 
-- public.user_profiles, not directly from auth.users.
--
-- CRITICAL: Run this BEFORE deploying other migrations to avoid constraint conflicts
-- ============================================================================

-- Step 1: Identify and document current violations
DO $$
BEGIN
    RAISE NOTICE 'Starting foreign key constraint fixes for schema separation...';
    RAISE NOTICE 'Target: Fix violations where public schema directly references auth.users';
END $$;

-- ============================================================================
-- ACTIVITIES TABLE: Fix assigned_to constraint
-- ============================================================================

-- Check if the problematic constraint exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'activities'
        AND tc.constraint_name = 'activities_assigned_to_fkey'
        AND ccu.table_schema = 'auth'
        AND ccu.table_name = 'users'
    ) THEN
        RAISE NOTICE 'Found problematic constraint: activities_assigned_to_fkey → auth.users';
        
        -- Drop the problematic constraint
        ALTER TABLE public.activities DROP CONSTRAINT activities_assigned_to_fkey;
        RAISE NOTICE 'Dropped constraint: activities_assigned_to_fkey';
        
        -- Add the correct constraint pointing to user_profiles
        ALTER TABLE public.activities ADD CONSTRAINT activities_assigned_to_fkey 
            FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id)
            ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Added correct constraint: activities_assigned_to_fkey → public.user_profiles';
    ELSE
        RAISE NOTICE 'activities_assigned_to_fkey constraint not found or already correct';
    END IF;
END $$;

-- ============================================================================
-- INITIATIVES TABLE: Fix owner_id constraint
-- ============================================================================

-- Check if the problematic constraint exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'initiatives'
        AND tc.constraint_name = 'initiatives_owner_id_fkey'
        AND ccu.table_schema = 'auth'
        AND ccu.table_name = 'users'
    ) THEN
        RAISE NOTICE 'Found problematic constraint: initiatives_owner_id_fkey → auth.users';
        
        -- Drop the problematic constraint
        ALTER TABLE public.initiatives DROP CONSTRAINT initiatives_owner_id_fkey;
        RAISE NOTICE 'Dropped constraint: initiatives_owner_id_fkey';
        
        -- Add the correct constraint pointing to user_profiles
        ALTER TABLE public.initiatives ADD CONSTRAINT initiatives_owner_id_fkey 
            FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id)
            ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Added correct constraint: initiatives_owner_id_fkey → public.user_profiles';
    ELSE
        RAISE NOTICE 'initiatives_owner_id_fkey constraint not found or already correct';
    END IF;
END $$;

-- ============================================================================
-- DATA INTEGRITY VALIDATION
-- ============================================================================

-- Check for orphaned records that might cause constraint violations
DO $$
DECLARE 
    orphaned_activities INTEGER;
    orphaned_initiatives INTEGER;
BEGIN
    -- Check for activities with assigned_to values not in user_profiles
    SELECT COUNT(*) INTO orphaned_activities
    FROM public.activities a
    WHERE a.assigned_to IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.id = a.assigned_to
    );
    
    -- Check for initiatives with owner_id values not in user_profiles
    SELECT COUNT(*) INTO orphaned_initiatives
    FROM public.initiatives i
    WHERE i.owner_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.id = i.owner_id
    );
    
    IF orphaned_activities > 0 THEN
        RAISE WARNING 'Found % activities with assigned_to values not in user_profiles', orphaned_activities;
        RAISE NOTICE 'These records will have assigned_to set to NULL to maintain integrity';
        
        -- Set orphaned assigned_to values to NULL
        UPDATE public.activities 
        SET assigned_to = NULL
        WHERE assigned_to IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = activities.assigned_to
        );
    END IF;
    
    IF orphaned_initiatives > 0 THEN
        RAISE WARNING 'Found % initiatives with owner_id values not in user_profiles', orphaned_initiatives;
        RAISE NOTICE 'These records will have owner_id set to NULL to maintain integrity';
        
        -- Set orphaned owner_id values to NULL
        UPDATE public.initiatives 
        SET owner_id = NULL
        WHERE owner_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = initiatives.owner_id
        );
    END IF;
    
    RAISE NOTICE 'Data integrity validation completed';
END $$;

-- ============================================================================
-- VERIFY CORRECT SCHEMA SEPARATION
-- ============================================================================

-- Create a verification function
CREATE OR REPLACE FUNCTION verify_schema_separation()
RETURNS TABLE(
    table_name TEXT,
    constraint_name TEXT,
    foreign_table_schema TEXT,
    foreign_table_name TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.table_name::TEXT,
        tc.constraint_name::TEXT,
        ccu.table_schema::TEXT,
        ccu.table_name::TEXT,
        CASE 
            WHEN ccu.table_schema = 'auth' AND ccu.table_name = 'users' THEN '❌ VIOLATION'
            WHEN ccu.table_schema = 'public' AND ccu.table_name = 'user_profiles' THEN '✅ CORRECT'
            ELSE '➡️ OTHER'
        END::TEXT as status
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND (ccu.table_name = 'users' OR ccu.table_name = 'user_profiles')
    ORDER BY tc.table_name, tc.constraint_name;
END;
$$ LANGUAGE plpgsql;

-- Run verification
DO $$
DECLARE
    rec RECORD;
    violation_count INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'SCHEMA SEPARATION VERIFICATION REPORT';
    RAISE NOTICE '============================================================================';
    
    FOR rec IN SELECT * FROM verify_schema_separation() LOOP
        RAISE NOTICE '% → %.%: %', rec.table_name, rec.foreign_table_schema, rec.foreign_table_name, rec.status;
        
        IF rec.status = '❌ VIOLATION' THEN
            violation_count := violation_count + 1;
        END IF;
    END LOOP;
    
    IF violation_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: No schema separation violations found!';
        RAISE NOTICE 'All public tables correctly reference user_profiles instead of auth.users';
    ELSE
        RAISE WARNING '❌ FAILED: Found % schema separation violations that need manual fixing', violation_count;
    END IF;
    
    RAISE NOTICE '============================================================================';
END $$;

-- Drop the verification function (cleanup)
DROP FUNCTION verify_schema_separation();

-- ============================================================================
-- FINAL VALIDATION AND STATUS
-- ============================================================================

-- Update table statistics after constraint changes
ANALYZE public.activities;
ANALYZE public.initiatives;
ANALYZE public.user_profiles;

-- Final status message
DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'FOREIGN KEY CONSTRAINT FIX COMPLETED';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '  1. activities.assigned_to now references public.user_profiles(id)';
    RAISE NOTICE '  2. initiatives.owner_id now references public.user_profiles(id)';
    RAISE NOTICE '  3. Orphaned references have been set to NULL for data integrity';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Update application code to use user_profiles consistently';
    RAISE NOTICE '  2. Test RLS policies with new constraint patterns';
    RAISE NOTICE '  3. Deploy remaining migrations';
    RAISE NOTICE '============================================================================';
END $$;

-- Add comment for documentation
COMMENT ON TABLE public.activities IS 'Activities table - assigned_to references user_profiles for proper schema separation';
COMMENT ON TABLE public.initiatives IS 'Initiatives table - owner_id references user_profiles for proper schema separation';
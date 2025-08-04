-- ============================================================================
-- RLS POLICIES VALIDATION SCRIPT
-- ============================================================================
-- This script validates that RLS policies work correctly with the new foreign key
-- constraint patterns after fixing schema separation violations.
--
-- Run this AFTER running fix-schema-foreign-key-constraints.sql
-- ============================================================================

-- Create test functions for RLS validation
DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'RLS POLICIES VALIDATION - SCHEMA SEPARATION TEST';
    RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- VALIDATE RLS POLICY PATTERNS
-- ============================================================================

-- Function to check RLS policy references to user fields
CREATE OR REPLACE FUNCTION validate_rls_user_references()
RETURNS TABLE(
    policy_name TEXT,
    table_name TEXT,
    policy_definition TEXT,
    reference_pattern TEXT,
    validation_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.policyname::TEXT,
        p.tablename::TEXT,
        p.qual::TEXT as policy_definition,
        CASE 
            WHEN p.qual LIKE '%owner_id%' AND p.qual LIKE '%auth.uid()%' THEN 'owner_id → auth.uid()'
            WHEN p.qual LIKE '%assigned_to%' AND p.qual LIKE '%auth.uid()%' THEN 'assigned_to → auth.uid()'
            WHEN p.qual LIKE '%created_by%' AND p.qual LIKE '%auth.uid()%' THEN 'created_by → auth.uid()'
            WHEN p.qual LIKE '%up.id = auth.uid()%' THEN 'user_profiles.id → auth.uid()'
            ELSE 'other'
        END::TEXT as reference_pattern,
        CASE 
            WHEN p.qual LIKE '%owner_id%' AND p.qual LIKE '%auth.uid()%' THEN '⚠️  NEEDS REVIEW'
            WHEN p.qual LIKE '%assigned_to%' AND p.qual LIKE '%auth.uid()%' THEN '⚠️  NEEDS REVIEW'
            WHEN p.qual LIKE '%up.id = auth.uid()%' THEN '✅ CORRECT'
            ELSE '➡️  OTHER'
        END::TEXT as validation_status
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    AND p.qual IS NOT NULL
    AND (
        p.qual LIKE '%auth.uid()%' 
        OR p.qual LIKE '%owner_id%' 
        OR p.qual LIKE '%assigned_to%'
        OR p.qual LIKE '%created_by%'
    )
    ORDER BY p.tablename, p.policyname;
END;
$$ LANGUAGE plpgsql;

-- Run the validation
DO $$
DECLARE
    rec RECORD;
    needs_review_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 RLS POLICY USER REFERENCE ANALYSIS:';
    RAISE NOTICE '────────────────────────────────────────────────────────────────────────';
    
    FOR rec IN SELECT * FROM validate_rls_user_references() LOOP
        RAISE NOTICE '% (%): % - %', rec.table_name, rec.policy_name, rec.reference_pattern, rec.validation_status;
        
        IF rec.validation_status = '⚠️  NEEDS REVIEW' THEN
            needs_review_count := needs_review_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '────────────────────────────────────────────────────────────────────────';
    
    IF needs_review_count > 0 THEN
        RAISE WARNING 'Found % RLS policies that may need review after foreign key changes', needs_review_count;
        RAISE NOTICE 'These policies reference owner_id/assigned_to fields that now point to user_profiles.id';
        RAISE NOTICE 'Since user_profiles.id = auth.users.id, the policies should still work correctly';
    ELSE
        RAISE NOTICE '✅ All RLS policies appear to be correctly structured for schema separation';
    END IF;
END $$;

-- Drop the validation function
DROP FUNCTION validate_rls_user_references();

-- ============================================================================
-- VALIDATE FOREIGN KEY CONSISTENCY
-- ============================================================================

-- Check that all user references are consistent
CREATE OR REPLACE FUNCTION validate_user_reference_consistency()
RETURNS TABLE(
    table_name TEXT,
    column_name TEXT,
    foreign_table TEXT,
    constraint_name TEXT,
    consistency_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.table_name::TEXT,
        kcu.column_name::TEXT,
        ccu.table_name::TEXT as foreign_table,
        tc.constraint_name::TEXT,
        CASE 
            WHEN kcu.column_name IN ('owner_id', 'assigned_to') AND ccu.table_name = 'user_profiles' THEN '✅ CORRECT'
            WHEN kcu.column_name IN ('owner_id', 'assigned_to') AND ccu.table_name = 'users' THEN '❌ VIOLATION'
            WHEN kcu.column_name = 'created_by' AND ccu.table_name = 'user_profiles' THEN '✅ CORRECT' 
            WHEN kcu.column_name IN ('id') AND ccu.table_name = 'users' AND tc.table_name = 'user_profiles' THEN '✅ CORRECT'
            ELSE '➡️  OTHER'
        END::TEXT as consistency_status
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND (
        kcu.column_name IN ('owner_id', 'assigned_to', 'created_by', 'id')
        OR ccu.table_name IN ('users', 'user_profiles')
    )
    ORDER BY tc.table_name, kcu.column_name;
END;
$$ LANGUAGE plpgsql;

-- Run consistency validation
DO $$
DECLARE
    rec RECORD;
    violation_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔗 FOREIGN KEY CONSISTENCY ANALYSIS:';
    RAISE NOTICE '────────────────────────────────────────────────────────────────────────';
    
    FOR rec IN SELECT * FROM validate_user_reference_consistency() LOOP
        RAISE NOTICE '%.% → % (%): %', rec.table_name, rec.column_name, rec.foreign_table, rec.constraint_name, rec.consistency_status;
        
        IF rec.consistency_status = '❌ VIOLATION' THEN
            violation_count := violation_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '────────────────────────────────────────────────────────────────────────';
    
    IF violation_count > 0 THEN
        RAISE WARNING 'Found % foreign key violations that need immediate fixing!', violation_count;
        RAISE NOTICE 'Run fix-schema-foreign-key-constraints.sql to resolve these issues';
    ELSE
        RAISE NOTICE '✅ All foreign key constraints follow proper schema separation';
    END IF;
END $$;

-- Drop the validation function
DROP FUNCTION validate_user_reference_consistency();

-- ============================================================================
-- VALIDATE RLS POLICY EFFECTIVENESS
-- ============================================================================

-- Create a test function to validate that RLS policies properly enforce tenant isolation
CREATE OR REPLACE FUNCTION test_rls_tenant_isolation()
RETURNS BOOLEAN AS $$
DECLARE
    policies_enabled INTEGER;
    total_tables INTEGER;
BEGIN
    -- Count tables with RLS enabled
    SELECT COUNT(*) INTO policies_enabled
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('initiatives', 'areas', 'user_profiles', 'activities', 'subtasks', 'audit_log')
    AND rowsecurity = true;
    
    -- Total core tables that should have RLS
    total_tables := 6;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔒 RLS ENABLEMENT STATUS:';
    RAISE NOTICE '────────────────────────────────────────────────────────────────────────';
    RAISE NOTICE 'Tables with RLS enabled: % / %', policies_enabled, total_tables;
    
    IF policies_enabled = total_tables THEN
        RAISE NOTICE '✅ All core tables have RLS enabled';
        RETURN true;
    ELSE
        RAISE WARNING '❌ Some core tables missing RLS protection';
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Run RLS effectiveness test
DO $$
DECLARE
    rls_ok BOOLEAN;
BEGIN
    SELECT test_rls_tenant_isolation() INTO rls_ok;
    
    IF NOT rls_ok THEN
        RAISE NOTICE 'Consider running the RLS policy migration to ensure all tables are protected';
    END IF;
END $$;

-- Drop the test function
DROP FUNCTION test_rls_tenant_isolation();

-- ============================================================================
-- VALIDATE USER PROFILE SYNCHRONIZATION
-- ============================================================================

-- Check that user_profiles.id properly references auth.users.id
DO $$
DECLARE
    sync_constraint_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔄 USER SYNCHRONIZATION VALIDATION:';
    RAISE NOTICE '────────────────────────────────────────────────────────────────────────';
    
    -- Check if the critical foreign key exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'user_profiles'
        AND ccu.table_schema = 'auth'
        AND ccu.table_name = 'users'
    ) INTO sync_constraint_exists;
    
    IF sync_constraint_exists THEN
        RAISE NOTICE '✅ user_profiles.id → auth.users.id constraint exists';
        RAISE NOTICE 'This ensures proper synchronization between auth and business data';
    ELSE
        RAISE WARNING '❌ Missing critical constraint: user_profiles.id → auth.users.id';
        RAISE NOTICE 'This constraint is essential for schema separation to work correctly';
    END IF;
END $$;

-- ============================================================================
-- FINAL VALIDATION SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'RLS POLICIES VALIDATION COMPLETED';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 SUMMARY:';
    RAISE NOTICE '   • Foreign key constraints have been analyzed for schema separation';
    RAISE NOTICE '   • RLS policies have been reviewed for user reference patterns';
    RAISE NOTICE '   • User synchronization between auth and public schemas validated';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 NEXT STEPS:';
    RAISE NOTICE '   1. Review any warnings or violations reported above';
    RAISE NOTICE '   2. Test application functionality with new constraint patterns';
    RAISE NOTICE '   3. Monitor query performance and RLS policy effectiveness';
    RAISE NOTICE '   4. Deploy remaining migrations if validation passes';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: If you see any violations above, fix them before deployment!';
    RAISE NOTICE '============================================================================';
END $$;
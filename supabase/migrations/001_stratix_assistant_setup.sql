-- Stratix Assistant Database Migration
-- This migration ensures all required tables and views exist for the Stratix Assistant

-- Check if initiatives_with_subtasks_summary view exists
DO $$
BEGIN
    -- The view is already defined in the schema, but let's ensure it exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'initiatives_with_subtasks_summary'
    ) THEN
        CREATE OR REPLACE VIEW public.initiatives_with_subtasks_summary AS
        SELECT
            -- Selecting all columns from the initiatives table for a complete overview
            i.id,
            i.tenant_id,
            i.area_id,
            i.created_by,
            i.owner_id,
            i.title,
            i.description,
            i.status,
            i.priority,
            i.progress AS initiative_progress, -- Renaming to avoid confusion with subtask progress
            i.target_date,
            i.completion_date,
            i.budget,
            i.actual_cost,
            i.created_at,
            i.updated_at,

            -- Aggregated data from subtasks
            -- Counts the total number of subtasks for each initiative. If none, returns 0.
            COUNT(s.id) AS subtask_count,

            -- Counts only the subtasks that are marked as completed.
            COUNT(s.id) FILTER (WHERE s.completed = true) AS completed_subtask_count,

            -- Calculates the completion rate of subtasks as a percentage.
            -- It handles the case of zero subtasks to avoid division by zero errors.
            CASE
                WHEN COUNT(s.id) = 0 THEN 0
                ELSE ROUND((COUNT(s.id) FILTER (WHERE s.completed = true) * 100.0) / COUNT(s.id), 2)
            END AS subtask_completion_rate

        FROM
            public.initiatives AS i
        -- We use a LEFT JOIN to ensure that all initiatives are included in the view,
        -- even if they don't have any subtasks yet.
        LEFT JOIN
            public.subtasks AS s ON i.id = s.initiative_id
        GROUP BY
            -- We must group by the primary key of the initiatives table to aggregate subtasks correctly.
            i.id;

        -- Add comment to the view
        COMMENT ON VIEW public.initiatives_with_subtasks_summary IS 'Provides a summary of initiatives along with their subtasks aggregation for Stratix Assistant';
    END IF;
END $$;

-- Create RLS policies if they don't exist
DO $$
BEGIN
    -- Enable RLS on initiatives table if not already enabled
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'initiatives' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Enable RLS on areas table if not already enabled
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'areas' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Enable RLS on subtasks table if not already enabled
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'subtasks' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Enable RLS on user_profiles table if not already enabled
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create basic RLS policies for tenant isolation
DO $$
BEGIN
    -- Policy for initiatives table
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'initiatives' 
        AND policyname = 'initiatives_tenant_isolation'
    ) THEN
        CREATE POLICY initiatives_tenant_isolation ON public.initiatives
        FOR ALL USING (
            tenant_id = (
                SELECT tenant_id 
                FROM public.user_profiles 
                WHERE id = auth.uid()
            )
        );
    END IF;

    -- Policy for areas table
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'areas' 
        AND policyname = 'areas_tenant_isolation'
    ) THEN
        CREATE POLICY areas_tenant_isolation ON public.areas
        FOR ALL USING (
            tenant_id = (
                SELECT tenant_id 
                FROM public.user_profiles 
                WHERE id = auth.uid()
            )
        );
    END IF;

    -- Policy for subtasks table
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'subtasks' 
        AND policyname = 'subtasks_tenant_isolation'
    ) THEN
        CREATE POLICY subtasks_tenant_isolation ON public.subtasks
        FOR ALL USING (
            tenant_id = (
                SELECT tenant_id 
                FROM public.user_profiles 
                WHERE id = auth.uid()
            )
        );
    END IF;

    -- Policy for user_profiles table
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'user_profiles_tenant_isolation'
    ) THEN
        CREATE POLICY user_profiles_tenant_isolation ON public.user_profiles
        FOR ALL USING (
            tenant_id = (
                SELECT tenant_id 
                FROM public.user_profiles 
                WHERE id = auth.uid()
            )
        );
    END IF;
END $$;

-- Grant necessary permissions for authenticated users
GRANT SELECT ON public.initiatives_with_subtasks_summary TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.initiatives TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.areas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtasks TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_id ON public.initiatives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_area_id ON public.initiatives(area_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_status ON public.initiatives(status);
CREATE INDEX IF NOT EXISTS idx_initiatives_progress ON public.initiatives(progress);

CREATE INDEX IF NOT EXISTS idx_areas_tenant_id ON public.areas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_areas_manager_id ON public.areas(manager_id);

CREATE INDEX IF NOT EXISTS idx_subtasks_initiative_id ON public.subtasks(initiative_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_tenant_id ON public.subtasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_completed ON public.subtasks(completed);

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Add any missing columns for compatibility
DO $$
BEGIN
    -- Check if 'role' column exists in user_profiles
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'role'
    ) THEN
        -- Create user_role type if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
            CREATE TYPE user_role AS ENUM ('Admin', 'Manager', 'Analyst', 'Viewer');
        END IF;
        
        ALTER TABLE public.user_profiles 
        ADD COLUMN role user_role NOT NULL DEFAULT 'Analyst'::user_role;
    END IF;
END $$;

-- Add comment to help identify this migration
COMMENT ON SCHEMA public IS 'Stratix Assistant enhanced schema with proper RLS and indexes';
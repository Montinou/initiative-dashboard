-- =============================================
-- Migration 002: Add Foreign Key Constraints
-- =============================================
-- This migration adds all foreign key constraints to establish
-- referential integrity between tables. Applied after base tables
-- are created to avoid circular dependency issues.

-- ============================================================
-- Foreign Key Constraints for Core Tables
-- ============================================================

-- Quarters table foreign keys
ALTER TABLE public.quarters
  ADD CONSTRAINT quarters_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES public.tenants(id) 
  ON DELETE CASCADE;

-- Areas table foreign keys
ALTER TABLE public.areas
  ADD CONSTRAINT areas_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES public.tenants(id) 
  ON DELETE CASCADE;

-- User profiles table foreign keys
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES public.tenants(id) 
  ON DELETE CASCADE;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_area_id_fkey 
  FOREIGN KEY (area_id) 
  REFERENCES public.areas(id) 
  ON DELETE SET NULL;

-- Note: The auth.users reference will be added only if auth schema exists
-- This is a conditional constraint for Supabase environments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES auth.users(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Now add the circular reference: areas.manager_id -> user_profiles.id
-- This must be done after user_profiles table exists
ALTER TABLE public.areas
  ADD CONSTRAINT areas_manager_id_fkey 
  FOREIGN KEY (manager_id) 
  REFERENCES public.user_profiles(id) 
  ON DELETE SET NULL;

-- Objectives table foreign keys
ALTER TABLE public.objectives
  ADD CONSTRAINT objectives_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES public.tenants(id) 
  ON DELETE CASCADE;

ALTER TABLE public.objectives
  ADD CONSTRAINT objectives_area_id_fkey 
  FOREIGN KEY (area_id) 
  REFERENCES public.areas(id) 
  ON DELETE CASCADE;

ALTER TABLE public.objectives
  ADD CONSTRAINT objectives_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES public.user_profiles(id) 
  ON DELETE SET NULL;

-- Objective quarters junction table foreign keys
ALTER TABLE public.objective_quarters
  ADD CONSTRAINT objective_quarters_objective_id_fkey 
  FOREIGN KEY (objective_id) 
  REFERENCES public.objectives(id) 
  ON DELETE CASCADE;

ALTER TABLE public.objective_quarters
  ADD CONSTRAINT objective_quarters_quarter_id_fkey 
  FOREIGN KEY (quarter_id) 
  REFERENCES public.quarters(id) 
  ON DELETE CASCADE;

-- Initiatives table foreign keys
ALTER TABLE public.initiatives
  ADD CONSTRAINT initiatives_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES public.tenants(id) 
  ON DELETE CASCADE;

ALTER TABLE public.initiatives
  ADD CONSTRAINT initiatives_area_id_fkey 
  FOREIGN KEY (area_id) 
  REFERENCES public.areas(id) 
  ON DELETE CASCADE;

ALTER TABLE public.initiatives
  ADD CONSTRAINT initiatives_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES public.user_profiles(id) 
  ON DELETE SET NULL;

-- Objective initiatives junction table foreign keys
ALTER TABLE public.objective_initiatives
  ADD CONSTRAINT objective_initiatives_objective_id_fkey 
  FOREIGN KEY (objective_id) 
  REFERENCES public.objectives(id) 
  ON DELETE CASCADE;

ALTER TABLE public.objective_initiatives
  ADD CONSTRAINT objective_initiatives_initiative_id_fkey 
  FOREIGN KEY (initiative_id) 
  REFERENCES public.initiatives(id) 
  ON DELETE CASCADE;

-- Activities table foreign keys
ALTER TABLE public.activities
  ADD CONSTRAINT activities_initiative_id_fkey 
  FOREIGN KEY (initiative_id) 
  REFERENCES public.initiatives(id) 
  ON DELETE CASCADE;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_assigned_to_fkey 
  FOREIGN KEY (assigned_to) 
  REFERENCES public.user_profiles(id) 
  ON DELETE SET NULL;

-- Progress history table foreign keys
ALTER TABLE public.progress_history
  ADD CONSTRAINT progress_history_initiative_id_fkey 
  FOREIGN KEY (initiative_id) 
  REFERENCES public.initiatives(id) 
  ON DELETE CASCADE;

ALTER TABLE public.progress_history
  ADD CONSTRAINT progress_history_updated_by_fkey 
  FOREIGN KEY (updated_by) 
  REFERENCES public.user_profiles(id) 
  ON DELETE SET NULL;

-- Uploaded files table foreign keys
ALTER TABLE public.uploaded_files
  ADD CONSTRAINT uploaded_files_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES public.tenants(id) 
  ON DELETE CASCADE;

ALTER TABLE public.uploaded_files
  ADD CONSTRAINT uploaded_files_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) 
  REFERENCES public.user_profiles(id) 
  ON DELETE SET NULL;

-- File areas junction table foreign keys
ALTER TABLE public.file_areas
  ADD CONSTRAINT file_areas_file_id_fkey 
  FOREIGN KEY (file_id) 
  REFERENCES public.uploaded_files(id) 
  ON DELETE CASCADE;

ALTER TABLE public.file_areas
  ADD CONSTRAINT file_areas_area_id_fkey 
  FOREIGN KEY (area_id) 
  REFERENCES public.areas(id) 
  ON DELETE CASCADE;

-- File initiatives junction table foreign keys
ALTER TABLE public.file_initiatives
  ADD CONSTRAINT file_initiatives_file_id_fkey 
  FOREIGN KEY (file_id) 
  REFERENCES public.uploaded_files(id) 
  ON DELETE CASCADE;

ALTER TABLE public.file_initiatives
  ADD CONSTRAINT file_initiatives_initiative_id_fkey 
  FOREIGN KEY (initiative_id) 
  REFERENCES public.initiatives(id) 
  ON DELETE CASCADE;

-- Audit log table foreign keys
ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.user_profiles(id) 
  ON DELETE SET NULL;

-- ============================================================
-- Additional constraints for data integrity
-- ============================================================

-- Ensure unique combinations in junction tables
CREATE UNIQUE INDEX IF NOT EXISTS idx_objective_initiatives_unique 
  ON public.objective_initiatives(objective_id, initiative_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_file_areas_unique 
  ON public.file_areas(file_id, area_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_file_initiatives_unique 
  ON public.file_initiatives(file_id, initiative_id);
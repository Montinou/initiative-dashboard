-- ============================================================
-- Migration 3: Add foreign key constraints
-- ============================================================
-- This migration adds all foreign key relationships between tables
-- The order is important to avoid circular dependency issues
-- ============================================================

-- Tenants foreign keys
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_organization_id_fkey 
  FOREIGN KEY (organization_id) 
  REFERENCES public.organizations(id)
  ON DELETE CASCADE;

-- Quarters foreign keys
ALTER TABLE public.quarters
  ADD CONSTRAINT quarters_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES public.tenants(id)
  ON DELETE CASCADE;

-- Areas foreign keys (except manager_id which has circular dependency)
ALTER TABLE public.areas
  ADD CONSTRAINT areas_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES public.tenants(id)
  ON DELETE CASCADE;

-- User profiles foreign keys
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

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- Now add the circular reference: areas.manager_id -> user_profiles.id
ALTER TABLE public.areas
  ADD CONSTRAINT areas_manager_id_fkey 
  FOREIGN KEY (manager_id) 
  REFERENCES public.user_profiles(id)
  ON DELETE SET NULL;

-- Objectives foreign keys
ALTER TABLE public.objectives
  ADD CONSTRAINT objectives_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES public.tenants(id)
  ON DELETE CASCADE;

ALTER TABLE public.objectives
  ADD CONSTRAINT objectives_area_id_fkey 
  FOREIGN KEY (area_id) 
  REFERENCES public.areas(id)
  ON DELETE SET NULL;

ALTER TABLE public.objectives
  ADD CONSTRAINT objectives_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES public.user_profiles(id)
  ON DELETE SET NULL;

-- Objective quarters foreign keys
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

-- Initiatives foreign keys
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

-- Objective initiatives foreign keys
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

-- Activities foreign keys
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

-- Progress history foreign keys
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

-- Uploaded files foreign keys
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

-- File areas foreign keys
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

-- File initiatives foreign keys
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

-- Audit log foreign keys
ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.user_profiles(id)
  ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON CONSTRAINT tenants_organization_id_fkey ON public.tenants IS 'Links tenants to their parent organization';
COMMENT ON CONSTRAINT areas_manager_id_fkey ON public.areas IS 'Links areas to their manager (user_profile)';
COMMENT ON CONSTRAINT user_profiles_area_id_fkey ON public.user_profiles IS 'Links user profiles to their assigned area';
COMMENT ON CONSTRAINT user_profiles_user_id_fkey ON public.user_profiles IS 'Links user profiles to auth.users via public.users sync table';
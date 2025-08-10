-- ============================================================
-- Migration 11: Enable RLS and Org Admin policies (final)
-- ============================================================
-- Scope: Org admin tables and Invitations public token access
-- Notes: Invitations base RLS exists in 2025-01-08 migration. Here we
--        only add the public-by-token policy (no CRUD duplicates), and enforce
--        organization_settings policies for Admin/CEO.
-- ============================================================

-- Enable and force RLS on tables (idempotent)
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY; ALTER TABLE public.organization_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invitations            ENABLE ROW LEVEL SECURITY; ALTER TABLE public.invitations            FORCE ROW LEVEL SECURITY;

-- ============================================================
-- Organization Settings policies
-- ============================================================
DROP POLICY IF EXISTS "Settings: CEO/Admin can view their tenant settings" ON public.organization_settings;
CREATE POLICY "Settings: CEO/Admin can view their tenant settings"
  ON public.organization_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = organization_settings.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

DROP POLICY IF EXISTS "Settings: CEO/Admin can insert settings" ON public.organization_settings;
CREATE POLICY "Settings: CEO/Admin can insert settings"
  ON public.organization_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = organization_settings.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

DROP POLICY IF EXISTS "Settings: CEO/Admin can update settings" ON public.organization_settings;
CREATE POLICY "Settings: CEO/Admin can update settings"
  ON public.organization_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = organization_settings.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = organization_settings.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

DROP POLICY IF EXISTS "Settings: CEO/Admin can delete settings" ON public.organization_settings;
CREATE POLICY "Settings: CEO/Admin can delete settings"
  ON public.organization_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = organization_settings.tenant_id
        AND up.role IN ('CEO','Admin')
    )
  );

-- ============================================================
-- Invitations: public-by-token policy (read-only)
-- ============================================================
-- Allows reading an invitation when a secure token is provided via GUC
-- app.invitation_token. You must set it in the session when needed.
DROP POLICY IF EXISTS "Invitations: Public can view invitation by token" ON public.invitations;
CREATE POLICY "Invitations: Public can view invitation by token"
  ON public.invitations FOR SELECT
  USING (
    token = current_setting('app.invitation_token', true)
    AND status = 'sent'
    AND expires_at > now()
  );

-- Removed duplicated CRUD policy for invitations to avoid overlap with 2025-01-08 migration
-- (Previously: "Invitations: CEO/Admin can manage")

-- End of migration

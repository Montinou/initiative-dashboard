-- ============================================================
-- Migration: Create Invitations Table
-- ============================================================
-- This migration creates the invitations table for managing user invitations
-- with proper tracking of status, expiration, and related metadata
-- ============================================================

-- Create invitation status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('sent', 'accepted', 'expired', 'cancelled', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop existing invitations table if it exists with different structure
DROP TABLE IF EXISTS public.invitations CASCADE;

-- Create invitations table with all fields
CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  role user_role NOT NULL,
  area_id uuid, -- Optional area assignment
  status invitation_status NOT NULL DEFAULT 'sent',
  custom_message text,
  sent_by uuid NOT NULL, -- User who sent the invitation
  token text NOT NULL UNIQUE, -- Invitation token for verification
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  accepted_by uuid, -- User ID who accepted (after account creation)
  last_reminder_sent timestamp with time zone,
  reminder_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}', -- Additional metadata for future use
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- Constraints
  CONSTRAINT invitations_pkey PRIMARY KEY (id),
  CONSTRAINT invitations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT invitations_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT invitations_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE SET NULL,
  CONSTRAINT invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  CONSTRAINT check_expiration CHECK (expires_at > created_at),
  CONSTRAINT check_valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$')
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON public.invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_sent_by ON public.invitations(sent_by);

-- Enable Row Level Security
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invitations
-- Policy: Users can view invitations in their tenant
CREATE POLICY "Users can view invitations in their tenant"
  ON public.invitations
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only CEOs and Admins can create invitations
CREATE POLICY "CEOs and Admins can create invitations"
  ON public.invitations
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid()
      AND role IN ('CEO', 'Admin')
    )
  );

-- Policy: Only CEOs and Admins can update invitations
CREATE POLICY "CEOs and Admins can update invitations"
  ON public.invitations
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid()
      AND role IN ('CEO', 'Admin')
    )
  );

-- Policy: Only CEOs and Admins can delete invitations
CREATE POLICY "CEOs and Admins can delete invitations"
  ON public.invitations
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid()
      AND role IN ('CEO', 'Admin')
    )
  );

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_invitations_updated_at_trigger
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitations_updated_at();

-- Create function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE public.invitations
  SET status = 'expired'
  WHERE status IN ('sent', 'pending')
    AND expires_at < timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to expire invitations (if using pg_cron)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('expire-invitations', '0 * * * *', 'SELECT expire_old_invitations();');

-- Add comments for documentation
COMMENT ON TABLE public.invitations IS 'Stores user invitations for organization onboarding';
COMMENT ON COLUMN public.invitations.id IS 'Unique identifier for the invitation';
COMMENT ON COLUMN public.invitations.tenant_id IS 'Reference to the tenant/organization';
COMMENT ON COLUMN public.invitations.email IS 'Email address of the invited user';
COMMENT ON COLUMN public.invitations.role IS 'Assigned role for the invited user';
COMMENT ON COLUMN public.invitations.area_id IS 'Optional pre-assigned area for the user';
COMMENT ON COLUMN public.invitations.status IS 'Current status of the invitation';
COMMENT ON COLUMN public.invitations.custom_message IS 'Optional custom message included with the invitation';
COMMENT ON COLUMN public.invitations.sent_by IS 'User who sent the invitation';
COMMENT ON COLUMN public.invitations.token IS 'Unique token for invitation verification';
COMMENT ON COLUMN public.invitations.expires_at IS 'Expiration timestamp for the invitation';
COMMENT ON COLUMN public.invitations.accepted_at IS 'Timestamp when invitation was accepted';
COMMENT ON COLUMN public.invitations.accepted_by IS 'User ID of who accepted the invitation';
COMMENT ON COLUMN public.invitations.last_reminder_sent IS 'Timestamp of last reminder email';
COMMENT ON COLUMN public.invitations.reminder_count IS 'Number of reminder emails sent';
COMMENT ON COLUMN public.invitations.metadata IS 'Additional metadata in JSON format';
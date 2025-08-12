-- Migration: Enhance invitations table for Phase 2 implementation
-- Date: 2025-01-12
-- Description: Adds email tracking, bulk operations, and analytics support

-- Add new columns to invitations table for enhanced tracking
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS email_delivered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS email_opened_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS email_clicked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS onboarding_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS invitation_type text DEFAULT 'single' CHECK (invitation_type IN ('single', 'bulk')),
ADD COLUMN IF NOT EXISTS parent_invitation_id uuid REFERENCES invitations(id),
ADD COLUMN IF NOT EXISTS brevo_message_id text,
ADD COLUMN IF NOT EXISTS brevo_batch_id text,
ADD COLUMN IF NOT EXISTS device_info jsonb,
ADD COLUMN IF NOT EXISTS referral_source text,
ADD COLUMN IF NOT EXISTS email_provider text DEFAULT 'brevo',
ADD COLUMN IF NOT EXISTS resend_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error text,
ADD COLUMN IF NOT EXISTS template_id text,
ADD COLUMN IF NOT EXISTS template_variables jsonb DEFAULT '{}'::jsonb;

-- Create index for email tracking
CREATE INDEX IF NOT EXISTS idx_invitations_brevo_message_id 
ON public.invitations(brevo_message_id) 
WHERE brevo_message_id IS NOT NULL;

-- Create index for bulk operations
CREATE INDEX IF NOT EXISTS idx_invitations_parent_id 
ON public.invitations(parent_invitation_id) 
WHERE parent_invitation_id IS NOT NULL;

-- Create index for status and expiry queries
CREATE INDEX IF NOT EXISTS idx_invitations_status_expires 
ON public.invitations(status, expires_at) 
WHERE status IN ('sent', 'pending');

-- Create invitation analytics table
CREATE TABLE IF NOT EXISTS public.invitation_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id uuid NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'created', 'sent', 'delivered', 'bounced', 'opened', 
    'clicked', 'accepted', 'expired', 'cancelled', 'resent'
  )),
  event_timestamp timestamp with time zone NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invitation_analytics_invitation_event_unique 
    UNIQUE(invitation_id, event_type, event_timestamp)
);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_invitation_analytics_invitation 
ON public.invitation_analytics(invitation_id);

CREATE INDEX IF NOT EXISTS idx_invitation_analytics_event_type 
ON public.invitation_analytics(event_type);

CREATE INDEX IF NOT EXISTS idx_invitation_analytics_timestamp 
ON public.invitation_analytics(event_timestamp);

-- Create invitation batches table for bulk operations
CREATE TABLE IF NOT EXISTS public.invitation_batches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  batch_name text,
  total_count integer NOT NULL DEFAULT 0,
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  accepted_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'partial'
  )),
  email_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_role text NOT NULL,
  default_area_id uuid REFERENCES areas(id),
  default_message text,
  template_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for batch operations
CREATE INDEX IF NOT EXISTS idx_invitation_batches_tenant 
ON public.invitation_batches(tenant_id);

CREATE INDEX IF NOT EXISTS idx_invitation_batches_created_by 
ON public.invitation_batches(created_by);

CREATE INDEX IF NOT EXISTS idx_invitation_batches_status 
ON public.invitation_batches(status);

-- Create invitation templates table
CREATE TABLE IF NOT EXISTS public.invitation_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  description text,
  subject text NOT NULL,
  html_content text NOT NULL,
  text_content text,
  template_variables jsonb DEFAULT '{}'::jsonb,
  brevo_template_id integer,
  role text,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invitation_templates_unique_name UNIQUE(tenant_id, name)
);

-- Create indexes for templates
CREATE INDEX IF NOT EXISTS idx_invitation_templates_tenant 
ON public.invitation_templates(tenant_id);

CREATE INDEX IF NOT EXISTS idx_invitation_templates_role 
ON public.invitation_templates(role) 
WHERE role IS NOT NULL;

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE invitations
  SET 
    status = 'expired',
    updated_at = now()
  WHERE 
    status IN ('sent', 'pending')
    AND expires_at < now()
    AND status != 'expired';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to track invitation events
CREATE OR REPLACE FUNCTION track_invitation_event(
  p_invitation_id uuid,
  p_event_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_analytics_id uuid;
BEGIN
  -- Insert analytics record
  INSERT INTO invitation_analytics (
    invitation_id,
    event_type,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    p_invitation_id,
    p_event_type,
    p_metadata,
    p_ip_address,
    p_user_agent
  )
  ON CONFLICT (invitation_id, event_type, event_timestamp) 
  DO NOTHING
  RETURNING id INTO v_analytics_id;
  
  -- Update invitation record based on event type
  CASE p_event_type
    WHEN 'sent' THEN
      UPDATE invitations 
      SET email_sent_at = now() 
      WHERE id = p_invitation_id AND email_sent_at IS NULL;
    WHEN 'delivered' THEN
      UPDATE invitations 
      SET email_delivered_at = now() 
      WHERE id = p_invitation_id AND email_delivered_at IS NULL;
    WHEN 'opened' THEN
      UPDATE invitations 
      SET email_opened_at = now() 
      WHERE id = p_invitation_id AND email_opened_at IS NULL;
    WHEN 'clicked' THEN
      UPDATE invitations 
      SET email_clicked_at = now() 
      WHERE id = p_invitation_id AND email_clicked_at IS NULL;
    WHEN 'accepted' THEN
      UPDATE invitations 
      SET 
        status = 'accepted',
        accepted_at = now(),
        updated_at = now()
      WHERE id = p_invitation_id;
    ELSE
      -- Do nothing for other events
  END CASE;
  
  RETURN v_analytics_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for new tables

-- Enable RLS on new tables
ALTER TABLE public.invitation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_templates ENABLE ROW LEVEL SECURITY;

-- Invitation analytics policies
CREATE POLICY "Users can view analytics for their tenant's invitations"
ON public.invitation_analytics FOR SELECT
USING (
  invitation_id IN (
    SELECT id FROM invitations 
    WHERE tenant_id = (
      SELECT tenant_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Invitation batches policies
CREATE POLICY "CEO and Admin can manage invitation batches"
ON public.invitation_batches FOR ALL
USING (
  tenant_id = (
    SELECT tenant_id FROM user_profiles 
    WHERE user_id = auth.uid()
  )
  AND (
    SELECT role FROM user_profiles 
    WHERE user_id = auth.uid()
  ) IN ('CEO', 'Admin')
);

CREATE POLICY "Managers can view batches"
ON public.invitation_batches FOR SELECT
USING (
  tenant_id = (
    SELECT tenant_id FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Invitation templates policies
CREATE POLICY "CEO and Admin can manage templates"
ON public.invitation_templates FOR ALL
USING (
  tenant_id = (
    SELECT tenant_id FROM user_profiles 
    WHERE user_id = auth.uid()
  )
  AND (
    SELECT role FROM user_profiles 
    WHERE user_id = auth.uid()
  ) IN ('CEO', 'Admin')
);

CREATE POLICY "All users can view active templates"
ON public.invitation_templates FOR SELECT
USING (
  tenant_id = (
    SELECT tenant_id FROM user_profiles 
    WHERE user_id = auth.uid()
  )
  AND is_active = true
);

-- Grant permissions
GRANT ALL ON public.invitation_analytics TO authenticated;
GRANT ALL ON public.invitation_batches TO authenticated;
GRANT ALL ON public.invitation_templates TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.invitation_analytics IS 'Tracks all invitation events for analytics and monitoring';
COMMENT ON TABLE public.invitation_batches IS 'Manages bulk invitation operations';
COMMENT ON TABLE public.invitation_templates IS 'Stores reusable invitation email templates';
COMMENT ON FUNCTION expire_old_invitations() IS 'Automatically expires invitations past their expiry date';
COMMENT ON FUNCTION track_invitation_event(uuid, text, jsonb, inet, text) IS 'Records invitation events and updates invitation status';
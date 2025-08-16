-- Create invitation templates table
CREATE TABLE IF NOT EXISTS public.invitation_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  role user_role NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  text_content text,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_by uuid REFERENCES public.user_profiles(id),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_default_per_role_tenant UNIQUE (tenant_id, role, is_default) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Create index for faster lookups
CREATE INDEX idx_invitation_templates_tenant_role ON public.invitation_templates(tenant_id, role, is_active);
CREATE INDEX idx_invitation_templates_default ON public.invitation_templates(tenant_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.invitation_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Templates viewable by tenant users" ON public.invitation_templates
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Templates manageable by CEO and Admin" ON public.invitation_templates
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles 
      WHERE user_id = auth.uid() AND role IN ('CEO', 'Admin')
    )
  );

-- Function to ensure only one default template per role per tenant
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Set all other templates for this role and tenant to non-default
    UPDATE public.invitation_templates
    SET is_default = false
    WHERE tenant_id = NEW.tenant_id 
      AND role = NEW.role 
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default template management
CREATE TRIGGER ensure_single_default_template_trigger
  BEFORE INSERT OR UPDATE ON public.invitation_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_template();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.invitation_templates
  SET usage_count = usage_count + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default templates for each role
INSERT INTO public.invitation_templates (
  tenant_id,
  name,
  description,
  role,
  subject,
  html_content,
  text_content,
  variables,
  is_active,
  is_default
) 
SELECT 
  t.id as tenant_id,
  'Default ' || r.role || ' Invitation' as name,
  'Standard invitation template for ' || r.role || ' role' as description,
  r.role::user_role,
  'You''re invited to join {{organizationName}} as {{role}}' as subject,
  '<html><body>
    <h2>Welcome to {{organizationName}}!</h2>
    <p>Hi {{recipientEmail}},</p>
    <p>{{inviterName}} has invited you to join {{organizationName}} as a {{role}}.</p>
    {{#if customMessage}}
    <blockquote>{{customMessage}}</blockquote>
    {{/if}}
    {{#if areaName}}
    <p>You will be working in the <strong>{{areaName}}</strong> area.</p>
    {{/if}}
    <p>Your invitation expires in {{daysRemaining}} days.</p>
    <a href="{{acceptUrl}}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
    <p>Or copy this link: {{acceptUrl}}</p>
    <p>Best regards,<br>The {{organizationName}} Team</p>
  </body></html>' as html_content,
  'Welcome to {{organizationName}}!
  
Hi {{recipientEmail}},

{{inviterName}} has invited you to join {{organizationName}} as a {{role}}.

{{#if customMessage}}{{customMessage}}{{/if}}

{{#if areaName}}You will be working in the {{areaName}} area.{{/if}}

Your invitation expires in {{daysRemaining}} days.

Accept your invitation here: {{acceptUrl}}

Best regards,
The {{organizationName}} Team' as text_content,
  '[
    {"name": "organizationName", "required": true, "description": "Organization name"},
    {"name": "recipientEmail", "required": true, "description": "Recipient email"},
    {"name": "inviterName", "required": true, "description": "Inviter full name"},
    {"name": "role", "required": true, "description": "Invited role"},
    {"name": "acceptUrl", "required": true, "description": "Invitation acceptance URL"},
    {"name": "daysRemaining", "required": true, "description": "Days until expiration"},
    {"name": "customMessage", "required": false, "description": "Custom message from inviter"},
    {"name": "areaName", "required": false, "description": "Assigned area name"}
  ]'::jsonb as variables,
  true as is_active,
  true as is_default
FROM public.tenants t
CROSS JOIN (
  SELECT 'CEO' as role
  UNION SELECT 'Admin'
  UNION SELECT 'Manager'
) r
ON CONFLICT (tenant_id, role, is_default) 
DO UPDATE SET updated_at = CURRENT_TIMESTAMP;
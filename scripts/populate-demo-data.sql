-- Demo Data Population Script
-- Run this after the reset-database.sql script

-- Production-ready function to auto-assign tenant_id for new users
-- This function uses configurable domain mapping set by tenant admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  tenant_uuid UUID;
  user_email TEXT;
  email_domain TEXT;
  domain_config RECORD;
  tenant_settings JSONB;
  default_role TEXT := 'analyst';
  require_approval BOOLEAN := false;
BEGIN
  -- Get email from the new user
  user_email := NEW.email;
  email_domain := split_part(user_email, '@', 2);
  
  -- First priority: Check if tenant_id is explicitly provided in metadata
  IF NEW.raw_user_meta_data ? 'tenant_id' THEN
    tenant_uuid := (NEW.raw_user_meta_data ->> 'tenant_id')::UUID;
  ELSE
    -- Second priority: Look up domain in tenant_domains configuration
    SELECT td.tenant_id INTO tenant_uuid
    FROM tenant_domains td
    WHERE td.domain = email_domain 
      AND td.is_active = true
    LIMIT 1;
    
    -- If no domain mapping found, check for wildcard or fallback settings
    IF tenant_uuid IS NULL THEN
      -- Check if any tenant has invite_only_mode disabled (accepts any domain)
      SELECT t.id INTO tenant_uuid
      FROM tenants t
      JOIN tenant_settings ts ON t.id = ts.tenant_id
      WHERE ts.setting_key = 'invite_only_mode'
        AND (ts.setting_value ->> 'enabled')::boolean = false
      LIMIT 1;
    END IF;
    
    -- If still no tenant found, raise error
    IF tenant_uuid IS NULL THEN
      RAISE EXCEPTION 'No tenant configured for email domain: %. Contact your administrator to configure domain access.', email_domain;
    END IF;
  END IF;
  
  -- Get tenant-specific settings for user creation
  SELECT ts.setting_value INTO tenant_settings
  FROM tenant_settings ts
  WHERE ts.tenant_id = tenant_uuid 
    AND ts.setting_key = 'auto_assign_domain';
  
  -- Extract settings or use defaults
  IF tenant_settings IS NOT NULL THEN
    default_role := COALESCE(tenant_settings ->> 'default_role', 'analyst');
    require_approval := COALESCE((tenant_settings ->> 'require_approval')::boolean, false);
  END IF;
  
  -- Insert into public.users table with proper tenant assignment
  INSERT INTO public.users (id, tenant_id, email, name, role, area_id)
  VALUES (
    NEW.id,
    tenant_uuid,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'role', default_role),
    (NEW.raw_user_meta_data ->> 'area_id')::UUID
  );
  
  -- TODO: If require_approval is true, send notification to tenant admins
  -- TODO: Set user as pending approval status if required
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth.users (uncomment when deploying to production)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Access control function for admin panel features
CREATE OR REPLACE FUNCTION public.check_admin_access(p_user_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_tenant UUID;
BEGIN
  -- Get user role and tenant from users table
  SELECT role, tenant_id INTO user_role, user_tenant
  FROM users 
  WHERE id = p_user_id;
  
  -- Check if user exists and belongs to the tenant
  IF user_tenant IS NULL OR user_tenant != p_tenant_id THEN
    RETURN FALSE;
  END IF;
  
  -- Only CEOs and Admins can access admin panel features
  RETURN user_role IN ('ceo', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin helper functions for domain management (with access control)
CREATE OR REPLACE FUNCTION public.add_tenant_domain(
  p_tenant_id UUID,
  p_domain TEXT,
  p_is_active BOOLEAN DEFAULT true
) RETURNS UUID AS $$
DECLARE
  domain_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user ID from auth context
  current_user_id := auth.uid();
  
  -- Check admin access
  IF NOT public.check_admin_access(current_user_id, p_tenant_id) THEN
    RAISE EXCEPTION 'Access denied. Only CEOs and Admins can manage domain settings.';
  END IF;
  
  -- Validate that the tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant not found: %', p_tenant_id;
  END IF;
  
  -- Insert new domain configuration
  INSERT INTO tenant_domains (tenant_id, domain, is_active)
  VALUES (p_tenant_id, p_domain, p_is_active)
  RETURNING id INTO domain_id;
  
  RETURN domain_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_tenant_setting(
  p_tenant_id UUID,
  p_setting_key TEXT,
  p_setting_value JSONB
) RETURNS VOID AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user ID from auth context
  current_user_id := auth.uid();
  
  -- Check admin access
  IF NOT public.check_admin_access(current_user_id, p_tenant_id) THEN
    RAISE EXCEPTION 'Access denied. Only CEOs and Admins can manage tenant settings.';
  END IF;
  
  -- Validate that the tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant not found: %', p_tenant_id;
  END IF;
  
  -- Upsert the setting
  INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
  VALUES (p_tenant_id, p_setting_key, p_setting_value)
  ON CONFLICT (tenant_id, setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Additional admin functions for frontend use
CREATE OR REPLACE FUNCTION public.remove_tenant_domain(
  p_domain_id UUID
) RETURNS VOID AS $$
DECLARE
  current_user_id UUID;
  domain_tenant_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Get tenant_id for the domain
  SELECT tenant_id INTO domain_tenant_id 
  FROM tenant_domains 
  WHERE id = p_domain_id;
  
  IF domain_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Domain not found: %', p_domain_id;
  END IF;
  
  -- Check admin access
  IF NOT public.check_admin_access(current_user_id, domain_tenant_id) THEN
    RAISE EXCEPTION 'Access denied. Only CEOs and Admins can remove domains.';
  END IF;
  
  DELETE FROM tenant_domains WHERE id = p_domain_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_tenant_admin_info()
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  user_role TEXT,
  can_manage_domains BOOLEAN,
  can_manage_settings BOOLEAN
) AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    u.tenant_id,
    t.name as tenant_name,
    u.role as user_role,
    (u.role IN ('ceo', 'admin')) as can_manage_domains,
    (u.role IN ('ceo', 'admin')) as can_manage_settings
  FROM users u
  JOIN tenants t ON u.tenant_id = t.id
  WHERE u.id = current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert Demo Users (these UUIDs should match the ones created in Supabase Auth)
-- Note: area_id will be populated using area name lookups after areas are created

-- STRATIX DEMO USERS
INSERT INTO users (id, tenant_id, area_id, email, name, role) VALUES 
('aa111111-1111-1111-1111-111111111111', '1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 
  (SELECT id FROM areas WHERE tenant_id = '1cee14d6-1dd6-4db3-9d91-d1a36101eba3' AND name = 'Administración' LIMIT 1), 
  'ceo@stratix-demo.com', 'Sarah Chen', 'ceo'),
('11111111-1111-1111-1111-111111111112', '1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 6, 'admin@stratix-demo.com', 'Michael Rodriguez', 'admin'),
('11111111-1111-1111-1111-111111111113', '1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 2, 'manager@stratix-demo.com', 'Emily Johnson', 'manager'),
('11111111-1111-1111-1111-111111111114', '1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 3, 'analyst@stratix-demo.com', 'David Kim', 'analyst');

-- FEMA ELECTRICIDAD USERS
INSERT INTO users (id, tenant_id, area_id, email, name, role) VALUES 
('22222222-2222-2222-2222-222222222221', 'e4420764-4e09-4377-be18-98b0df9f02e1', 1, 'ceo@fema-electricidad.com', 'Lucas Ferrero', 'ceo'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 'e4420764-4e09-4377-be18-98b0df9f02e1', 6, 'admin@fema-electricidad.com', 'Administrador Sistema', 'admin'),
('22222222-2222-2222-2222-222222222223', 'e4420764-4e09-4377-be18-98b0df9f02e1', 1, 'jefe.electricidad@fema-electricidad.com', 'Jefe División Electricidad', 'manager'),
('22222222-2222-2222-2222-222222222224', 'e4420764-4e09-4377-be18-98b0df9f02e1', 2, 'jefe.iluminacion@fema-electricidad.com', 'Jefe División Iluminación', 'manager'),
('22222222-2222-2222-2222-222222222225', 'e4420764-4e09-4377-be18-98b0df9f02e1', 3, 'jefe.industria@fema-electricidad.com', 'Jefe División Industria', 'manager'),
('22222222-2222-2222-2222-222222222226', 'e4420764-4e09-4377-be18-98b0df9f02e1', 4, 'gerente.ecommerce@fema-electricidad.com', 'Gerente E-commerce', 'manager'),
('22222222-2222-2222-2222-222222222227', 'e4420764-4e09-4377-be18-98b0df9f02e1', 8, 'analista.gestion@fema-electricidad.com', 'Analista de Gestión', 'analyst');

-- SIGA TURISMO USERS  
INSERT INTO users (id, tenant_id, area_id, email, name, role) VALUES 
('33333333-3333-3333-3333-333333333331', 'f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 1, 'ceo@siga-turismo.com', 'Carmen Mendoza', 'ceo'),
('33333333-3333-3333-3333-333333333332', 'f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 6, 'admin@siga-turismo.com', 'Roberto Admin', 'admin'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 'f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 1, 'manager.operaciones@siga-turismo.com', 'Manager Operaciones', 'manager'),
('33333333-3333-3333-3333-333333333334', 'f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 2, 'manager.reservas@siga-turismo.com', 'Manager Reservas', 'manager'),
('33333333-3333-3333-3333-333333333335', 'f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 3, 'analista.marketing@siga-turismo.com', 'Analista Marketing', 'analyst');

-- Insert Demo Initiatives for STRATIX DEMO
INSERT INTO initiatives (tenant_id, area_id, owner_id, title, description, progress, status, obstacles, enablers, target_date) VALUES 
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 1, '11111111-1111-1111-1111-111111111113', 'Lanzamiento Dashboard v2.0', 'Nueva versión del dashboard con IA integrada', 75, 'En Curso', 'Integración con APIs externas', 'Equipo dedicado de desarrollo', '2025-03-15'),
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 2, '11111111-1111-1111-1111-111111111113', 'Campaña Marketing Q1', 'Estrategia de marketing para primer trimestre', 60, 'En Curso', 'Presupuesto limitado', 'Nuevas herramientas digitales', '2025-02-28'),
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 3, '11111111-1111-1111-1111-111111111114', 'Migración Cloud AWS', 'Migración completa de infraestructura', 40, 'En Curso', 'Complejidad de datos legacy', 'Soporte técnico AWS', '2025-04-30'),
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 4, '11111111-1111-1111-1111-111111111112', 'Programa Capacitación 2025', 'Plan anual de capacitación del personal', 85, 'En Curso', 'Coordinación de horarios', 'Plataforma e-learning', '2025-12-31'),
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 5, '11111111-1111-1111-1111-111111111112', 'Optimización Procesos', 'Automatización de procesos manuales', 55, 'En Curso', 'Resistencia al cambio', 'Herramientas de automatización', '2025-06-30');

-- Insert Demo Initiatives for FEMA ELECTRICIDAD
INSERT INTO initiatives (tenant_id, area_id, owner_id, title, description, progress, status, obstacles, enablers, target_date) VALUES 
('e4420764-4e09-4377-be18-98b0df9f02e1', 1, '22222222-2222-2222-2222-222222222223', 'Lanzamiento nueva línea domótica', 'Productos inteligentes para el hogar', 75, 'En Curso', 'Certificaciones pendientes', 'Alianza con fabricantes', '2025-04-15'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 2, '22222222-2222-2222-2222-222222222224', 'Certificación productos LED', 'Certificación IRAM para nueva línea', 90, 'En Curso', 'Trámites burocráticos', 'Laboratorio certificado', '2025-02-28'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 2, '22222222-2222-2222-2222-222222222224', 'Sistema iluminación inteligente', 'IoT para control de iluminación', 60, 'En Curso', 'Desarrollo de software', 'Equipo de ingeniería', '2025-05-30'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 3, '22222222-2222-2222-2222-222222222225', 'Soluciones para minería', 'Equipos especializados sector minero', 25, 'Atrasado', 'Recursos limitados', 'Contactos en el sector', '2025-07-15'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 4, '22222222-2222-2222-2222-222222222226', 'Rediseño femastore.com.ar', 'Nueva plataforma e-commerce', 85, 'En Curso', 'Migración de datos', 'Equipo de desarrollo', '2025-03-31'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 5, 'e4420764-4e09-4377-be18-98b0df9f02e1', 'Optimización stock en depósito', 'Sistema WMS implementación', 50, 'En Curso', 'Capacitación personal', 'Software especializado', '2025-04-30'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 8, '22222222-2222-2222-2222-222222222227', 'Implementación CRM', 'Sistema gestión de clientes', 50, 'En Curso', 'Integración con sistemas', 'Consultor especializado', '2025-05-15');

-- Insert Demo Initiatives for SIGA TURISMO
INSERT INTO initiatives (tenant_id, area_id, owner_id, title, description, progress, status, obstacles, enablers, target_date) VALUES 
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 1, 'f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 'Circuito Salta Premium', 'Tour premium por quebrada de Humahuaca', 80, 'En Curso', 'Permisos municipales', 'Alianza con hoteles', '2025-03-01'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 2, '33333333-3333-3333-3333-333333333334', 'Sistema Reservas Online', 'Plataforma de reservas automatizada', 65, 'En Curso', 'Integración con pagos', 'Equipo desarrollo', '2025-04-15'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 3, '33333333-3333-3333-3333-333333333335', 'Campaña Digital Verano', 'Marketing para temporada alta', 90, 'En Curso', 'Competencia intensa', 'Influencers locales', '2025-02-15'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 4, 'f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 'Capacitación Guías', 'Programa certificación guías turísticos', 70, 'En Curso', 'Disponibilidad de guías', 'Apoyo gobierno provincial', '2025-06-30'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 5, '33333333-3333-3333-3333-333333333334', 'Partnership Hoteles', 'Acuerdos comerciales con hoteles', 45, 'En Curso', 'Negociación tarifas', 'Red de contactos', '2025-05-31'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 7, '33333333-3333-3333-3333-333333333332', 'App Móvil Turística', 'Aplicación para turistas', 35, 'En Curso', 'Recursos de desarrollo', 'Diseño UX completado', '2025-08-15');

COMMIT;
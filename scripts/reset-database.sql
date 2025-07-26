-- Database Reset Script
-- This script cleans all existing data and sets up fresh demo data for all three organizations

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS initiatives CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS areas CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Recreate tables with proper structure
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    industry TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    parent_area_id UUID REFERENCES areas(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    area_id UUID REFERENCES areas(id),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ceo', 'admin', 'manager', 'analyst')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE initiatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    area_id UUID REFERENCES areas(id),
    owner_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status TEXT DEFAULT 'En Curso' CHECK (status IN ('En Curso', 'Completado', 'Atrasado', 'En Pausa')),
    obstacles TEXT,
    enablers TEXT,
    target_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status TEXT DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'En Progreso', 'Completado', 'Cancelado')),
    assigned_to UUID REFERENCES users(id),
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tenant domain configuration table
CREATE TABLE tenant_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain)
);

-- Create tenant settings table for additional configuration
CREATE TABLE tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, setting_key)
);

-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only see their tenant data" ON tenants FOR ALL USING (auth.jwt() ->> 'tenant_id' = id);
CREATE POLICY "Users can only see their tenant areas" ON areas FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id'));
CREATE POLICY "Users can only see their tenant users" ON users FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id'));
CREATE POLICY "Users can only see their tenant initiatives" ON initiatives FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id'));
CREATE POLICY "Users can only see their tenant activities" ON activities FOR ALL USING (initiative_id IN (SELECT id FROM initiatives WHERE tenant_id = (auth.jwt() ->> 'tenant_id')));
-- RLS policies for tenant_domains (read access for all, admin access for modifications)
CREATE POLICY "Users can view their tenant domains" ON tenant_domains 
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "Admins can manage tenant domains" ON tenant_domains 
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
        AND tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
        AND role IN ('ceo', 'admin')
    )
  );

-- RLS policies for tenant_settings (read access for all, admin access for modifications)  
CREATE POLICY "Users can view their tenant settings" ON tenant_settings 
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id'));

CREATE POLICY "Admins can manage tenant settings" ON tenant_settings 
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id') AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = auth.uid()::text 
        AND tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
        AND role IN ('ceo', 'admin')
    )
  );

-- Insert Tenants with production UUIDs
INSERT INTO tenants (id, name, industry, description) VALUES 
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 'Stratix Platform', 'Enterprise Management Platform', 'Transform your organization with our comprehensive management suite'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 'FEMA Electricidad', 'Electricidad y Energía', 'Soluciones eléctricas integrales para el sector industrial y doméstico'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 'SIGA Turismo', 'Turismo y Viajes', 'Gestión integral de servicios turísticos y experiencias de viaje');

-- Insert Areas for STRATIX DEMO (UUIDs auto-generated)
INSERT INTO areas (tenant_id, name, description) VALUES 
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 'Desarrollo de Producto', 'Innovación y desarrollo de nuevas funcionalidades'),
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 'Ventas y Marketing', 'Estrategias comerciales y promoción'),
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 'Tecnología', 'Infraestructura y desarrollo técnico'),
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 'Recursos Humanos', 'Gestión del talento y cultura organizacional'),
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 'Operaciones', 'Procesos operativos y eficiencia'),
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 'Administración', 'Gestión administrativa y financiera');

-- Insert Areas for FEMA ELECTRICIDAD  
INSERT INTO areas (tenant_id, name, description) VALUES 
('e4420764-4e09-4377-be18-98b0df9f02e1', 'División Electricidad', 'Productos eléctricos residenciales y comerciales'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 'División Iluminación', 'Sistemas de iluminación LED y tradicional'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 'División Industria', 'Soluciones eléctricas industriales'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 'E-commerce', 'Plataforma de ventas online'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 'Logística y Depósito', 'Gestión de inventario y distribución'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 'Administración', 'Gestión administrativa y financiera'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 'RRHH', 'Recursos humanos y desarrollo'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 'Comercial', 'Ventas y relaciones comerciales'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 'Producto', 'Desarrollo y gestión de productos');

-- Insert Areas for SIGA TURISMO
INSERT INTO areas (tenant_id, name, description) VALUES 
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 'Operaciones Turísticas', 'Gestión de tours y experiencias'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 'Reservas y Ventas', 'Sistema de reservas y atención al cliente'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 'Marketing Digital', 'Promoción y marketing online'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 'Guías y Servicios', 'Gestión de guías turísticos'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 'Alianzas Estratégicas', 'Partnerships con hoteles y servicios'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 'Administración', 'Gestión administrativa y financiera'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 'Tecnología', 'Plataformas digitales y sistemas');

-- Insert default domain configurations (can be modified by admins)
INSERT INTO tenant_domains (tenant_id, domain, is_active) VALUES 
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 'stratix-demo.com', true),
('e4420764-4e09-4377-be18-98b0df9f02e1', 'fema-electricidad.com', true),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 'siga-turismo.com', true);

-- Insert default tenant settings
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value) VALUES 
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 'auto_assign_domain', '{"enabled": true, "default_role": "analyst", "require_approval": false}'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 'auto_assign_domain', '{"enabled": true, "default_role": "analyst", "require_approval": true}'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 'auto_assign_domain', '{"enabled": true, "default_role": "analyst", "require_approval": false}'),
('1cee14d6-1dd6-4db3-9d91-d1a36101eba3', 'invite_only_mode', '{"enabled": false}'),
('e4420764-4e09-4377-be18-98b0df9f02e1', 'invite_only_mode', '{"enabled": false}'),
('f5f0aab3-6fd1-4b3d-9464-9ff978a52f27', 'invite_only_mode', '{"enabled": false}');

-- Note: User accounts will be created separately in Supabase Auth
-- This script only creates the user profile records that reference the auth users

COMMIT;
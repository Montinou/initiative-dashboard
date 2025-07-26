-- Stratix Platform Database Schema for Fema Multi-Tenant Implementation
-- This schema implements the multi-tenant architecture with Row Level Security (RLS)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('CEO', 'Admin', 'Analyst', 'Manager');
CREATE TYPE initiative_status AS ENUM ('En Curso', 'Completado', 'Atrasado', 'En Pausa');

-- Create tenants table (for multi-tenant architecture)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create company profiles table
CREATE TABLE company_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(255),
    website VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    description TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    mission TEXT,
    vision TEXT,
    values TEXT[],
    social_media JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    area_id UUID,
    avatar_url TEXT,
    phone VARCHAR(20),
    title VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Create areas table (departments/divisions)
CREATE TABLE areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Create initiatives table
CREATE TABLE initiatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status initiative_status DEFAULT 'En Curso',
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activities table (tasks within initiatives)
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for users.area_id after areas table is created
ALTER TABLE users ADD CONSTRAINT users_area_id_fkey 
FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_company_profiles_tenant_id ON company_profiles(tenant_id);
CREATE INDEX idx_areas_tenant_id ON areas(tenant_id);
CREATE INDEX idx_initiatives_tenant_id ON initiatives(tenant_id);
CREATE INDEX idx_initiatives_area_id ON initiatives(area_id);
CREATE INDEX idx_initiatives_manager_id ON initiatives(manager_id);
CREATE INDEX idx_activities_initiative_id ON activities(initiative_id);

-- Enable Row Level Security (RLS) for multi-tenancy
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenants
CREATE POLICY "Users can only see their own tenant" ON tenants
    FOR ALL USING (auth.uid()::text IN (
        SELECT id::text FROM users WHERE tenant_id = tenants.id
    ));

-- Create RLS policies for company profiles
CREATE POLICY "Users can only see their company profile" ON company_profiles
    FOR SELECT USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id::text = auth.uid()::text
    ));

CREATE POLICY "Only CEO and Admin can modify company profile" ON company_profiles
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users 
        WHERE id::text = auth.uid()::text 
        AND role IN ('CEO', 'Admin')
    ));

-- Create RLS policies for users
CREATE POLICY "Users can only see users from their tenant" ON users
    FOR SELECT USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id::text = auth.uid()::text
    ));

CREATE POLICY "Users can only update their own profile" ON users
    FOR UPDATE USING (id::text = auth.uid()::text);

CREATE POLICY "Only admins can create users" ON users
    FOR INSERT WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM users 
        WHERE id::text = auth.uid()::text 
        AND role IN ('CEO', 'Admin')
    ));

-- Create RLS policies for areas
CREATE POLICY "Users can only see areas from their tenant" ON areas
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id::text = auth.uid()::text
    ));

-- Create RLS policies for initiatives
CREATE POLICY "Users can see initiatives from their tenant" ON initiatives
    FOR SELECT USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id::text = auth.uid()::text
    ));

CREATE POLICY "Managers can only modify their own initiatives" ON initiatives
    FOR INSERT WITH CHECK (
        manager_id::text = auth.uid()::text AND
        tenant_id IN (SELECT tenant_id FROM users WHERE id::text = auth.uid()::text)
    );

CREATE POLICY "Managers can only update their own initiatives" ON initiatives
    FOR UPDATE USING (
        manager_id::text = auth.uid()::text AND
        tenant_id IN (SELECT tenant_id FROM users WHERE id::text = auth.uid()::text)
    );

CREATE POLICY "Managers can only delete their own initiatives" ON initiatives
    FOR DELETE USING (
        manager_id::text = auth.uid()::text AND
        tenant_id IN (SELECT tenant_id FROM users WHERE id::text = auth.uid()::text)
    );

-- Create RLS policies for activities
CREATE POLICY "Users can see activities from initiatives in their tenant" ON activities
    FOR SELECT USING (initiative_id IN (
        SELECT i.id FROM initiatives i
        JOIN users u ON u.id::text = auth.uid()::text
        WHERE i.tenant_id = u.tenant_id
    ));

CREATE POLICY "Managers can modify activities from their initiatives" ON activities
    FOR ALL USING (initiative_id IN (
        SELECT id FROM initiatives 
        WHERE manager_id::text = auth.uid()::text
    ));

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON company_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON areas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_initiatives_updated_at BEFORE UPDATE ON initiatives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial data for tenants
INSERT INTO tenants (id, name) VALUES 
('fema-electricidad'::uuid, 'Fema Electricidad'),
('siga-turismo'::uuid, 'SIGA Turismo'),
('stratix-demo'::uuid, 'Stratix Platform');

-- Insert initial company profiles
INSERT INTO company_profiles (tenant_id, company_name, industry, website, description, mission, vision, values) VALUES 
('fema-electricidad'::uuid, 'FEMA Electricidad', 'Electricidad y Energía', 'https://fema.com.ar', 
'Soluciones eléctricas integrales para el sector industrial y doméstico', 
'Proveer soluciones eléctricas de calidad que impulsen el desarrollo industrial y mejoren la vida cotidiana',
'Ser la empresa líder en el sector eléctrico, reconocida por la innovación y excelencia en el servicio',
ARRAY['Calidad', 'Innovación', 'Compromiso', 'Sustentabilidad']),

('siga-turismo'::uuid, 'SIGA Turismo', 'Turismo y Viajes', 'https://siga-turismo.com.ar', 
'Gestión integral de servicios turísticos y experiencias de viaje únicas', 
'Crear experiencias de viaje memorables que conecten a las personas con destinos extraordinarios',
'Ser la plataforma de turismo más confiable y innovadora de la región',
ARRAY['Experiencia', 'Confianza', 'Aventura', 'Responsabilidad']),

('stratix-demo'::uuid, 'Stratix Platform', 'Enterprise Management Platform', 'https://stratix-platform.com', 
'Transform your organization with our comprehensive management suite', 
'Empower organizations worldwide with intelligent management solutions that drive growth and efficiency',
'To be the global leader in enterprise management platforms',
ARRAY['Innovation', 'Excellence', 'Transparency', 'Growth']);

-- Insert areas for all tenants
INSERT INTO areas (tenant_id, name, description) VALUES 
-- FEMA Electricidad areas
('fema-electricidad'::uuid, 'División Electricidad', 'Productos y servicios de electricidad'),
('fema-electricidad'::uuid, 'División Iluminación', 'Sistemas de iluminación y luminarias'),
('fema-electricidad'::uuid, 'División Industria', 'Soluciones industriales especializadas'),
('fema-electricidad'::uuid, 'E-commerce', 'Tienda online femastore.com.ar'),
('fema-electricidad'::uuid, 'Logística y Depósito', 'Gestión de inventario y distribución'),
('fema-electricidad'::uuid, 'Administración', 'Gestión administrativa y recursos humanos'),

-- SIGA Turismo areas
('siga-turismo'::uuid, 'Operaciones Turísticas', 'Gestión de tours y actividades'),
('siga-turismo'::uuid, 'Reservas y Ventas', 'Sistema de reservas y atención al cliente'),
('siga-turismo'::uuid, 'Marketing Digital', 'Promoción y marketing online'),
('siga-turismo'::uuid, 'Guías y Personal', 'Gestión de guías turísticos y personal'),
('siga-turismo'::uuid, 'Administración', 'Gestión administrativa y financiera'),

-- Stratix Platform areas (demo)
('stratix-demo'::uuid, 'Product Development', 'Software development and innovation'),
('stratix-demo'::uuid, 'Sales & Marketing', 'Business development and growth'),
('stratix-demo'::uuid, 'Customer Success', 'Client support and relationship management'),
('stratix-demo'::uuid, 'Operations', 'Internal operations and infrastructure'),
('stratix-demo'::uuid, 'Administration', 'Human resources and administration');

-- Create view for dashboard analytics
CREATE VIEW dashboard_analytics AS
SELECT 
    i.tenant_id,
    COUNT(*) as total_initiatives,
    AVG(i.progress) as avg_progress,
    COUNT(CASE WHEN i.status = 'En Curso' THEN 1 END) as in_progress,
    COUNT(CASE WHEN i.status = 'Completado' THEN 1 END) as completed,
    COUNT(CASE WHEN i.status = 'Atrasado' THEN 1 END) as delayed,
    COUNT(CASE WHEN i.status = 'En Pausa' THEN 1 END) as paused
FROM initiatives i
GROUP BY i.tenant_id;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
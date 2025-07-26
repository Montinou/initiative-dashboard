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
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    parent_area_id INTEGER REFERENCES areas(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    area_id INTEGER REFERENCES areas(id),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ceo', 'admin', 'manager', 'analyst')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE initiatives (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    area_id INTEGER REFERENCES areas(id),
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
    id SERIAL PRIMARY KEY,
    initiative_id INTEGER REFERENCES initiatives(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status TEXT DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'En Progreso', 'Completado', 'Cancelado')),
    assigned_to UUID REFERENCES users(id),
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only see their tenant data" ON tenants FOR ALL USING (auth.jwt() ->> 'tenant_id' = id);
CREATE POLICY "Users can only see their tenant areas" ON areas FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id'));
CREATE POLICY "Users can only see their tenant users" ON users FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id'));
CREATE POLICY "Users can only see their tenant initiatives" ON initiatives FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id'));
CREATE POLICY "Users can only see their tenant activities" ON activities FOR ALL USING (initiative_id IN (SELECT id FROM initiatives WHERE tenant_id = (auth.jwt() ->> 'tenant_id')));

-- Insert Tenants with proper UUIDs
INSERT INTO tenants (id, name, industry, description) VALUES 
('11111111-1111-1111-1111-111111111111', 'Stratix Platform', 'Enterprise Management Platform', 'Transform your organization with our comprehensive management suite'),
('22222222-2222-2222-2222-222222222222', 'FEMA Electricidad', 'Electricidad y Energía', 'Soluciones eléctricas integrales para el sector industrial y doméstico'),
('33333333-3333-3333-3333-333333333333', 'SIGA Turismo', 'Turismo y Viajes', 'Gestión integral de servicios turísticos y experiencias de viaje');

-- Insert Areas for STRATIX DEMO
INSERT INTO areas (tenant_id, name, description) VALUES 
('11111111-1111-1111-1111-111111111111', 'Desarrollo de Producto', 'Innovación y desarrollo de nuevas funcionalidades'),
('11111111-1111-1111-1111-111111111111', 'Ventas y Marketing', 'Estrategias comerciales y promoción'),
('11111111-1111-1111-1111-111111111111', 'Tecnología', 'Infraestructura y desarrollo técnico'),
('11111111-1111-1111-1111-111111111111', 'Recursos Humanos', 'Gestión del talento y cultura organizacional'),
('11111111-1111-1111-1111-111111111111', 'Operaciones', 'Procesos operativos y eficiencia'),
('11111111-1111-1111-1111-111111111111', 'Administración', 'Gestión administrativa y financiera');

-- Insert Areas for FEMA ELECTRICIDAD  
INSERT INTO areas (tenant_id, name, description) VALUES 
('22222222-2222-2222-2222-222222222222', 'División Electricidad', 'Productos eléctricos residenciales y comerciales'),
('22222222-2222-2222-2222-222222222222', 'División Iluminación', 'Sistemas de iluminación LED y tradicional'),
('22222222-2222-2222-2222-222222222222', 'División Industria', 'Soluciones eléctricas industriales'),
('22222222-2222-2222-2222-222222222222', 'E-commerce', 'Plataforma de ventas online'),
('22222222-2222-2222-2222-222222222222', 'Logística y Depósito', 'Gestión de inventario y distribución'),
('22222222-2222-2222-2222-222222222222', 'Administración', 'Gestión administrativa y financiera'),
('22222222-2222-2222-2222-222222222222', 'RRHH', 'Recursos humanos y desarrollo'),
('22222222-2222-2222-2222-222222222222', 'Comercial', 'Ventas y relaciones comerciales'),
('22222222-2222-2222-2222-222222222222', 'Producto', 'Desarrollo y gestión de productos');

-- Insert Areas for SIGA TURISMO
INSERT INTO areas (tenant_id, name, description) VALUES 
('33333333-3333-3333-3333-333333333333', 'Operaciones Turísticas', 'Gestión de tours y experiencias'),
('33333333-3333-3333-3333-333333333333', 'Reservas y Ventas', 'Sistema de reservas y atención al cliente'),
('33333333-3333-3333-3333-333333333333', 'Marketing Digital', 'Promoción y marketing online'),
('33333333-3333-3333-3333-333333333333', 'Guías y Servicios', 'Gestión de guías turísticos'),
('33333333-3333-3333-3333-333333333333', 'Alianzas Estratégicas', 'Partnerships con hoteles y servicios'),
('33333333-3333-3333-3333-333333333333', 'Administración', 'Gestión administrativa y financiera'),
('33333333-3333-3333-3333-333333333333', 'Tecnología', 'Plataformas digitales y sistemas');

-- Note: User accounts will be created separately in Supabase Auth
-- This script only creates the user profile records that reference the auth users

COMMIT;
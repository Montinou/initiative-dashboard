-- Create first superadmin user and populate with sample data
-- This is the exact content that needs to be run in Supabase SQL Editor

-- 1. Create the first superadmin
INSERT INTO public.superadmins (email, name, password_hash) VALUES (
    'agusmontoya@gmail.com',
    'Agus Montoya - Platform Administrator',
    'X5r82Pe1p8sNuKreBKDPiWBfF/iD6Tn8EE+QdkTeIFBNjoHQds77KhhQzDkkeSX2'
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    updated_at = timezone('utc'::text, now());

-- 2. Create some sample initiatives for each area
INSERT INTO public.initiatives (tenant_id, area_id, title, description, status, priority, progress, target_date, budget) 
SELECT 
    a.tenant_id,
    a.id as area_id,
    CASE 
        WHEN a.name = 'División Iluminación' THEN 'Modernización LED Industrial'
        WHEN a.name = 'División Electricidad' THEN 'Red Eléctrica Inteligente'
        WHEN a.name = 'División Industria' THEN 'Automatización Procesos'
        WHEN a.name = 'Administración' THEN 'Sistema ERP Integrado'
        WHEN a.name = 'E-commerce' THEN 'Plataforma Mobile App'
        WHEN a.name = 'Logística' THEN 'Optimización Rutas Entrega'
        ELSE 'Proyecto General'
    END as title,
    CASE 
        WHEN a.name = 'División Iluminación' THEN 'Implementación de tecnología LED en plantas industriales para reducir consumo energético en 40%'
        WHEN a.name = 'División Electricidad' THEN 'Desarrollo de red eléctrica inteligente con medidores IoT y gestión remota'
        WHEN a.name = 'División Industria' THEN 'Automatización completa de procesos productivos con robots colaborativos'
        WHEN a.name = 'Administración' THEN 'Implementación de sistema ERP para unificar gestión financiera y operativa'
        WHEN a.name = 'E-commerce' THEN 'Desarrollo de aplicación móvil para mejorar experiencia de compra online'
        WHEN a.name = 'Logística' THEN 'Optimización de rutas de entrega usando inteligencia artificial'
        ELSE 'Descripción del proyecto general'
    END as description,
    'in_progress' as status,
    'high' as priority,
    75 as progress,
    CURRENT_DATE + 180 as target_date,
    250000.00 as budget
FROM public.areas a
WHERE a.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
ON CONFLICT DO NOTHING;

-- 3. Create a second tenant for testing multi-tenant functionality
INSERT INTO public.tenants (id, name, subdomain, description, industry) VALUES (
    'aa0e8400-e29b-41d4-a716-446655440001',
    'SIGA Automatización',
    'siga-automatizacion',
    'Empresa de automatización industrial y control de procesos',
    'Automatización'
) ON CONFLICT (subdomain) DO NOTHING;

-- 4. Create areas for the second tenant
INSERT INTO public.areas (tenant_id, name, description) VALUES
    ('aa0e8400-e29b-41d4-a716-446655440001', 'Ingeniería', 'Diseño y desarrollo de soluciones de automatización'),
    ('aa0e8400-e29b-41d4-a716-446655440001', 'Manufactura', 'Producción de equipos de control'),
    ('aa0e8400-e29b-41d4-a716-446655440001', 'Servicios', 'Mantenimiento y soporte técnico'),
    ('aa0e8400-e29b-41d4-a716-446655440001', 'Ventas', 'Comercialización y atención al cliente')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- 5. Create initiatives for the second tenant
INSERT INTO public.initiatives (tenant_id, area_id, title, description, status, priority, progress, target_date, budget) 
SELECT 
    a.tenant_id,
    a.id as area_id,
    CASE 
        WHEN a.name = 'Ingeniería' THEN 'PLC Inteligente Nueva Generación'
        WHEN a.name = 'Manufactura' THEN 'Línea Producción Lean'
        WHEN a.name = 'Servicios' THEN 'Mantenimiento Predictivo IoT'
        WHEN a.name = 'Ventas' THEN 'CRM Automatizado'
    END as title,
    CASE 
        WHEN a.name = 'Ingeniería' THEN 'Desarrollo de controlador PLC con inteligencia artificial integrada'
        WHEN a.name = 'Manufactura' THEN 'Implementación de metodología lean en línea de producción'
        WHEN a.name = 'Servicios' THEN 'Sistema de mantenimiento predictivo con sensores IoT'
        WHEN a.name = 'Ventas' THEN 'Implementación de CRM automatizado con lead scoring'
    END as description,
    'planning' as status,
    'high' as priority,
    25 as progress,
    CURRENT_DATE + 120 as target_date,
    180000.00 as budget
FROM public.areas a
WHERE a.tenant_id = 'aa0e8400-e29b-41d4-a716-446655440001'
ON CONFLICT DO NOTHING;

-- Final verification
SELECT 'SETUP COMPLETE!' as status, 
       'Superadmin created: agusmontoya@gmail.com' as login,
       'Password: btcStn60' as password,
       'Test at: /superadmin' as url;
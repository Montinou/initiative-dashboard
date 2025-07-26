-- Create first superadmin user and populate with sample data
-- Run this in Supabase SQL Editor

-- 1. Create the first superadmin
INSERT INTO public.superadmins (email, name, password_hash) VALUES (
    'agusmontoya@gmail.com',
    'Agus Montoya - Platform Administrator',
    'X5r82Pe1p8sNuKreBKDPiWBfF/iD6Tn8EE+QdkTeIFBNjoHQds77KhhQzDkkeSX2'
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    updated_at = timezone('utc'::text, now());

-- 2. Verify superadmin was created
SELECT 'Superadmin created:' as status, id, email, name, is_active, created_at
FROM public.superadmins
WHERE email = 'agusmontoya@gmail.com';

-- 3. Check that default tenant exists (should already be there from migration)
SELECT 'Default tenant:' as status, id, name, subdomain, industry
FROM public.tenants
WHERE subdomain = 'fema-electricidad';

-- 4. Check areas were created
SELECT 'Areas count:' as status, COUNT(*) as total_areas
FROM public.areas
WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- 5. Create some sample initiatives for each area
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
    CASE 
        WHEN RANDOM() < 0.3 THEN 'planning'
        WHEN RANDOM() < 0.6 THEN 'in_progress'
        WHEN RANDOM() < 0.9 THEN 'on_hold'
        ELSE 'completed'
    END as status,
    CASE 
        WHEN RANDOM() < 0.3 THEN 'low'
        WHEN RANDOM() < 0.7 THEN 'medium'
        ELSE 'high'
    END as priority,
    (RANDOM() * 100)::INTEGER as progress,
    CURRENT_DATE + (RANDOM() * 365)::INTEGER as target_date,
    (RANDOM() * 500000 + 50000)::DECIMAL(15,2) as budget
FROM public.areas a
WHERE a.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
ON CONFLICT DO NOTHING;

-- 6. Add a second sample initiative for each area
INSERT INTO public.initiatives (tenant_id, area_id, title, description, status, priority, progress, target_date, budget) 
SELECT 
    a.tenant_id,
    a.id as area_id,
    CASE 
        WHEN a.name = 'División Iluminación' THEN 'Capacitación Técnica Avanzada'
        WHEN a.name = 'División Electricidad' THEN 'Certificación ISO 50001'
        WHEN a.name = 'División Industria' THEN 'Centro I+D Innovación'
        WHEN a.name = 'Administración' THEN 'Transformación Digital'
        WHEN a.name = 'E-commerce' THEN 'Marketing Digital 360°'
        WHEN a.name = 'Logística' THEN 'Almacén Automatizado'
        ELSE 'Proyecto Secundario'
    END as title,
    CASE 
        WHEN a.name = 'División Iluminación' THEN 'Programa de capacitación técnica especializada en nuevas tecnologías LED y domótica'
        WHEN a.name = 'División Electricidad' THEN 'Obtención de certificación ISO 50001 para gestión energética'
        WHEN a.name = 'División Industria' THEN 'Creación de centro de investigación y desarrollo para innovación tecnológica'
        WHEN a.name = 'Administración' THEN 'Digitalización completa de procesos administrativos y migración a la nube'
        WHEN a.name = 'E-commerce' THEN 'Estrategia integral de marketing digital y posicionamiento online'
        WHEN a.name = 'Logística' THEN 'Implementación de sistema de almacén automatizado con robots'
        ELSE 'Descripción del proyecto secundario'
    END as description,
    CASE 
        WHEN RANDOM() < 0.3 THEN 'planning'
        WHEN RANDOM() < 0.6 THEN 'in_progress'
        WHEN RANDOM() < 0.9 THEN 'on_hold'
        ELSE 'completed'
    END as status,
    CASE 
        WHEN RANDOM() < 0.3 THEN 'low'
        WHEN RANDOM() < 0.7 THEN 'medium'
        ELSE 'high'
    END as priority,
    (RANDOM() * 100)::INTEGER as progress,
    CURRENT_DATE + (RANDOM() * 365)::INTEGER as target_date,
    (RANDOM() * 300000 + 25000)::DECIMAL(15,2) as budget
FROM public.areas a
WHERE a.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
ON CONFLICT DO NOTHING;

-- 7. Create a second tenant for testing multi-tenant functionality
INSERT INTO public.tenants (id, name, subdomain, description, industry) VALUES (
    'aa0e8400-e29b-41d4-a716-446655440001',
    'SIGA Automatización',
    'siga-automatizacion',
    'Empresa de automatización industrial y control de procesos',
    'Automatización'
) ON CONFLICT (subdomain) DO NOTHING;

-- 8. Create areas for the second tenant
INSERT INTO public.areas (tenant_id, name, description) VALUES
    ('aa0e8400-e29b-41d4-a716-446655440001', 'Ingeniería', 'Diseño y desarrollo de soluciones de automatización'),
    ('aa0e8400-e29b-41d4-a716-446655440001', 'Manufactura', 'Producción de equipos de control'),
    ('aa0e8400-e29b-41d4-a716-446655440001', 'Servicios', 'Mantenimiento y soporte técnico'),
    ('aa0e8400-e29b-41d4-a716-446655440001', 'Ventas', 'Comercialización y atención al cliente')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- 9. Create initiatives for the second tenant
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
    CASE 
        WHEN RANDOM() < 0.5 THEN 'in_progress'
        ELSE 'planning'
    END as status,
    'high' as priority,
    (RANDOM() * 60 + 20)::INTEGER as progress,
    CURRENT_DATE + (RANDOM() * 200 + 90)::INTEGER as target_date,
    (RANDOM() * 400000 + 100000)::DECIMAL(15,2) as budget
FROM public.areas a
WHERE a.tenant_id = 'aa0e8400-e29b-41d4-a716-446655440001'
ON CONFLICT DO NOTHING;

-- 10. Create area templates for superadmin use
INSERT INTO public.area_templates (name, description, industry, template_data) VALUES
(
    'Empresa Eléctrica Completa',
    'Estructura organizacional completa para empresas del sector eléctrico',
    'Electricidad',
    '[
        {"name": "Generación", "description": "Operación y mantenimiento de plantas generadoras"},
        {"name": "Transmisión", "description": "Gestión de líneas de transmisión y subestaciones"},
        {"name": "Distribución", "description": "Redes de distribución y atención comercial"},
        {"name": "Comercialización", "description": "Ventas de energía y atención al cliente"},
        {"name": "Mantenimiento", "description": "Mantenimiento preventivo y correctivo"},
        {"name": "Ingeniería", "description": "Diseño y proyectos de infraestructura"},
        {"name": "Calidad", "description": "Control de calidad y cumplimiento normativo"},
        {"name": "Seguridad", "description": "Seguridad industrial y gestión de riesgos"},
        {"name": "Finanzas", "description": "Gestión financiera y contabilidad"},
        {"name": "Recursos Humanos", "description": "Gestión del talento humano"}
    ]'::jsonb
),
(
    'Startup Tecnológica',
    'Estructura ágil para startups de tecnología',
    'Tecnología',
    '[
        {"name": "Producto", "description": "Desarrollo y gestión de producto"},
        {"name": "Ingeniería", "description": "Desarrollo de software y arquitectura"},
        {"name": "DevOps", "description": "Infraestructura y deployment"},
        {"name": "UX/UI", "description": "Diseño de experiencia de usuario"},
        {"name": "Marketing", "description": "Marketing digital y growth hacking"},
        {"name": "Ventas", "description": "Business development y ventas"},
        {"name": "Customer Success", "description": "Éxito del cliente y soporte"},
        {"name": "Data", "description": "Análisis de datos y business intelligence"}
    ]'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- 11. Verification queries
-- Count everything we created
SELECT 'Database Summary' as section, 'Total' as metric, 
    (SELECT COUNT(*) FROM public.tenants) as tenants,
    (SELECT COUNT(*) FROM public.areas) as areas,
    (SELECT COUNT(*) FROM public.initiatives) as initiatives,
    (SELECT COUNT(*) FROM public.superadmins) as superadmins,
    (SELECT COUNT(*) FROM public.area_templates) as area_templates;

-- Show sample data
SELECT 'FEMA Initiatives' as section, a.name as area, i.title, i.status, i.progress
FROM public.initiatives i
JOIN public.areas a ON i.area_id = a.id
WHERE i.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY a.name, i.title;

-- Test superadmin functions exist
SELECT 'Superadmin Functions' as section, routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'superadmin%'
ORDER BY routine_name;

-- Final success message
SELECT 'SETUP COMPLETE!' as status, 
       'Superadmin created: agusmontoya@gmail.com' as login,
       'Password: btcStn60' as password,
       'Test at: /superadmin' as url;
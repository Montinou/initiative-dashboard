-- Demo Data Population Script
-- Run this after the reset-database.sql script

-- Insert Demo Users (these UUIDs should match the ones created in Supabase Auth)
-- STRATIX DEMO USERS
INSERT INTO users (id, tenant_id, area_id, email, name, role) VALUES 
('11111111-1111-1111-1111-111111111111', 'stratix-demo', 1, 'ceo@stratix-demo.com', 'Sarah Chen', 'ceo'),
('11111111-1111-1111-1111-111111111112', 'stratix-demo', 6, 'admin@stratix-demo.com', 'Michael Rodriguez', 'admin'),
('11111111-1111-1111-1111-111111111113', 'stratix-demo', 2, 'manager@stratix-demo.com', 'Emily Johnson', 'manager'),
('11111111-1111-1111-1111-111111111114', 'stratix-demo', 3, 'analyst@stratix-demo.com', 'David Kim', 'analyst');

-- FEMA ELECTRICIDAD USERS
INSERT INTO users (id, tenant_id, area_id, email, name, role) VALUES 
('22222222-2222-2222-2222-222222222221', 'fema-electricidad', 1, 'ceo@fema-electricidad.com', 'Lucas Ferrero', 'ceo'),
('22222222-2222-2222-2222-222222222222', 'fema-electricidad', 6, 'admin@fema-electricidad.com', 'Administrador Sistema', 'admin'),
('22222222-2222-2222-2222-222222222223', 'fema-electricidad', 1, 'jefe.electricidad@fema-electricidad.com', 'Jefe División Electricidad', 'manager'),
('22222222-2222-2222-2222-222222222224', 'fema-electricidad', 2, 'jefe.iluminacion@fema-electricidad.com', 'Jefe División Iluminación', 'manager'),
('22222222-2222-2222-2222-222222222225', 'fema-electricidad', 3, 'jefe.industria@fema-electricidad.com', 'Jefe División Industria', 'manager'),
('22222222-2222-2222-2222-222222222226', 'fema-electricidad', 4, 'gerente.ecommerce@fema-electricidad.com', 'Gerente E-commerce', 'manager'),
('22222222-2222-2222-2222-222222222227', 'fema-electricidad', 8, 'analista.gestion@fema-electricidad.com', 'Analista de Gestión', 'analyst');

-- SIGA TURISMO USERS  
INSERT INTO users (id, tenant_id, area_id, email, name, role) VALUES 
('33333333-3333-3333-3333-333333333331', 'siga-turismo', 1, 'ceo@siga-turismo.com', 'Carmen Mendoza', 'ceo'),
('33333333-3333-3333-3333-333333333332', 'siga-turismo', 6, 'admin@siga-turismo.com', 'Roberto Admin', 'admin'),
('33333333-3333-3333-3333-333333333333', 'siga-turismo', 1, 'manager.operaciones@siga-turismo.com', 'Manager Operaciones', 'manager'),
('33333333-3333-3333-3333-333333333334', 'siga-turismo', 2, 'manager.reservas@siga-turismo.com', 'Manager Reservas', 'manager'),
('33333333-3333-3333-3333-333333333335', 'siga-turismo', 3, 'analista.marketing@siga-turismo.com', 'Analista Marketing', 'analyst');

-- Insert Demo Initiatives for STRATIX DEMO
INSERT INTO initiatives (tenant_id, area_id, owner_id, title, description, progress, status, obstacles, enablers, target_date) VALUES 
('stratix-demo', 1, '11111111-1111-1111-1111-111111111113', 'Lanzamiento Dashboard v2.0', 'Nueva versión del dashboard con IA integrada', 75, 'En Curso', 'Integración con APIs externas', 'Equipo dedicado de desarrollo', '2025-03-15'),
('stratix-demo', 2, '11111111-1111-1111-1111-111111111113', 'Campaña Marketing Q1', 'Estrategia de marketing para primer trimestre', 60, 'En Curso', 'Presupuesto limitado', 'Nuevas herramientas digitales', '2025-02-28'),
('stratix-demo', 3, '11111111-1111-1111-1111-111111111114', 'Migración Cloud AWS', 'Migración completa de infraestructura', 40, 'En Curso', 'Complejidad de datos legacy', 'Soporte técnico AWS', '2025-04-30'),
('stratix-demo', 4, '11111111-1111-1111-1111-111111111112', 'Programa Capacitación 2025', 'Plan anual de capacitación del personal', 85, 'En Curso', 'Coordinación de horarios', 'Plataforma e-learning', '2025-12-31'),
('stratix-demo', 5, '11111111-1111-1111-1111-111111111112', 'Optimización Procesos', 'Automatización de procesos manuales', 55, 'En Curso', 'Resistencia al cambio', 'Herramientas de automatización', '2025-06-30');

-- Insert Demo Initiatives for FEMA ELECTRICIDAD
INSERT INTO initiatives (tenant_id, area_id, owner_id, title, description, progress, status, obstacles, enablers, target_date) VALUES 
('fema-electricidad', 1, '22222222-2222-2222-2222-222222222223', 'Lanzamiento nueva línea domótica', 'Productos inteligentes para el hogar', 75, 'En Curso', 'Certificaciones pendientes', 'Alianza con fabricantes', '2025-04-15'),
('fema-electricidad', 2, '22222222-2222-2222-2222-222222222224', 'Certificación productos LED', 'Certificación IRAM para nueva línea', 90, 'En Curso', 'Trámites burocráticos', 'Laboratorio certificado', '2025-02-28'),
('fema-electricidad', 2, '22222222-2222-2222-2222-222222222224', 'Sistema iluminación inteligente', 'IoT para control de iluminación', 60, 'En Curso', 'Desarrollo de software', 'Equipo de ingeniería', '2025-05-30'),
('fema-electricidad', 3, '22222222-2222-2222-2222-222222222225', 'Soluciones para minería', 'Equipos especializados sector minero', 25, 'Atrasado', 'Recursos limitados', 'Contactos en el sector', '2025-07-15'),
('fema-electricidad', 4, '22222222-2222-2222-2222-222222222226', 'Rediseño femastore.com.ar', 'Nueva plataforma e-commerce', 85, 'En Curso', 'Migración de datos', 'Equipo de desarrollo', '2025-03-31'),
('fema-electricidad', 5, '22222222-2222-2222-2222-222222222222', 'Optimización stock en depósito', 'Sistema WMS implementación', 50, 'En Curso', 'Capacitación personal', 'Software especializado', '2025-04-30'),
('fema-electricidad', 8, '22222222-2222-2222-2222-222222222227', 'Implementación CRM', 'Sistema gestión de clientes', 50, 'En Curso', 'Integración con sistemas', 'Consultor especializado', '2025-05-15');

-- Insert Demo Initiatives for SIGA TURISMO
INSERT INTO initiatives (tenant_id, area_id, owner_id, title, description, progress, status, obstacles, enablers, target_date) VALUES 
('siga-turismo', 1, '33333333-3333-3333-3333-333333333333', 'Circuito Salta Premium', 'Tour premium por quebrada de Humahuaca', 80, 'En Curso', 'Permisos municipales', 'Alianza con hoteles', '2025-03-01'),
('siga-turismo', 2, '33333333-3333-3333-3333-333333333334', 'Sistema Reservas Online', 'Plataforma de reservas automatizada', 65, 'En Curso', 'Integración con pagos', 'Equipo desarrollo', '2025-04-15'),
('siga-turismo', 3, '33333333-3333-3333-3333-333333333335', 'Campaña Digital Verano', 'Marketing para temporada alta', 90, 'En Curso', 'Competencia intensa', 'Influencers locales', '2025-02-15'),
('siga-turismo', 4, '33333333-3333-3333-3333-333333333333', 'Capacitación Guías', 'Programa certificación guías turísticos', 70, 'En Curso', 'Disponibilidad de guías', 'Apoyo gobierno provincial', '2025-06-30'),
('siga-turismo', 5, '33333333-3333-3333-3333-333333333334', 'Partnership Hoteles', 'Acuerdos comerciales con hoteles', 45, 'En Curso', 'Negociación tarifas', 'Red de contactos', '2025-05-31'),
('siga-turismo', 7, '33333333-3333-3333-3333-333333333332', 'App Móvil Turística', 'Aplicación para turistas', 35, 'En Curso', 'Recursos de desarrollo', 'Diseño UX completado', '2025-08-15');

COMMIT;
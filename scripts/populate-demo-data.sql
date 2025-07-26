-- Demo Data Population Script
-- Run this after the reset-database.sql script

-- Create function to auto-assign tenant_id for new users in auth.users
-- This will be used when users are created through Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- TODO: Implement logic to determine tenant_id based on email domain or other criteria
  -- For now, this function exists as a placeholder for future tenant assignment
  -- Example: NEW.raw_user_meta_data ->> 'tenant_id' could be used
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth.users (will be activated when auth schema is available)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert Demo Users (these UUIDs should match the ones created in Supabase Auth)
-- STRATIX DEMO USERS
INSERT INTO users (id, tenant_id, area_id, email, name, role) VALUES 
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 1, 'ceo@stratix-demo.com', 'Sarah Chen', 'ceo'),
('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 6, 'admin@stratix-demo.com', 'Michael Rodriguez', 'admin'),
('11111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 2, 'manager@stratix-demo.com', 'Emily Johnson', 'manager'),
('11111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 3, 'analyst@stratix-demo.com', 'David Kim', 'analyst');

-- FEMA ELECTRICIDAD USERS
INSERT INTO users (id, tenant_id, area_id, email, name, role) VALUES 
('22222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 1, 'ceo@fema-electricidad.com', 'Lucas Ferrero', 'ceo'),
('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 6, 'admin@fema-electricidad.com', 'Administrador Sistema', 'admin'),
('22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 1, 'jefe.electricidad@fema-electricidad.com', 'Jefe División Electricidad', 'manager'),
('22222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', 2, 'jefe.iluminacion@fema-electricidad.com', 'Jefe División Iluminación', 'manager'),
('22222222-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222222', 3, 'jefe.industria@fema-electricidad.com', 'Jefe División Industria', 'manager'),
('22222222-2222-2222-2222-222222222226', '22222222-2222-2222-2222-222222222222', 4, 'gerente.ecommerce@fema-electricidad.com', 'Gerente E-commerce', 'manager'),
('22222222-2222-2222-2222-222222222227', '22222222-2222-2222-2222-222222222222', 8, 'analista.gestion@fema-electricidad.com', 'Analista de Gestión', 'analyst');

-- SIGA TURISMO USERS  
INSERT INTO users (id, tenant_id, area_id, email, name, role) VALUES 
('33333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 1, 'ceo@siga-turismo.com', 'Carmen Mendoza', 'ceo'),
('33333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 6, 'admin@siga-turismo.com', 'Roberto Admin', 'admin'),
('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 1, 'manager.operaciones@siga-turismo.com', 'Manager Operaciones', 'manager'),
('33333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', 2, 'manager.reservas@siga-turismo.com', 'Manager Reservas', 'manager'),
('33333333-3333-3333-3333-333333333335', '33333333-3333-3333-3333-333333333333', 3, 'analista.marketing@siga-turismo.com', 'Analista Marketing', 'analyst');

-- Insert Demo Initiatives for STRATIX DEMO
INSERT INTO initiatives (tenant_id, area_id, owner_id, title, description, progress, status, obstacles, enablers, target_date) VALUES 
('11111111-1111-1111-1111-111111111111', 1, '11111111-1111-1111-1111-111111111113', 'Lanzamiento Dashboard v2.0', 'Nueva versión del dashboard con IA integrada', 75, 'En Curso', 'Integración con APIs externas', 'Equipo dedicado de desarrollo', '2025-03-15'),
('11111111-1111-1111-1111-111111111111', 2, '11111111-1111-1111-1111-111111111113', 'Campaña Marketing Q1', 'Estrategia de marketing para primer trimestre', 60, 'En Curso', 'Presupuesto limitado', 'Nuevas herramientas digitales', '2025-02-28'),
('11111111-1111-1111-1111-111111111111', 3, '11111111-1111-1111-1111-111111111114', 'Migración Cloud AWS', 'Migración completa de infraestructura', 40, 'En Curso', 'Complejidad de datos legacy', 'Soporte técnico AWS', '2025-04-30'),
('11111111-1111-1111-1111-111111111111', 4, '11111111-1111-1111-1111-111111111112', 'Programa Capacitación 2025', 'Plan anual de capacitación del personal', 85, 'En Curso', 'Coordinación de horarios', 'Plataforma e-learning', '2025-12-31'),
('11111111-1111-1111-1111-111111111111', 5, '11111111-1111-1111-1111-111111111112', 'Optimización Procesos', 'Automatización de procesos manuales', 55, 'En Curso', 'Resistencia al cambio', 'Herramientas de automatización', '2025-06-30');

-- Insert Demo Initiatives for FEMA ELECTRICIDAD
INSERT INTO initiatives (tenant_id, area_id, owner_id, title, description, progress, status, obstacles, enablers, target_date) VALUES 
('22222222-2222-2222-2222-222222222222', 1, '22222222-2222-2222-2222-222222222223', 'Lanzamiento nueva línea domótica', 'Productos inteligentes para el hogar', 75, 'En Curso', 'Certificaciones pendientes', 'Alianza con fabricantes', '2025-04-15'),
('22222222-2222-2222-2222-222222222222', 2, '22222222-2222-2222-2222-222222222224', 'Certificación productos LED', 'Certificación IRAM para nueva línea', 90, 'En Curso', 'Trámites burocráticos', 'Laboratorio certificado', '2025-02-28'),
('22222222-2222-2222-2222-222222222222', 2, '22222222-2222-2222-2222-222222222224', 'Sistema iluminación inteligente', 'IoT para control de iluminación', 60, 'En Curso', 'Desarrollo de software', 'Equipo de ingeniería', '2025-05-30'),
('22222222-2222-2222-2222-222222222222', 3, '22222222-2222-2222-2222-222222222225', 'Soluciones para minería', 'Equipos especializados sector minero', 25, 'Atrasado', 'Recursos limitados', 'Contactos en el sector', '2025-07-15'),
('22222222-2222-2222-2222-222222222222', 4, '22222222-2222-2222-2222-222222222226', 'Rediseño femastore.com.ar', 'Nueva plataforma e-commerce', 85, 'En Curso', 'Migración de datos', 'Equipo de desarrollo', '2025-03-31'),
('22222222-2222-2222-2222-222222222222', 5, '22222222-2222-2222-2222-222222222222', 'Optimización stock en depósito', 'Sistema WMS implementación', 50, 'En Curso', 'Capacitación personal', 'Software especializado', '2025-04-30'),
('22222222-2222-2222-2222-222222222222', 8, '22222222-2222-2222-2222-222222222227', 'Implementación CRM', 'Sistema gestión de clientes', 50, 'En Curso', 'Integración con sistemas', 'Consultor especializado', '2025-05-15');

-- Insert Demo Initiatives for SIGA TURISMO
INSERT INTO initiatives (tenant_id, area_id, owner_id, title, description, progress, status, obstacles, enablers, target_date) VALUES 
('33333333-3333-3333-3333-333333333333', 1, '33333333-3333-3333-3333-333333333333', 'Circuito Salta Premium', 'Tour premium por quebrada de Humahuaca', 80, 'En Curso', 'Permisos municipales', 'Alianza con hoteles', '2025-03-01'),
('33333333-3333-3333-3333-333333333333', 2, '33333333-3333-3333-3333-333333333334', 'Sistema Reservas Online', 'Plataforma de reservas automatizada', 65, 'En Curso', 'Integración con pagos', 'Equipo desarrollo', '2025-04-15'),
('33333333-3333-3333-3333-333333333333', 3, '33333333-3333-3333-3333-333333333335', 'Campaña Digital Verano', 'Marketing para temporada alta', 90, 'En Curso', 'Competencia intensa', 'Influencers locales', '2025-02-15'),
('33333333-3333-3333-3333-333333333333', 4, '33333333-3333-3333-3333-333333333333', 'Capacitación Guías', 'Programa certificación guías turísticos', 70, 'En Curso', 'Disponibilidad de guías', 'Apoyo gobierno provincial', '2025-06-30'),
('33333333-3333-3333-3333-333333333333', 5, '33333333-3333-3333-3333-333333333334', 'Partnership Hoteles', 'Acuerdos comerciales con hoteles', 45, 'En Curso', 'Negociación tarifas', 'Red de contactos', '2025-05-31'),
('33333333-3333-3333-3333-333333333333', 7, '33333333-3333-3333-3333-333333333332', 'App Móvil Turística', 'Aplicación para turistas', 35, 'En Curso', 'Recursos de desarrollo', 'Diseño UX completado', '2025-08-15');

COMMIT;
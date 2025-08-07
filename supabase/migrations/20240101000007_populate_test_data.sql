-- =============================================
-- Migration 007: Populate Test Data
-- =============================================
-- This migration populates the database with test data for development
-- and testing purposes. It creates sample tenants, users, areas, objectives,
-- initiatives, and activities.

-- First, create auth users for testing
-- Note: These use a simple password hash for 'password123' - DO NOT use in production!
-- The encrypted password below is for 'password123' using bcrypt
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
  -- Siga Turismo users
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'ceo_siga@example.com', '$2a$10$PkfLr7tq8Y8HRvDx2aWJQ.ZfKMJZuIu1LZv.3qKVFBXMqFN.LqLZa', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}', 'authenticated', 'authenticated'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', 'admin_siga@example.com', '$2a$10$PkfLr7tq8Y8HRvDx2aWJQ.ZfKMJZuIu1LZv.3qKVFBXMqFN.LqLZa', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}', 'authenticated', 'authenticated'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', 'manager_adm@siga.com', '$2a$10$PkfLr7tq8Y8HRvDx2aWJQ.ZfKMJZuIu1LZv.3qKVFBXMqFN.LqLZa', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}', 'authenticated', 'authenticated'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b06', 'manager_ch@siga.com', '$2a$10$PkfLr7tq8Y8HRvDx2aWJQ.ZfKMJZuIu1LZv.3qKVFBXMqFN.LqLZa', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}', 'authenticated', 'authenticated'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b07', 'manager_com@siga.com', '$2a$10$PkfLr7tq8Y8HRvDx2aWJQ.ZfKMJZuIu1LZv.3qKVFBXMqFN.LqLZa', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}', 'authenticated', 'authenticated'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b09', 'manager_prod@siga.com', '$2a$10$PkfLr7tq8Y8HRvDx2aWJQ.ZfKMJZuIu1LZv.3qKVFBXMqFN.LqLZa', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- Fema Iluminación users  
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', 'ceo_fema@example.com', '$2a$10$PkfLr7tq8Y8HRvDx2aWJQ.ZfKMJZuIu1LZv.3qKVFBXMqFN.LqLZa', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}', 'authenticated', 'authenticated'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'admin_fema@example.com', '$2a$10$PkfLr7tq8Y8HRvDx2aWJQ.ZfKMJZuIu1LZv.3qKVFBXMqFN.LqLZa', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}', 'authenticated', 'authenticated'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b08', 'manager_adm@fema.com', '$2a$10$PkfLr7tq8Y8HRvDx2aWJQ.ZfKMJZuIu1LZv.3qKVFBXMqFN.LqLZa', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}', 'authenticated', 'authenticated'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b10', 'manager_ch@fema.com', '$2a$10$PkfLr7tq8Y8HRvDx2aWJQ.ZfKMJZuIu1LZv.3qKVFBXMqFN.LqLZa', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}', 'authenticated', 'authenticated'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'manager_com@fema.com', '$2a$10$PkfLr7tq8Y8HRvDx2aWJQ.ZfKMJZuIu1LZv.3qKVFBXMqFN.LqLZa', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}', 'authenticated', 'authenticated'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'manager_prod@fema.com', '$2a$10$PkfLr7tq8Y8HRvDx2aWJQ.ZfKMJZuIu1LZv.3qKVFBXMqFN.LqLZa', now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{}', 'authenticated', 'authenticated');

-- Inserta los tenants
INSERT INTO public.tenants (id, name, subdomain)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Siga_Turismo', 'siga_turismo'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'fema-iluminación', 'fema-iluminacion');

-- Inserta cuartos para los tenants
INSERT INTO public.quarters (id, tenant_id, quarter_name, start_date, end_date)
VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Q1', '2025-01-01', '2025-03-31'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Q2', '2025-04-01', '2025-06-30'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Q1', '2025-01-01', '2025-03-31'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Q2', '2025-04-01', '2025-06-30');

-- Inserta áreas para Siga_Turismo
INSERT INTO public.areas (id, tenant_id, name)
VALUES
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Corporativo'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Administracion'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Capital Humano'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Comercial'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Producto');

-- Inserta áreas para fema-iluminación
INSERT INTO public.areas (id, tenant_id, name)
VALUES
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Corporativo'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Administracion'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Capital Humano'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Comercial'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Producto');

-- Inserta perfiles de usuario para Siga_Turismo (ahora con user_id válido)
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area_id, user_id)
VALUES
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ceo_siga@example.com', 'CEO Siga', 'CEO', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b01'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin_siga@example.com', 'Admin Siga', 'Admin', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b03'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'manager_adm@siga.com', 'Manager Adm', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b05'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'manager_ch@siga.com', 'Manager CH', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b06'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'manager_com@siga.com', 'Manager Comercial', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b07'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'manager_prod@siga.com', 'Manager Producto', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b09');

-- Inserta perfiles de usuario para fema-iluminación (ahora con user_id válido)
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area_id, user_id)
VALUES
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'ceo_fema@example.com', 'CEO Fema', 'CEO', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b02'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'admin_fema@example.com', 'Admin Fema', 'Admin', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b04'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a38', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'manager_adm@fema.com', 'Manager Adm', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b08'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a40', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'manager_ch@fema.com', 'Manager CH', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b10'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'manager_com@fema.com', 'Manager Comercial', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b11'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'manager_prod@fema.com', 'Manager Producto', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b12');

-- Actualiza el manager en las áreas de Siga_Turismo
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a35' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a36' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23';
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24';
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27';

-- Actualiza el manager en las áreas de fema-iluminación
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a38' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a26';
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a40' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a28';
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29';
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30';

-- Inserta objetivos para Siga_Turismo (temática: turismo)
INSERT INTO public.objectives (id, tenant_id, area_id, title, description, created_by)
VALUES
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'Incrementar la visibilidad de destinos', 'Objetivo comercial para atraer más turistas.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37'),
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'Mejorar la experiencia de usuario en la app', 'Objetivo de producto para optimizar la plataforma de reservas.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39');

-- Inserta objetivos para fema-iluminación (temática: iluminación)
INSERT INTO public.objectives (id, tenant_id, area_id, title, description, created_by)
VALUES
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'Lanzar nueva línea de productos eco-iluminación', 'Objetivo comercial para diversificar el catálogo.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41'),
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 'Optimizar la cadena de producción', 'Objetivo de producción para reducir tiempos y costos.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42');

-- Relaciona objetivos con quarters
INSERT INTO public.objective_quarters (objective_id, quarter_id)
VALUES
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'), -- Siga Q1
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'), -- Siga Q2
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'), -- Fema Q1
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'); -- Fema Q2

-- Inserta iniciativas para Siga_Turismo
INSERT INTO public.initiatives (id, tenant_id, area_id, title, description, created_by, progress)
VALUES
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'Campaña publicitaria "Verano en el Caribe"', 'Lanzar una campaña multimedia para promover viajes al Caribe.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 50),
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'Integrar sistema de pago con PayPal', 'Mejorar las opciones de pago en la aplicación.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', 75);

-- Inserta iniciativas para fema-iluminación
INSERT INTO public.initiatives (id, tenant_id, area_id, title, description, created_by, progress)
VALUES
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'Crear el plan de lanzamiento de la Serie Eco', 'Estrategia de lanzamiento para la nueva línea de productos ecológicos.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 20),
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 'Automatizar el ensamblaje de luminarias', 'Automatización de la línea de producción para mayor eficiencia.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 90);

-- Relaciona objetivos con iniciativas
INSERT INTO public.objective_initiatives (objective_id, initiative_id)
VALUES
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a51'),
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a52'),
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a53'),
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54');

-- Inserta actividades para las iniciativas de Siga_Turismo
INSERT INTO public.activities (id, initiative_id, title, description, is_completed, assigned_to)
VALUES
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a61', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', 'Diseñar creatividad publicitaria', 'Crear material gráfico y audiovisual para la campaña.', true, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a62', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', 'Negociar con medios digitales', 'Acordar espacios publicitarios en redes sociales y Google Ads.', false, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a63', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', 'Integrar API de PayPal', 'Implementar la integración técnica con PayPal.', true, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a64', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', 'Realizar pruebas de pago', 'Ejecutar pruebas end-to-end del proceso de pago.', true, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a65', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', 'Documentar proceso de pago', 'Crear documentación para usuarios y soporte técnico.', true, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39');

-- Inserta actividades para las iniciativas de fema-iluminación
INSERT INTO public.activities (id, initiative_id, title, description, is_completed, assigned_to)
VALUES
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'Investigación de mercado', 'Analizar tendencias y competencia en iluminación ecológica.', true, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a67', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'Definir estrategia de precios', 'Establecer política de precios para la línea eco.', false, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a68', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'Crear material promocional', 'Diseñar catálogos y contenido web.', false, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a69', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'Capacitar equipo de ventas', 'Entrenar al equipo sobre los nuevos productos.', false, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a70', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'Lanzamiento oficial', 'Evento de presentación a clientes y prensa.', false, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a71', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'Evaluar equipos automatizados', 'Investigar y seleccionar maquinaria.', true, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a72', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'Comprar e instalar equipos', 'Adquisición e instalación de maquinaria.', true, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a73', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'Capacitar operarios', 'Entrenar al personal en el uso de nuevos equipos.', true, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a74', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'Pruebas de producción', 'Realizar pruebas piloto de producción.', true, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a75', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'Puesta en marcha', 'Iniciar producción a escala completa.', true, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a76', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'Optimización continua', 'Ajustes y mejoras en el proceso.', true, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'Documentar procesos', 'Crear manuales de operación.', true, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a78', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'Auditoría de calidad', 'Verificar estándares de calidad.', true, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a79', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'Análisis de resultados', 'Evaluar mejoras en eficiencia.', true, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42'),
  ('a6eebc99-9c0b-4ef8-bb6d-6bb9bd380a80', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'Reporte final', 'Presentar resultados a dirección.', false, 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42');

-- Inserta registros de progreso histórico
INSERT INTO public.progress_history (initiative_id, completed_activities_count, total_activities_count, notes, updated_by)
VALUES
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', 1, 2, 'Diseño completado, iniciando negociaciones.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37'),
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', 3, 3, 'Integración completada exitosamente.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39'),
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 1, 5, 'Investigación de mercado finalizada.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41'),
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 9, 10, 'Proceso casi completado, pendiente reporte final.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42');

-- Note: All test users have password 'password123'
-- You can login with any of the emails above using that password
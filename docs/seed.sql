-- Inserta las organizaciones
INSERT INTO public.organizations (id, name, description)
VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sega Turismo', 'Empresa líder en servicios de viajes y turismo.'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Fema Iluminación', 'Compañía especializada en soluciones de iluminación sostenible.');

-- Inserta los inquilinos (tenants)
INSERT INTO public.tenants (id, organization_id, subdomain)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'sega_turismo'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'fema_iluminacion');

-- Inserta cuartos para los tenants
INSERT INTO public.quarters (id, tenant_id, quarter_name, start_date, end_date)
VALUES
  ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Q1', '2025-01-01', '2025-03-31'),
  ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Q2', '2025-04-01', '2025-06-30'),
  ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Q1', '2025-01-01', '2025-03-31'),
  ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Q2', '2025-04-01', '2025-06-30');

-- Inserta áreas para Sega Turismo
INSERT INTO public.areas (id, tenant_id, name, description)
VALUES
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Corporativo', 'Area de direccion y gerencia general.'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Administracion', 'Area de contabilidad y finanzas.'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Capital Humano', 'Area de recursos humanos y gestion de talento.'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Comercial', 'Area de ventas y marketing.'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Producto', 'Area de desarrollo de productos y servicios turisticos.');

-- Inserta áreas para Fema Iluminación
INSERT INTO public.areas (id, tenant_id, name, description)
VALUES
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Corporativo', 'Area de direccion y gerencia general.'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Administracion', 'Area de contabilidad y finanzas.'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Capital Humano', 'Area de recursos humanos y gestion de talento.'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Comercial', 'Area de ventas y marketing.'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Producto', 'Area de diseño y fabricacion de productos de iluminacion.');

-- Inserta usuarios en la tabla `public.users` para simular la sincronización del trigger de auth.
INSERT INTO public.users (id, email)
VALUES
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'ceo_sega@example.com'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', 'admin_sega@example.com'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', 'manager_adm@sega.com'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b06', 'manager_ch@sega.com'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b07', 'manager_com@sega.com'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b09', 'manager_prod@sega.com'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', 'ceo_fema@example.com'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'admin_fema@example.com'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b08', 'manager_adm@fema.com'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b10', 'manager_ch@fema.com'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'manager_com@fema.com'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'manager_prod@fema.com');

-- Inserta perfiles de usuario para Sega Turismo
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area_id, user_id)
VALUES
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ceo_sega@example.com', 'CEO Sega', 'CEO', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b01'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin_sega@example.com', 'Admin Sega', 'Admin', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b03'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'manager_adm@sega.com', 'Manager Adm', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b05'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'manager_ch@sega.com', 'Manager CH', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b06'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'manager_com@sega.com', 'Manager Comercial', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b07'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'manager_prod@sega.com', 'Manager Producto', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b09');

-- Inserta perfiles de usuario para Fema Iluminación
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area_id, user_id)
VALUES
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'ceo_fema@example.com', 'CEO Fema', 'CEO', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b02'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'admin_fema@example.com', 'Admin Fema', 'Admin', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b04'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a38', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'manager_adm@fema.com', 'Manager Adm', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b08'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a40', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'manager_ch@fema.com', 'Manager CH', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b10'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'manager_com@fema.com', 'Manager Comercial', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b11'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'manager_prod@fema.com', 'Manager Producto', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b12');

-- Actualiza el manager en las áreas de Sega Turismo
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a35' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a36' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23';
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24';
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27';

-- Actualiza el manager en las áreas de Fema Iluminación
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a38' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a26';
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a40' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a28';
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29';
UPDATE public.areas SET manager_id = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42' WHERE id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30';

-- Inserta objetivos para Sega Turismo (temática: turismo)
INSERT INTO public.objectives (id, tenant_id, area_id, title, description, created_by)
VALUES
  ('o1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'Incrementar visibilidad de destinos', 'Objetivo comercial para atraer más turistas mediante publicidad digital.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37'),
  ('o1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'Mejorar experiencia de usuario en la app', 'Objetivo de producto para optimizar la plataforma de reservas online.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39');

-- Inserta objetivos para Fema Iluminación (temática: iluminación)
INSERT INTO public.objectives (id, tenant_id, area_id, title, description, created_by)
VALUES
  ('o1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'Lanzar nueva línea de eco-iluminación', 'Objetivo comercial para diversificar el catálogo de productos sostenibles.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41'),
  ('o1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 'Optimizar la cadena de producción', 'Objetivo de producción para reducir tiempos y costos de fabricación.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42');

-- Relaciona objetivos con quarters
INSERT INTO public.objective_quarters (objective_id, quarter_id)
VALUES
  ('o1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01'), -- Sega Q1
  ('o1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02'), -- Sega Q2
  ('o1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03'), -- Fema Q1
  ('o1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04', 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04'); -- Fema Q2

-- Inserta iniciativas para Sega Turismo
INSERT INTO public.initiatives (id, tenant_id, area_id, title, description, created_by, progress)
VALUES
  ('i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'Campaña "Verano en el Caribe"', 'Lanzar una campaña de marketing digital para promover paquetes de viajes.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 50),
  ('i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'Integrar sistema de pago con PayPal', 'Desarrollar la integración de pagos en la plataforma web.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', 75);

-- Inserta iniciativas para Fema Iluminación
INSERT INTO public.initiatives (id, tenant_id, area_id, title, description, created_by, progress)
VALUES
  ('i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'Plan de lanzamiento de la Serie Eco', 'Estrategia de lanzamiento para la nueva línea de productos ecológicos.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 20),
  ('i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 'Automatizar línea de ensamblaje', 'Automatización de la línea de producción para mayor eficiencia.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 90);

-- Relaciona objetivos con iniciativas
INSERT INTO public.objective_initiatives (objective_id, initiative_id)
VALUES
  ('o1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e01'),
  ('o1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e02'),
  ('o1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', 'i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e03'),
  ('o1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04', 'i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e04');

-- Inserta actividades para Sega Turismo
INSERT INTO public.activities (id, initiative_id, title, description, assigned_to, is_completed)
VALUES
  ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f01', 'i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'Diseñar creativos para redes sociales', 'Crear imágenes y videos de alta calidad para la campaña.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', true),
  ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f02', 'i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'Negociar con influencers', 'Contactar a 5 influencers de viajes para colaboraciones.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', false),
  ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f03', 'i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', 'Documentación técnica API PayPal', 'Escribir las especificaciones para los desarrolladores.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', true),
  ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f04', 'i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', 'Implementar en frontend', 'Codificar la interfaz de usuario para el pago.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', false);

-- Inserta actividades para Fema Iluminación
INSERT INTO public.activities (id, initiative_id, title, description, assigned_to, is_completed)
VALUES
  ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f05', 'i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', 'Investigar mercado de iluminación sostenible', 'Analizar competidores y tendencias del sector.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', true),
  ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f06', 'i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', 'Diseñar packaging eco-friendly', 'Crear un empaque sostenible para la nueva línea de productos.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', false),
  ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f07', 'i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e04', 'Comprar nueva maquinaria', 'Adquirir y programar robots para la línea de producción.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', true),
  ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380f08', 'i1eebc99-9c0b-4ef8-bb6d-6bb9bd380e04', 'Capacitar al personal en el uso de los robots', 'Entrenar a los operarios en la nueva maquinaria.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', true);

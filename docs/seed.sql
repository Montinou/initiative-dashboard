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

-- Inserta perfiles de usuario para Siga_Turismo
INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role, area_id, user_id)
VALUES
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ceo_siga@example.com', 'CEO Siga', 'CEO', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b01'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin_siga@example.com', 'Admin Siga', 'Admin', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b03'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'manager_adm@siga.com', 'Manager Adm', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b05'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'manager_ch@siga.com', 'Manager CH', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b06'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'manager_com@siga.com', 'Manager Comercial', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b07'),
  ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'manager_prod@siga.com', 'Manager Producto', 'Manager', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380b09');

-- Inserta perfiles de usuario para fema-iluminación
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

-- Inserta actividades para Siga_Turismo
INSERT INTO public.activities (id, initiative_id, title, description, assigned_to, is_completed)
VALUES
  ('g6eebc99-9c0b-4ef8-bb6d-6bb9bd380a61', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', 'Diseñar creativos para Instagram y Facebook', 'Crear imágenes y videos de alta calidad.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', true),
  ('g6eebc99-9c0b-4ef8-bb6d-6bb9bd380a62', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', 'Negociar con influencers de viaje', 'Contactar a 5 influencers para colaboraciones.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', false),
  ('g6eebc99-9c0b-4ef8-bb6d-6bb9bd380a63', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', 'Escribir la documentación técnica del API de PayPal', 'Especificaciones para los desarrolladores.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', true),
  ('g6eebc99-9c0b-4ef8-bb6d-6bb9bd380a64', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', 'Implementar la integración en el frontend', 'Codificar la interfaz de usuario para el pago.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a39', false);

-- Inserta actividades para fema-iluminación
INSERT INTO public.activities (id, initiative_id, title, description, assigned_to, is_completed)
VALUES
  ('g6eebc99-9c0b-4ef8-bb6d-6bb9bd380a65', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'Investigar el mercado de iluminación sostenible', 'Analizar competidores y tendencias.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', true),
  ('g6eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'Diseñar el packaging eco-friendly', 'Crear un empaque sostenible para los productos.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', false),
  ('g6eebc99-9c0b-4ef8-bb6d-6bb9bd380a67', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'Comprar nueva maquinaria de ensamblaje', 'Adquirir y programar robots para la línea de producción.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', true),
  ('g6eebc99-9c0b-4ef8-bb6d-6bb9bd380a68', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'Capacitar al personal en la nueva maquinaria', 'Entrenar a los operarios en el uso de los nuevos robots.', 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', true);

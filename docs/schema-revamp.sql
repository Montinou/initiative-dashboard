-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

-- ============================================================
-- Tipos de datos
-- ============================================================

CREATE TYPE user_role AS ENUM ('CEO', 'Admin', 'Manager');
CREATE TYPE initiative_quarter AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- ============================================================
-- Tablas principales
-- ============================================================

-- Nueva tabla de organizaciones
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

-- Tabla de tenants (inquilinos)
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  subdomain text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);

CREATE TABLE public.quarters (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  quarter_name initiative_quarter NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  CONSTRAINT quarters_pkey PRIMARY KEY (id),
  CONSTRAINT quarters_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT unique_quarter_per_year UNIQUE (tenant_id, quarter_name)
);

-- Nueva tabla para la sincronización de usuarios. Contiene los datos básicos del usuario autenticado.
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.areas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  manager_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT areas_pkey PRIMARY KEY (id),
  CONSTRAINT areas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role user_role NOT NULL,
  area_id uuid,
  -- La clave foránea apunta a la nueva tabla public.users
  user_id uuid UNIQUE REFERENCES public.users(id),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id),
  CONSTRAINT user_profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

ALTER TABLE public.areas
ADD CONSTRAINT areas_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.user_profiles(id);

CREATE TABLE public.objectives (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  area_id uuid,
  title text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT objectives_pkey PRIMARY KEY (id),
  CONSTRAINT objectives_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT objectives_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id),
  CONSTRAINT objectives_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

CREATE TABLE public.objective_quarters (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  objective_id uuid NOT NULL,
  quarter_id uuid NOT NULL,
  CONSTRAINT objective_quarters_pkey PRIMARY KEY (id),
  CONSTRAINT objective_quarters_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id),
  CONSTRAINT objective_quarters_quarter_id_fkey FOREIGN KEY (quarter_id) REFERENCES public.quarters(id),
  CONSTRAINT unique_objective_quarter UNIQUE (objective_id, quarter_id)
);

CREATE TABLE public.initiatives (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  area_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_by uuid NOT NULL,
  due_date date,
  start_date date,
  completion_date date,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT initiatives_pkey PRIMARY KEY (id),
  CONSTRAINT initiatives_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id),
  CONSTRAINT initiatives_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
  CONSTRAINT initiatives_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

CREATE TABLE public.objective_initiatives (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  objective_id uuid NOT NULL,
  initiative_id uuid NOT NULL,
  CONSTRAINT objective_initiatives_pkey PRIMARY KEY (id),
  CONSTRAINT objective_initiatives_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id),
  CONSTRAINT objective_initiatives_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id)
);

CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  is_completed boolean DEFAULT false,
  assigned_to uuid,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id),
  CONSTRAINT activities_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id)
);

CREATE TABLE public.progress_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  initiative_id uuid NOT NULL,
  completed_activities_count integer NOT NULL,
  total_activities_count integer NOT NULL,
  notes text,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT progress_history_pkey PRIMARY KEY (id),
  CONSTRAINT progress_history_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id),
  CONSTRAINT progress_history_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id)
);

CREATE TABLE public.uploaded_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  original_filename text NOT NULL,
  stored_filename text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uploaded_files_pkey PRIMARY KEY (id),
  CONSTRAINT uploaded_files_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT uploaded_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.user_profiles(id)
);

CREATE TABLE public.file_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL,
  area_id uuid NOT NULL,
  CONSTRAINT file_areas_pkey PRIMARY KEY (id),
  CONSTRAINT file_areas_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.uploaded_files(id),
  CONSTRAINT file_areas_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id)
);

CREATE TABLE public.file_initiatives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL,
  initiative_id uuid NOT NULL,
  CONSTRAINT file_initiatives_pkey PRIMARY KEY (id),
  CONSTRAINT file_initiatives_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.uploaded_files(id),
  CONSTRAINT file_initiatives_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id)
);

CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- ============================================================
-- Triggers de auditoría
-- ============================================================

-- Función de trigger para registrar los cambios en audit_log
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data)
    VALUES (
      (SELECT id FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid),
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD)
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      (SELECT id FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid),
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_log (user_id, action, table_name, record_id, new_data)
    VALUES (
      (SELECT id FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid),
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Función de trigger para sincronizar auth.users con public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicación del trigger para la sincronización de usuarios
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Aplicación de los triggers de auditoría a las tablas principales del negocio
CREATE TRIGGER areas_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.areas
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER user_profiles_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER initiatives_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.initiatives
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER activities_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.activities
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER quarters_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.quarters
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER objectives_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.objectives
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();


-- ============================================================
-- Row-Level Security (RLS)
-- ============================================================
-- Nota: 'current_setting('request.jwt.claim.sub', true)::uuid' es la forma de obtener
-- el ID del usuario autenticado en Supabase.
-- La columna 'area_id' en user_profiles es crucial para la seguridad a nivel de Manager.

-- Habilitar RLS en las tablas que lo necesitan
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

--
-- RLS: Tabla areas
--
CREATE POLICY "Areas: CEO/Admin can see all, Manager can see their own"
ON public.areas
FOR SELECT
USING (
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin')
  OR
  id IN (
    SELECT area_id FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid
  )
);

-- RLS para inserción y actualización de areas (solo CEOs/Admins)
CREATE POLICY "Areas: CEO/Admin can insert and update"
ON public.areas
FOR ALL
USING (
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin')
) WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin')
);


--
-- RLS: Tabla user_profiles
--
CREATE POLICY "Profiles: Manager can view all, CEO/Admin can see all"
ON public.user_profiles
FOR SELECT
USING (
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin', 'Manager')
);

-- RLS para inserción y actualización de user_profiles (solo CEOs/Admins)
CREATE POLICY "Profiles: CEO/Admin can insert and update"
ON public.user_profiles
FOR ALL
USING (
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin')
) WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin')
);


--
-- RLS: Tabla objectives
--
CREATE POLICY "Objectives: CEO/Admin can see all, Manager can see their area's"
ON public.objectives
FOR SELECT
USING (
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin')
  OR
  area_id IN (
    SELECT area_id FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid
  )
);

-- RLS para inserción y actualización de objectives
CREATE POLICY "Objectives: CEO/Admin can create/update all, Manager can manage their area's"
ON public.objectives
FOR ALL
USING (
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin')
  OR
  area_id IN (
    SELECT area_id FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'Manager'
  )
) WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin')
  OR
  area_id IN (
    SELECT area_id FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'Manager'
  )
);


--
-- RLS: Tabla initiatives
--
CREATE POLICY "Initiatives: CEO/Admin can see all, Manager can see their area's"
ON public.initiatives
FOR SELECT
USING (
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin')
  OR
  area_id IN (
    SELECT area_id FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid
  )
);

-- RLS para inserción y actualización de initiatives
CREATE POLICY "Initiatives: CEO/Admin can create/update all, Manager can manage their area's"
ON public.initiatives
FOR ALL
USING (
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin')
  OR
  area_id IN (
    SELECT area_id FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'Manager'
  )
) WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin')
  OR
  area_id IN (
    SELECT area_id FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'Manager'
  )
);


--
-- RLS: Tabla activities
--
CREATE POLICY "Activities: CEO/Admin can see all, Manager can see their area's"
ON public.activities
FOR SELECT
USING (
  initiative_id IN (
    SELECT id
    FROM public.initiatives
    WHERE area_id IN (
      SELECT area_id FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid
    )
  )
  OR
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin')
);

-- RLS para inserción y actualización de activities
CREATE POLICY "Activities: CEO/Admin can create/update all, Manager can manage their area's initiatives"
ON public.activities
FOR ALL
USING (
  initiative_id IN (
    SELECT id
    FROM public.initiatives
    WHERE area_id IN (
      SELECT area_id FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'Manager'
    )
  )
  OR
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin')
) WITH CHECK (
  initiative_id IN (
    SELECT id
    FROM public.initiatives
    WHERE area_id IN (
      SELECT area_id FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid AND role = 'Manager'
    )
  )
  OR
  (SELECT role FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid) IN ('CEO', 'Admin')
);


-- ============================================================
-- Vistas para facilitar las consultas
-- ============================================================
-- Nota: Las vistas heredan las políticas RLS de las tablas subyacentes.

-- Vista para obtener un resumen de las iniciativas de un manager, evitando la repetición de filas.
CREATE OR REPLACE VIEW public.manager_initiative_summary AS
SELECT
    a.id AS area_id,
    a.name AS area_name,
    a.description AS area_description,
    o.id AS objective_id,
    o.title AS objective_title,
    i.id AS initiative_id,
    i.title AS initiative_title,
    i.progress AS initiative_progress,
    COUNT(act.id) AS total_activities,
    SUM(CASE WHEN act.is_completed THEN 1 ELSE 0 END) AS completed_activities
FROM
    public.areas a
JOIN
    public.objectives o ON a.id = o.area_id
JOIN
    public.objective_initiatives oi ON o.id = oi.objective_id
JOIN
    public.initiatives i ON oi.initiative_id = i.id
LEFT JOIN
    public.activities act ON i.id = act.initiative_id
GROUP BY
    a.id, a.name, o.id, o.title, i.id, i.title, i.progress;


-- Vista para obtener el detalle de las actividades de un manager.
CREATE OR REPLACE VIEW public.manager_activity_details AS
SELECT
    a.id AS area_id,
    a.name AS area_name,
    a.description AS area_description,
    i.id AS initiative_id,
    i.title AS initiative_title,
    act.id AS activity_id,
    act.title AS activity_title,
    act.description AS activity_description,
    act.is_completed,
    u.full_name AS assigned_to
FROM
    public.activities act
JOIN
    public.initiatives i ON act.initiative_id = i.id
JOIN
    public.areas a ON i.area_id = a.id
LEFT JOIN
    public.user_profiles u ON act.assigned_to = u.id;


-- ============================================================
-- Índices para mejorar el rendimiento
-- ============================================================

-- Explicación: Se han añadido índices en las columnas que se usan comúnmente en las cláusulas JOIN,
-- WHERE y ORDER BY para acelerar las consultas. Esto es particularmente importante para las
-- claves foráneas y las columnas utilizadas en las políticas de RLS.

-- Tabla organizations
CREATE INDEX idx_organizations_name ON public.organizations (name);

-- Tabla tenants
CREATE INDEX idx_tenants_organization_id ON public.tenants (organization_id);

-- Tabla areas
CREATE INDEX idx_areas_tenant_id ON public.areas (tenant_id);
CREATE INDEX idx_areas_manager_id ON public.areas (manager_id);

-- Tabla user_profiles
CREATE INDEX idx_user_profiles_tenant_id ON public.user_profiles (tenant_id);
CREATE INDEX idx_user_profiles_area_id ON public.user_profiles (area_id);
CREATE INDEX idx_user_profiles_role ON public.user_profiles (role);

-- Tabla objectives
CREATE INDEX idx_objectives_tenant_id ON public.objectives (tenant_id);
CREATE INDEX idx_objectives_area_id ON public.objectives (area_id);
CREATE INDEX idx_objectives_created_by ON public.objectives (created_by);

-- Tabla initiatives
CREATE INDEX idx_initiatives_tenant_id ON public.initiatives (tenant_id);
CREATE INDEX idx_initiatives_area_id ON public.initiatives (area_id);
CREATE INDEX idx_initiatives_created_by ON public.initiatives (created_by);
CREATE INDEX idx_initiatives_progress ON public.initiatives (progress);

-- Tabla activities
CREATE INDEX idx_activities_initiative_id ON public.activities (initiative_id);
CREATE INDEX idx_activities_assigned_to ON public.activities (assigned_to);
CREATE INDEX idx_activities_is_completed ON public.activities (is_completed);

-- Tabla progress_history
CREATE INDEX idx_progress_history_initiative_id ON public.progress_history (initiative_id);
CREATE INDEX idx_progress_history_updated_by ON public.progress_history (updated_by);

-- Tabla uploaded_files
CREATE INDEX idx_uploaded_files_tenant_id ON public.uploaded_files (tenant_id);
CREATE INDEX idx_uploaded_files_uploaded_by ON public.uploaded_files (uploaded_by);

-- Tabla file_areas
CREATE INDEX idx_file_areas_file_id ON public.file_areas (file_id);
CREATE INDEX idx_file_areas_area_id ON public.file_areas (area_id);

-- Tabla file_initiatives
CREATE INDEX idx_file_initiatives_file_id ON public.file_initiatives (file_id);
CREATE INDEX idx_file_initiatives_initiative_id ON public.file_initiatives (initiative_id);

-- Tabla audit_log
CREATE INDEX idx_audit_log_user_id ON public.audit_log (user_id);
CREATE INDEX idx_audit_log_table_record ON public.audit_log (table_name, record_id);

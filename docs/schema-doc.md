Documentación del Esquema de la Base de Datos
Este documento describe la estructura del esquema de la base de datos que hemos diseñado para gestionar un sistema de objetivos, iniciativas y actividades para múltiples empresas (multi-tenant). El esquema está optimizado para su uso en Supabase, incorporando funcionalidades como seguridad a nivel de fila (RLS), auditoría de cambios y gestión automatizada.

1. Tablas Principales (Entidades de Negocio)
Estas tablas representan las entidades centrales del modelo de negocio, incluyendo ahora el campo is_active para soportar la eliminación lógica (soft delete).

organizations: La tabla de más alto nivel que representa la entidad principal de una empresa. Contiene datos como el nombre y la descripción de la organización, y el campo is_active para su estado.

tenants: Actúa como un inquilino de una organización. Cada tenant tiene un subdomain único y se relaciona con una organization. Todas las demás tablas de negocio se relacionan con esta a través de tenant_id, lo que permite una escalabilidad multi-tenant.

areas: Representa los departamentos o áreas funcionales de cada empresa. Cada área puede tener un manager_id asignado y una description. Incluye el campo is_active para su eliminación lógica.

users: Esta tabla es una réplica de auth.users de Supabase. Almacena los datos básicos del usuario (ID y email) para un acceso más rápido desde el esquema public. Un trigger se encarga de sincronizar esta tabla automáticamente cuando se crea un nuevo usuario en auth.users.

user_profiles: Contiene la información de negocio de los usuarios, como su full_name, role y area_id. Su clave foránea user_id apunta a la tabla public.users.

quarters: Una tabla para definir trimestres de manera centralizada (Q1, Q2, Q3, Q4) con fechas de inicio y fin. Se ha añadido una restricción CHECK para garantizar que la fecha de inicio siempre sea anterior a la de finalización.

objectives: Define los objetivos de alto nivel para cada área. Cada objetivo puede agrupar múltiples iniciativas y tiene el campo is_active.

initiatives: Representa las iniciativas o proyectos que se llevan a cabo para cumplir con un objetivo. Contiene campos de progreso, se relaciona con el área y el creador, y tiene el campo is_active.

activities: Las tareas específicas que componen una iniciativa. Se marcan como is_completed, y un trigger calcula automáticamente el progreso de la iniciativa padre.

2. Tablas Auxiliares y de Seguimiento
objective_quarters: Relaciona objectives con quarters, permitiendo que un objetivo abarque uno o varios trimestres.

objective_initiatives: Vincula initiatives a objectives, organizando el trabajo en una estructura jerárquica.

progress_history: Registra los cambios en el progreso de una iniciativa. Almacena el completed_activities_count y total_activities_count para una auditoría más granular.

uploaded_files: Almacena metadatos sobre los archivos subidos.

file_areas y file_initiatives: Tablas de unión para manejar la relación de muchos a muchos entre archivos, áreas e iniciativas.

3. Funcionalidades Clave
Se han implementado funcionalidades avanzadas para optimizar el esquema para su uso en producción.

audit_log: Una tabla centralizada que registra cada acción de INSERT, UPDATE o DELETE en las tablas principales. Una función de trigger asociada se encarga de poblar esta tabla automáticamente.

Sincronización de Usuarios: Un trigger en auth.users (handle_new_user()) asegura que cada vez que un usuario se registra, se crea automáticamente un registro en public.users.

Actualización Automática de updated_at: Una función de trigger genérica (set_updated_at_timestamp()) se aplica a todas las tablas principales para actualizar automáticamente el campo updated_at en cada operación de UPDATE.

Cálculo de Progreso Automático: Un trigger en la tabla activities (update_initiative_progress()) calcula y actualiza el campo de progreso de la iniciativa asociada cada vez que se inserta, actualiza o elimina una actividad.

Row-Level Security (RLS): Las políticas de RLS ahora son más granulares, con permisos diferenciados para SELECT, INSERT, UPDATE y DELETE en las tablas de negocio. Se filtran automáticamente los registros inactivos (is_active = TRUE), implementando así la lógica de "soft delete".

Vistas Optimizadas: Se mantienen las vistas manager_initiative_summary y manager_activity_details para simplificar las consultas en la capa de la aplicación.

Índices: Se han añadido índices en las claves foráneas y en las columnas más utilizadas para uniones y filtros, mejorando significativamente el rendimiento.

En resumen, este esquema es un modelo de datos robusto, diseñado para ser seguro, auditable, escalable y con lógicas automatizadas, lo que lo hace ideal para un entorno de producción de Supabase.
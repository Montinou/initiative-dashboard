Documentación del Esquema de la Base de Datos
Este documento describe la estructura del esquema de la base de datos que hemos diseñado para gestionar un sistema de objetivos, iniciativas y actividades para múltiples empresas (multi-tenant). El esquema está optimizado para su uso en Supabase, incorporando funcionalidades como seguridad a nivel de fila (RLS) y auditoría de cambios.
1. Tablas Principales (Entidades de Negocio)
Estas tablas representan las entidades centrales del modelo de negocio.
tenants: La tabla fundamental que soporta la arquitectura multi-tenant. Cada fila representa una empresa (ej. Sega_Turismo, fema-iluminación). Todas las demás tablas de negocio se relacionan con esta a través de tenant_id.
areas: Representa los departamentos o áreas funcionales de cada empresa (ej. Administración, Comercial). Cada área puede tener un manager_id asignado.
user_profiles: Contiene la información de los usuarios de la aplicación. Se relaciona con el esquema de autenticación de Supabase a través de user_id y con las áreas a través de area_id. El campo role (CEO, Admin, Manager) es clave para la lógica de negocio y las políticas de seguridad.
quarters: Una tabla para definir trimestres de manera centralizada (Q1, Q2, Q3, Q4) con fechas de inicio y fin. Los CEOs y Admins pueden configurar estas fechas, y los objetivos se asocian a ellas a través de una tabla auxiliar. Esto elimina la necesidad de gestionar fechas manualmente en cada iniciativa.
objectives: Define los objetivos de alto nivel para cada área. Cada objetivo puede agrupar múltiples iniciativas para un seguimiento más estratégico.
initiatives: Representa las iniciativas o proyectos que se llevan a cabo para cumplir con un objetivo. Contiene campos de progreso y se relaciona con el área y el creador.
activities: Las tareas específicas que componen una iniciativa. Se marcan como is_completed, lo cual puede ser utilizado para calcular el progreso de la iniciativa principal.
2. Tablas Auxiliares y de Seguimiento
Estas tablas dan soporte a las relaciones de muchos a muchos y a la trazabilidad de los datos.
objective_quarters: Relaciona objectives con quarters, permitiendo que un objetivo abarque uno o varios trimestres.
objective_initiatives: Vincula initiatives a objectives, organizando el trabajo en una estructura jerárquica.
progress_history: Registra los cambios en el progreso de una iniciativa. En lugar de solo guardar un porcentaje, almacena el completed_activities_count y total_activities_count para una auditoría más granular.
uploaded_files: Almacena metadatos sobre los archivos subidos.
file_areas y file_initiatives: Tablas de unión para manejar la relación de muchos a muchos entre archivos, áreas e iniciativas, ya que un solo archivo XLSX puede contener datos de varias áreas y múltiples iniciativas.
3. Funcionalidades Clave
Se han implementado funcionalidades avanzadas para optimizar el esquema para su uso en producción.
audit_log: Una tabla centralizada que registra cada acción de INSERT, UPDATE o DELETE en las tablas principales. Una función de trigger asociada se encarga de poblar esta tabla automáticamente, capturando quién hizo el cambio, qué se cambió y cuándo.
Row-Level Security (RLS): Se ha habilitado RLS en las tablas de negocio (areas, user_profiles, objectives, initiatives, activities). Se crearon políticas de seguridad que garantizan que:
CEOs y Admins pueden ver y modificar todos los datos.
Managers solo pueden ver y gestionar los datos de su área asignada.
Vistas Optimizadas: Se crearon dos vistas para simplificar las consultas en la capa de la aplicación:
manager_initiative_summary: Proporciona un resumen agregado del progreso de las iniciativas, ideal para un dashboard.
manager_activity_details: Ofrece un desglose detallado de las actividades.
Índices: Se han añadido índices en las claves foráneas y en las columnas más utilizadas para uniones y filtros, lo que mejora significativamente el rendimiento de las consultas.
Validaciones: La mayoría de los campos tienen la restricción NOT NULL, garantizando la integridad de los datos.
En resumen, este esquema es un modelo de datos completo y robusto, diseñado para ser seguro, auditable y escalable en un entorno de producción de Supabase.

Plan de Desarrollo y Puesta en Producción: Stratix Platform para Fema
Documento: Especificación de Desarrollo - Fase 1
Fecha: 26 de julio de 2025
Versión: 1.2
Cliente Principal: Fema Electricidad (Ferrero Y Mattio S.R.L.)
Plataforma: Stratix Platform

1. Introducción y Objetivo
Este documento define el alcance técnico y el plan de acción para la puesta en producción de Stratix Platform para el cliente Fema Electricidad. Tras la aprobación de la demo funcional, el objetivo de esta fase es implementar la solución base (Plan Professional) de manera estable, segura y personalizada para Fema, sentando las bases para futuras expansiones.

El principio rector de esta fase es la simplicidad y la rapidez de implementación, entregando el valor fundamental de la plataforma sin introducir la complejidad de funcionalidades avanzadas, que se consideran para fases posteriores.

2. Alcance del Proyecto (Fase 1 - Plan Professional)
Esta fase se centrará exclusivamente en las funcionalidades ya desarrolladas y validadas en la versión de producción actual (v2.2.0), que se corresponden con el Plan Professional.

2.1. Funcionalidades INCLUIDAS en esta fase:
Arquitectura Multi-Tenant: Configuración de Fema como un "tenant" independiente y seguro.

Gestión de Roles y Permisos: Implementación completa de los 4 roles definidos: CEO, Administrador, Analista, Manager.

Módulo de Iniciativas: Funcionalidad CRUD (Crear, Leer, Actualizar, Eliminar) completa para la gestión de iniciativas y sus actividades asociadas por parte del rol Manager.

Dashboard de Analítica Base: Visualización de KPIs y gráficos con datos en tiempo real.

Panel de Administración: Gestión de Usuarios y Áreas.

Personalización Visual (Theming): Aplicación de la paleta de colores corporativa de Fema (naranja) sobre el sistema de diseño "Glassmorphism".

Sistema de Notificaciones (Toast): Feedback visual para todas las operaciones principales.

Exportación de Reportes: Funcionalidad de exportación de datos desde el dashboard.

2.2. Funcionalidades EXCLUIDAS en esta fase (para Fases Posteriores):
Importación de datos desde Excel/CSV.

Filtros avanzados (más allá del filtro por trimestre).

Gráficos avanzados (tendencias, timelines).

Constructor de reportes personalizados y sistema de comentarios.

Cualquier funcionalidad de Inteligencia Artificial.

3. Especificaciones Técnicas y de Diseño
La arquitectura base, ya validada, se mantendrá.

Stack Tecnológico: Next.js 15, React 19, TypeScript, Tailwind CSS, Radix UI, Recharts, Supabase (PostgreSQL), Vercel.

Sistema de Diseño (UI/UX): Se aplicará un "re-skin" al sistema de diseño Glassmorphism existente para alinearlo con la identidad de Fema, utilizando la paleta naranja corporativa en elementos interactivos, gráficos y destacados.

Arquitectura de Datos: El proyecto se conectará directamente con la base de datos de producción de Supabase, utilizando Políticas de Seguridad a Nivel de Fila (RLS) para garantizar el aislamiento total de los datos de Fema.

4. Detalle de Visualizaciones del Dashboard (Aplicado a Fema)
El dashboard principal, accesible para los roles CEO y Analista, proporcionará una visión instantánea y clara del estado de las iniciativas estratégicas de Fema. Los gráficos están diseñados para responder preguntas clave sobre el rendimiento de la empresa.

4.1. Gráfico 1: Distribución por Progreso (Gráfico de Barras)
Propósito: Muestra cuántas iniciativas estratégicas se encuentran en cada rango de progreso (ej. 0-25%, 26-50%, 51-75%, 76-100%).

Aplicación en Fema: Este gráfico permitirá a la dirección visualizar la salud general del portafolio de proyectos de un solo vistazo. Por ejemplo, podrán ver si la mayoría de las iniciativas clave (como "Lanzamiento nueva línea de domótica", "Optimización de stock en depósito" o "Campaña de marketing digital Q3") están recién comenzando, avanzando a buen ritmo o a punto de completarse. Una acumulación de iniciativas en los rangos bajos podría indicar un problema de arranque generalizado.

4.2. Gráfico 2: Distribución por Estado (Gráfico Circular o de Dona)
Propósito: Visualiza la proporción de iniciativas según su estado actual: 'En Curso', 'Completado', 'Atrasado', 'En Pausa'.

Aplicación en Fema: Ofrece un diagnóstico rápido para identificar cuellos de botella. Si la dirección de Fema observa que un gran porcentaje de las iniciativas está en estado 'Atrasado', pueden investigar las causas subyacentes. Por ejemplo, podría revelar que el equipo de la 'División Industria' está sobrecargado y necesita más recursos.

4.3. Gráfico 3: Progreso Promedio por Área (Gráfico de Barras)
Propósito: Compara el rendimiento promedio de las iniciativas entre las diferentes áreas o departamentos de la empresa.

Aplicación en Fema: Este es un gráfico de gestión crucial. Permitirá a la dirección de Fema comparar objetivamente el avance de sus unidades de negocio principales. Verán en una sola vista el progreso promedio de la 'División Electricidad' vs. la 'División Iluminación' vs. la 'División Industria' y 'Administración'. Si, por ejemplo, las iniciativas de 'Iluminación' promedian un 80% de avance pero las de 'Industria' solo un 30%, se pueden iniciar conversaciones específicas para entender los obstáculos y reasignar recursos si es necesario.

5. Especificación de Roles y Perfiles de Usuario para Fema
Cada rol en la plataforma está diseñado para corresponder con una función específica dentro de la estructura organizativa de Fema.

5.1. Rol: CEO
Función en la Plataforma: Acceso total y sin restricciones a toda la información y funciones de administración dentro del entorno de Fema. Puede ver todos los dashboards, gestionar todos los usuarios y todas las áreas.

Perfil de Usuario en Fema: Este rol está reservado para la alta dirección y los propietarios. Típicamente, los miembros de la familia Ferrero y/o Mattio que ocupan cargos directivos. Dada su participación activa en AERCA, Lucas Ferrero sería un candidato natural para este rol.

Permisos Clave:

Visualizar todos los dashboards y reportes.

Crear, editar y eliminar cualquier usuario (incluidos otros CEOs y Admins).

Crear, editar y eliminar cualquier área de la empresa.

Exportar todos los datos.

5.2. Rol: Administrador (Admin)
Función en la Plataforma: Gestionar la estructura organizativa y los usuarios de nivel inferior. No tiene acceso a los datos estratégicos del dashboard.

Perfil de Usuario en Fema: Un rol de confianza encargado de la gestión operativa del personal en la plataforma. Podría ser el Jefe de Administración, el responsable de Recursos Humanos o un asistente de dirección. Su tarea es mantener la plataforma ordenada, no analizar los datos.

Permisos Clave:

No puede ver los dashboards de iniciativas.

Puede crear, editar y eliminar usuarios con rol Manager y Analista.

Puede crear, editar y eliminar áreas/departamentos.

5.3. Rol: Analista
Función en la Plataforma: Acceso de solo lectura a toda la información estratégica. Puede ver todo, pero no puede modificar nada.

Perfil de Usuario en Fema: Personal del área de control de gestión, administración o un asistente de dirección cuya función sea preparar reportes para la gerencia. Es ideal para quien necesite consultar el estado de los proyectos para sus informes, sin riesgo de que altere los datos.

Permisos Clave:

Visualizar todos los dashboards y reportes.

Filtrar y exportar datos.

No puede crear, editar o eliminar usuarios, áreas o iniciativas.

5.4. Rol: Manager
Función en la Plataforma: Es el rol de "ejecución". Cada manager es responsable de crear, gestionar y actualizar el progreso de las iniciativas de su propia área.

Perfil de Usuario en Fema: Este será el rol más utilizado y es fundamental para el éxito de la plataforma. Corresponde a los jefes o gerentes de las divisiones y departamentos clave:

Jefe de la División Iluminación.

Jefe de la División Electricidad.

Jefe de la División Industria.

Gerente de E-commerce (femastore.com.ar).

Jefe de Logística y Depósito.

Permisos Clave:

Solo puede ver y gestionar las iniciativas que él mismo ha creado.

Crear nuevas iniciativas y asignarlas a su área.

Actualizar el progreso y el estado de sus iniciativas.

Añadir, editar y marcar como completadas las actividades de sus iniciativas.

6. Plan de Implementación y Próximos Pasos
El plan de implementación se mantiene, enfocándose en una configuración inicial limpia, carga de datos estructurales (usuarios y áreas), pruebas de aceptación (UAT) con los perfiles mencionados, capacitación por roles y finalmente, la puesta en producción.

Paso 1: Configuración del Entorno (Tenant Fema).

Paso 2: Personalización Visual (Theming Naranja).

Paso 3: Carga Inicial de Datos (Usuarios y Áreas de Fema).

Paso 4: Pruebas de Aceptación de Usuario (UAT).

Paso 5: Capacitación por Roles.

Paso 6: Puesta en Producción (Go-Live).

Una vez que esta fase sea exitosa, se podrá planificar una Fase 2 para incorporar funcionalidades avanzadas de los planes Business o Enterprise, según las necesidades que Fema manifieste.
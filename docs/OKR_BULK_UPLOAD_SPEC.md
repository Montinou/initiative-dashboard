# Especificación de archivo para carga masiva de Objetivos, Iniciativas y Actividades (Managers de Área)

Ámbito: multi‑tenant con RLS en Supabase. El tenant se deriva de la sesión. Los managers solo pueden operar sobre sus áreas. Recomendado usar XLSX; CSV plano es opcional si está habilitado. La UI actual prioriza .xlsx.

Formatos admitidos
- XLSX: hoja única “OKR_Bulk” (plantilla plana). Opcionalmente, una versión normalizada con varias hojas.
- CSV: codificación UTF‑8, separador coma, encabezados en la primera fila (si está habilitado por el backend).

Modelo de datos (plantilla plana: 1 fila = 1 actividad dentro de una iniciativa de un objetivo)
- Identificación y alcance
  - area_name: texto. Requerido si el manager gestiona varias áreas; opcional si solo gestiona una (se infiere). Debe existir en el tenant.
  - objective_key: texto requerido. Único por tenant. Usado para upsert del objetivo.
  - initiative_key: texto requerido. Único por tenant. Upsert y vínculo con el objetivo.
  - activity_key: texto opcional. Único por tenant. Upsert de la actividad.

- Objetivo (public.objectives)
  - objective_title: texto requerido.
  - objective_description: texto opcional.
  - objective_quarter: texto opcional (ej.: 2025-Q3). Se guarda en objectives.quarter.
  - objective_priority: texto opcional. Valores: high | medium | low (default: medium).
  - objective_status: texto opcional. Valores: planning | in_progress | completed | overdue (default: planning).
  - objective_progress: entero 0–100 opcional (default: 0).
  - objective_target_date: fecha opcional (YYYY-MM-DD).

- Iniciativa (public.initiatives)
  - initiative_title: texto requerido.
  - initiative_description: texto opcional.
  - initiative_start_date: fecha opcional (YYYY-MM-DD).
  - initiative_due_date: fecha opcional (YYYY-MM-DD).
  - initiative_completion_date: fecha opcional (YYYY-MM-DD).
  - initiative_status: texto opcional. Valores: planning | in_progress | completed | on_hold (default: in_progress).
  - initiative_progress: entero 0–100 opcional (default: 0).

- Actividad (public.activities)
  - activity_title: texto opcional (requerido si se define una actividad en la fila).
  - activity_description: texto opcional.
  - activity_is_completed: booleano opcional (true/false, 1/0, yes/no).
  - activity_assigned_to_email: texto opcional. Debe existir un user_profile activo con ese email en el tenant.

Reglas y validaciones
- Requeridos por fila: objective_key, initiative_key, objective_title, initiative_title. Si hay actividad: activity_title requerido.
- Enumeraciones válidas: objective_priority (high|medium|low); objective_status (planning|in_progress|completed|overdue); initiative_status (planning|in_progress|completed|on_hold).
- Fechas en formato ISO (YYYY-MM-DD). Progreso entre 0 y 100.
- Seguridad: tenant_id y created_by se derivan de la sesión; area_id se resuelve por area_name y permisos del manager. No se aceptan tenant_id/created_by externos.

Upsert e idempotencia
- Objetivo: si objective_key ya existe, se actualiza; si no, se crea. Puede asociarse a un área de contexto (area_name) o dejar objectives.area_id nulo según políticas.
- Iniciativa: si initiative_key existe, se actualiza; si no, se crea y se vincula al objective_key indicado y al área resuelta.
- Actividad: si activity_key existe, se actualiza; si no, se crea bajo la initiative_key indicada.

Errores y reporte
- El proceso debe informar por fila la columna y el motivo del error. Filas válidas continúan.
- Límite sugerido: hasta 5.000 filas por archivo.

Columnas de la plantilla plana (orden recomendado)
1) area_name
2) objective_key*
3) objective_title*
4) objective_description
5) objective_quarter
6) objective_priority
7) objective_status
8) objective_progress
9) objective_target_date
10) initiative_key*
11) initiative_title*
12) initiative_description
13) initiative_start_date
14) initiative_due_date
15) initiative_completion_date
16) initiative_status
17) initiative_progress
18) activity_key
19) activity_title
20) activity_description
21) activity_is_completed
22) activity_assigned_to_email

Ejemplo (CSV)
objective_key,objective_title,objective_description,objective_quarter,objective_priority,objective_status,objective_progress,objective_target_date,initiative_key,initiative_title,initiative_description,initiative_start_date,initiative_due_date,initiative_completion_date,initiative_status,initiative_progress,area_name,activity_key,activity_title,activity_description,activity_is_completed,activity_assigned_to_email
OBJ-2025-001,Mejorar retención de clientes,Reducir churn en 20%,2025-Q3,high,in_progress,10,2025-12-31,INIT-CRM-001,Programa de fidelización,Lanzar beneficios por niveles,2025-08-15,2025-11-30,,in_progress,0,Atención al Cliente,ACT-001,Definir tiers de beneficios,Documentar 3 niveles iniciales,false,gerente.area@empresa.com
OBJ-2025-001,Mejorar retención de clientes,Reducir churn en 20%,2025-Q3,high,in_progress,10,2025-12-31,INIT-CRM-001,Programa de fidelización,Lanzar beneficios por niveles,2025-08-15,2025-11-30,,in_progress,0,Atención al Cliente,ACT-002,Configurar CRM para puntos,Pipeline de acumulación,true,analista1@empresa.com
OBJ-2025-001,Mejorar retención de clientes,Reducir churn en 20%,2025-Q3,high,in_progress,10,2025-12-31,INIT-DATA-002,Alertas de churn,Lógica de alertas tempranas,2025-09-01,2025-12-15,,planning,0,Atención al Cliente,,,,

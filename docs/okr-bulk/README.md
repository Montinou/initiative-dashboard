# Plantillas de carga masiva OKR (Objetivos–Iniciativas–Actividades)

Archivos:
- OKR_BULK_UPLOAD_SPEC.md: especificación completa de columnas, validaciones y reglas de upsert.
- OKR_BULK_TEMPLATE.csv: plantilla CSV con encabezados y ejemplos.

Uso recomendado en la UI:
- Descargue la plantilla y complétela.
- Formato de fechas: YYYY-MM-DD. Estados y prioridades según la especificación.
- Para asignaciones, use emails válidos existentes en el tenant.

Notas:
- El backend valida permisos (RLS). El manager solo puede cargar en sus áreas.
- Duplicados se controlan con objective_key / initiative_key / activity_key.

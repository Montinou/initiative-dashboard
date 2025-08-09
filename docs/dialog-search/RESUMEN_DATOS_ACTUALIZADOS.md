# Resumen de Datos Actualizados en BigQuery

## Datos Cargados
Se han cargado **10 iniciativas reales** que reflejan la estructura y contexto del sistema actual de gestión de iniciativas.

## Distribución por Organización

### SIGA Turismo (5 iniciativas)
1. **SIGA-COM-001**: Campaña Verano en el Caribe (50% progreso)
2. **SIGA-PROD-001**: Integración Sistema de Pago PayPal (75% progreso)
3. **SIGA-ADM-001**: Optimización Procesos Contables (100% - Completado)
4. **SIGA-CH-001**: Programa Capacitación Digital (25% progreso)
5. **SIGA-CORP-001**: Transformación Digital Corporativa (45% progreso)

### FEMA Iluminación (5 iniciativas)
1. **FEMA-COM-001**: Lanzamiento Serie Eco Iluminación (20% progreso)
2. **FEMA-PROD-001**: Automatización Línea de Ensamblaje (90% progreso)
3. **FEMA-ADM-001**: Implementación ERP Cloud (65% progreso)
4. **FEMA-CH-001**: Programa Bienestar Laboral (40% progreso)
5. **FEMA-CORP-001**: Expansión Internacional LATAM (35% progreso)

## Características de los Datos

- **Coherencia con el sistema actual**: Los datos reflejan las mismas organizaciones (SIGA Turismo, FEMA Iluminación) y áreas (Corporativo, Administración, Capital Humano, Comercial, Producto) que existen en Supabase
- **Información realista**: Cada iniciativa incluye:
  - Presupuestos y costos reales en rangos apropiados
  - Fechas coherentes con proyectos en curso
  - Descripciones detalladas del alcance
  - Resúmenes de resultados parciales o finales
  - Lecciones aprendidas relevantes

## Consultas de Ejemplo para el Asistente

El asistente de Dialogflow CX podrá responder preguntas como:

1. "¿Cuáles son las iniciativas de SIGA Turismo?"
2. "¿Qué iniciativas están en progreso en el área Comercial?"
3. "¿Cuál es el presupuesto total de las iniciativas de FEMA?"
4. "¿Qué iniciativas tienen más del 70% de progreso?"
5. "¿Cuáles son las lecciones aprendidas de los proyectos completados?"
6. "¿Quién es responsable de la Transformación Digital?"
7. "¿Cuánto se ha gastado en la automatización de FEMA?"
8. "¿Qué iniciativas terminan en Q1 2025?"

## Estado de la Indexación

- **Importación iniciada**: Operation ID `import-documents-17156314569291470882`
- **Tiempo estimado**: 15-30 minutos para indexación completa
- **Verificación**: Los documentos estarán disponibles para búsqueda una vez completada la indexación

## Próximos Pasos

1. Esperar que la indexación se complete (15-30 minutos)
2. Probar consultas en el agente de Dialogflow CX
3. Ajustar respuestas generativas si es necesario
4. Integrar con el frontend cuando esté listo
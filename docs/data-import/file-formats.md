# Guía de Formatos de Archivo para Importación de OKRs

## 📋 Resumen

Esta guía documenta los formatos de archivo admitidos para la importación de datos en el Sistema de Gestión de OKRs. El sistema acepta archivos Excel (.xlsx, .xls) y CSV (.csv) con estructuras específicas según el tipo de datos a importar.

## 🎯 Tipos de Importación Disponibles

### 1. Importación Simple (Una Área)
Para managers que importan datos de su área específica.

### 2. Importación Multi-Área
Para CEOs y Administradores que importan datos de múltiples áreas.

### 3. Importación con Actividades
Para importar iniciativas con sus actividades detalladas.

## 📊 Formato 1: Importación Simple

### Estructura de Columnas

| Columna | Nombre | Tipo | Requerido | Descripción |
|---------|--------|------|-----------|-------------|
| A | Objetivo | Texto | Sí | Objetivo estratégico principal |
| B | Iniciativa | Texto | Sí | Nombre de la iniciativa |
| C | Descripción | Texto | No | Descripción detallada de la iniciativa |
| D | Progreso | Número | Sí | Porcentaje de avance (0-100) |
| E | Estado | Texto | No | Estado actual (ver valores válidos) |
| F | Prioridad | Texto | No | Nivel de prioridad (ver valores válidos) |
| G | Responsable | Texto | No | Nombre del responsable |
| H | Fecha Inicio | Fecha | No | Fecha de inicio (DD/MM/YYYY) |
| I | Fecha Fin | Fecha | No | Fecha de finalización (DD/MM/YYYY) |

### Ejemplo de Datos

```
Objetivo,Iniciativa,Descripción,Progreso,Estado,Prioridad,Responsable,Fecha Inicio,Fecha Fin
"Aumentar ingresos 30%","Campaña ventas Q1","Implementar nueva estrategia de ventas",75,en_progreso,alta,"Juan Pérez",01/01/2025,31/03/2025
"Mejorar satisfacción cliente","Sistema tickets","Nuevo sistema de soporte",50,planificación,media,"María García",15/01/2025,30/04/2025
```

## 📊 Formato 2: Importación Multi-Área

### Estructura de Columnas

| Columna | Nombre | Tipo | Requerido | Descripción |
|---------|--------|------|-----------|-------------|
| A | Área | Texto | Sí | Nombre del área organizacional |
| B | Objetivo | Texto | Sí | Objetivo estratégico |
| C | Iniciativa | Texto | Sí | Nombre de la iniciativa |
| D | Descripción | Texto | No | Descripción detallada |
| E | Progreso | Número | Sí | Porcentaje de avance (0-100) |
| F | Estado | Texto | No | Estado actual |
| G | Prioridad | Texto | No | Nivel de prioridad |
| H | Responsable | Texto | No | Responsable de la iniciativa |
| I | Fecha Inicio | Fecha | No | Fecha de inicio |
| J | Fecha Fin | Fecha | No | Fecha de finalización |

### Ejemplo de Datos

```
Área,Objetivo,Iniciativa,Descripción,Progreso,Estado,Prioridad,Responsable,Fecha Inicio,Fecha Fin
Comercial,"Aumentar ventas","Campaña digital","Marketing online",75,en_progreso,alta,"Juan Pérez",01/01/2025,31/03/2025
Producto,"Nuevo producto","MVP v1","Desarrollo inicial",50,planificación,media,"María García",01/02/2025,30/04/2025
Operaciones,"Optimizar procesos","Automatización","Reducir tiempos",25,planificación,alta,"Carlos López",15/01/2025,30/06/2025
```

## 📊 Formato 3: Importación con Actividades

### Estructura de Columnas

| Columna | Nombre | Tipo | Requerido | Descripción |
|---------|--------|------|-----------|-------------|
| A | Área | Texto | Sí* | Área (*requerido para multi-área) |
| B | Objetivo | Texto | Sí | Objetivo estratégico |
| C | Iniciativa | Texto | Sí | Nombre de la iniciativa |
| D | Actividad | Texto | Sí | Nombre de la actividad |
| E | Descripción Actividad | Texto | No | Descripción de la actividad |
| F | Completada | Texto | No | Sí/No o true/false |
| G | Asignado A | Texto | No | Responsable de la actividad |
| H | Fecha Vencimiento | Fecha | No | Fecha límite de la actividad |

### Ejemplo de Datos

```
Área,Objetivo,Iniciativa,Actividad,Descripción Actividad,Completada,Asignado A,Fecha Vencimiento
Marketing,"Brand awareness","Social media","Crear calendario contenido","Planificar posts mensuales",No,"Ana Martín",15/01/2025
Marketing,"Brand awareness","Social media","Diseñar creativos","Crear imágenes y videos",No,"Luis Torres",20/01/2025
Marketing,"Brand awareness","Social media","Publicar contenido","Publicación diaria",Sí,"Ana Martín",10/01/2025
```

## 🔧 Valores Válidos y Mapeos

### Estados (Estado/Status)

| Valor en Archivo | Valor en Sistema | Descripción |
|------------------|------------------|-------------|
| planificación, planning, planificacion | planning | En fase de planificación |
| en_progreso, en progreso, in_progress, activo | in_progress | En desarrollo activo |
| completado, completed, finalizado, terminado | completed | Completado exitosamente |
| en_espera, on_hold, pausado, detenido | on_hold | Temporalmente detenido |

### Prioridades (Prioridad/Priority)

| Valor en Archivo | Valor en Sistema | Descripción |
|------------------|------------------|-------------|
| alta, high, crítica, critica, urgente | high | Prioridad alta |
| media, medium, normal | medium | Prioridad media |
| baja, low | low | Prioridad baja |

### Valores Booleanos (Completada)

| Valores Verdaderos | Valores Falsos |
|-------------------|-----------------|
| Sí, Si, sí, si | No, no |
| True, true, TRUE | False, false, FALSE |
| 1 | 0 |
| Completado, completado | Pendiente, pendiente |
| ✓, ✔ | ✗, ✘ |

## 📅 Formatos de Fecha Aceptados

El sistema acepta múltiples formatos de fecha:

- **DD/MM/YYYY**: 31/12/2025
- **DD-MM-YYYY**: 31-12-2025
- **YYYY-MM-DD**: 2025-12-31
- **DD/MM/YY**: 31/12/25
- **Excel Serial**: 45678 (número de serie de Excel)
- **ISO 8601**: 2025-12-31T00:00:00Z

## ✅ Validaciones Aplicadas

### Validaciones Obligatorias

1. **Objetivo**: No puede estar vacío
2. **Iniciativa**: No puede estar vacío
3. **Progreso**: Debe ser un número entre 0 y 100
4. **Área**: Debe existir en el sistema (para multi-área)

### Validaciones de Formato

1. **Progreso**:
   - Acepta números decimales (75.5)
   - Acepta porcentajes (75%)
   - Se redondea al entero más cercano
   - Valores fuera de 0-100 se ajustan automáticamente

2. **Fechas**:
   - Fecha fin debe ser posterior a fecha inicio
   - Fechas futuras son válidas
   - Fechas vacías se permiten

3. **Áreas**:
   - Se realiza coincidencia inteligente de nombres
   - Acepta variaciones (Comercial = comercial = COMERCIAL)
   - Detecta sinónimos comunes (RRHH = Recursos Humanos)

## 🎨 Formato de Archivos Excel

### Hoja 1: Datos Principales
- Primera fila: Encabezados de columna
- Filas 2+: Datos
- Sin filas vacías intermedias
- Sin columnas ocultas con datos importantes

### Múltiples Hojas (Multi-Área)
- Cada hoja puede representar un área diferente
- El nombre de la hoja se usa como área si no hay columna "Área"
- Hoja "Resumen" se procesa de manera especial

## 📝 Plantillas Descargables

### Descargar Plantillas

- **Excel**: [Descargar Plantilla Excel](/api/upload/template/excel)
- **CSV**: [Descargar Plantilla CSV](/api/upload/template/csv)

### Contenido de las Plantillas

Las plantillas incluyen:
- Encabezados correctos
- 3-5 filas de ejemplo con datos ficticios
- Comentarios explicativos en Excel
- Validación de datos en celdas críticas

## ⚠️ Errores Comunes y Soluciones

### Error: "Área no encontrada"
**Causa**: El nombre del área no coincide con ninguna área en el sistema.
**Solución**: Verificar los nombres exactos de las áreas disponibles o contactar al administrador.

### Error: "Progreso inválido"
**Causa**: Valor de progreso no numérico o fuera del rango 0-100.
**Solución**: Usar solo números entre 0 y 100, sin texto adicional.

### Error: "Formato de fecha no reconocido"
**Causa**: Fecha en formato no soportado.
**Solución**: Usar formato DD/MM/YYYY o YYYY-MM-DD.

### Error: "Columna requerida faltante"
**Causa**: Falta una columna obligatoria en el archivo.
**Solución**: Verificar que estén presentes: Objetivo, Iniciativa, Progreso.

## 🔍 Proceso de Importación

### 1. Preparación
1. Descargar la plantilla apropiada
2. Llenar los datos siguiendo el formato
3. Validar localmente en Excel/LibreOffice

### 2. Carga
1. Seleccionar el archivo en el sistema
2. Elegir el tipo de importación
3. Hacer clic en "Vista Previa"

### 3. Validación
1. Revisar la vista previa de datos
2. Verificar mapeo de columnas
3. Corregir errores señalados

### 4. Confirmación
1. Confirmar la importación
2. Revisar el resumen de resultados
3. Verificar datos importados en el sistema

## 📊 Límites y Restricciones

- **Tamaño máximo de archivo**: 10 MB
- **Máximo de filas**: 10,000 por archivo
- **Máximo de columnas**: 50
- **Tipos de archivo**: .xlsx, .xls, .csv
- **Codificación CSV**: UTF-8 con o sin BOM

## 🚀 Mejores Prácticas

1. **Usar plantillas**: Siempre partir de las plantillas oficiales
2. **Validar antes**: Revisar datos antes de importar
3. **Importar por lotes**: Dividir importaciones grandes
4. **Mantener consistencia**: Usar los mismos nombres y formatos
5. **Backup**: Exportar datos existentes antes de importaciones masivas
6. **Prueba inicial**: Hacer prueba con pocas filas primero

## 📞 Soporte

Para ayuda adicional con la importación de archivos:
- Consultar con el administrador del sistema
- Revisar los logs de importación en el sistema
- Verificar permisos de usuario para importación

---

*Última actualización: Enero 2025*
*Versión: 2.0 (Sin referencias a quarters)*
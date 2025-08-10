# 📚 API Endpoints Documentation

> Documentación completa de todos los endpoints del sistema Initiative Dashboard

## 📁 Estructura de Documentación

La documentación está organizada en archivos separados por dominio funcional:

### Archivos de Documentación

1. **[core-endpoints.md](./core-endpoints.md)** - Endpoints principales del sistema
   - Autenticación y Perfiles
   - Iniciativas
   - Actividades
   - Áreas
   - Objetivos

2. **[dashboard-endpoints.md](./dashboard-endpoints.md)** - Endpoints de dashboards y analytics
   - Dashboard Overview
   - Analytics y KPIs
   - Distribuciones y Comparaciones
   - Manager Dashboard

3. **[admin-endpoints.md](./admin-endpoints.md)** - Endpoints administrativos
   - Org Admin
   - Gestión de Usuarios
   - Invitaciones
   - Audit Log

4. **[file-endpoints.md](./file-endpoints.md)** - Endpoints de gestión de archivos
   - Upload/Download de archivos
   - Excel Import/Export
   - Templates
   - OKR Files

5. **[integration-endpoints.md](./integration-endpoints.md)** - Endpoints de integración
   - Stratix AI
   - BigQuery Sync
   - Webhooks

6. **[utility-endpoints.md](./utility-endpoints.md)** - Endpoints de utilidad
   - Debug
   - Testing
   - Progress Tracking
   - Quarters

## 📊 Resumen de Endpoints

| Categoría | Archivo | Endpoints | Estado |
|-----------|---------|-----------|--------|
| Core | [core-endpoints.md](./core-endpoints.md) | 20 | ✅ Documentado |
| Dashboard | [dashboard-endpoints.md](./dashboard-endpoints.md) | 16 | 🔄 En progreso |
| Admin | [admin-endpoints.md](./admin-endpoints.md) | 8 | 🔄 En progreso |
| Files | [file-endpoints.md](./file-endpoints.md) | 11 | 🔄 En progreso |
| Integration | [integration-endpoints.md](./integration-endpoints.md) | 3 | 🔄 En progreso |
| Utility | [utility-endpoints.md](./utility-endpoints.md) | 3 | 🔄 En progreso |
| **TOTAL** | | **61** | |

## 🔑 Convenciones de Documentación

Cada endpoint está documentado con:

```typescript
### [MÉTODO] /api/[ruta]
**Descripción**: Breve descripción del endpoint

**Headers**: 
- Requeridos y opcionales

**Query Parameters**:
- Parámetros de consulta

**Request Body**:
- Estructura del body (si aplica)

**Response**:
- Respuestas exitosas (2xx)
- Respuestas de error (4xx, 5xx)

**Funcionalidad Interna**:
- Lógica de negocio
- Validaciones
- Permisos requeridos
```

## 🔐 Patrones Comunes

### Autenticación
Todos los endpoints requieren autenticación mediante cookie de sesión de Supabase:
```typescript
const { data: { user } } = await supabase.auth.getUser()
```

### Multi-Tenant
El filtrado por `tenant_id` se aplica automáticamente usando RLS (Row Level Security) de Supabase.

### Control de Acceso por Rol
- **CEO**: Acceso completo a todos los recursos del tenant
- **Admin**: Gestión completa excepto algunas operaciones críticas
- **Manager**: Solo recursos de su área asignada
- **Analyst**: Acceso de lectura según permisos

### Respuestas HTTP Estándar
- `200 OK`: Operación exitosa (GET, PUT, DELETE)
- `201 Created`: Recurso creado exitosamente (POST)
- `400 Bad Request`: Error de validación
- `401 Unauthorized`: No autenticado
- `403 Forbidden`: Sin permisos suficientes
- `404 Not Found`: Recurso no encontrado
- `500 Internal Server Error`: Error del servidor

## 🚀 Uso de la Documentación

1. Identifica la categoría del endpoint que necesitas
2. Navega al archivo correspondiente
3. Busca el endpoint específico usando Ctrl+F
4. Revisa la estructura de request/response
5. Verifica los permisos requeridos

## 📝 Notas Importantes

- La documentación se genera a partir del código fuente actual
- Los tipos TypeScript son los definidos en el proyecto
- Algunos endpoints pueden tener comportamientos adicionales no documentados
- Para cambios o actualizaciones, modificar el código fuente y actualizar la documentación

---

*Última actualización: Enero 2025*
*Versión: 1.0.0*
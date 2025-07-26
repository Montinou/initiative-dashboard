# Guía de Implementación de Roles

## Introducción

Este documento proporciona instrucciones paso a paso para implementar el sistema de roles basado en acceso (RBAC) en la plataforma de gestión organizacional.

## Roles Definidos

### 1. CEO
- **Acceso**: Completo e irrestricto
- **Función**: Alta dirección y propietarios
- **Usuarios típicos**: Familia Ferrero/Mattio, cargos directivos con participación en AERCA

### 2. Admin
- **Acceso**: Gestión de usuarios y estructura organizativa
- **Función**: Administración operativa sin acceso a datos estratégicos
- **Usuarios típicos**: Jefe de Administración, responsable de RRHH, asistente de dirección

### 3. Analyst
- **Acceso**: Solo lectura de toda la información estratégica
- **Función**: Preparación de reportes y análisis
- **Usuarios típicos**: Personal de control de gestión, staff administrativo para reportes

### 4. Manager
- **Acceso**: Gestión de iniciativas específicas de su área
- **Función**: Ejecución y seguimiento de proyectos departamentales
- **Usuarios típicos**: Jefes de División (Iluminación, Electricidad, Industria), Gerente E-commerce

## Matriz de Permisos

| Permiso | CEO | Admin | Analyst | Manager |
|---------|-----|-------|---------|---------|
| Ver dashboards | ✅ | ❌ | ✅ | ✅* |
| Gestionar usuarios | ✅ | ✅** | ❌ | ❌ |
| Gestionar áreas | ✅ | ✅ | ❌ | ❌ |
| Crear iniciativas | ✅ | ❌ | ❌ | ✅* |
| Editar iniciativas | ✅ | ❌ | ❌ | ✅* |
| Exportar datos | ✅ | ❌ | ✅ | ❌ |
| Ver todas las áreas | ✅ | ❌ | ✅ | ❌ |

*Solo para su área asignada
**No puede gestionar usuarios CEO o Admin

## Implementación Paso a Paso

### Paso 1: Configuración de Base de Datos

```sql
-- Tabla de roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL,
    restrictions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de usuarios con roles
ALTER TABLE users 
ADD COLUMN role_id INTEGER REFERENCES roles(id),
ADD COLUMN area_id INTEGER REFERENCES areas(id);

-- Insertar roles predefinidos
INSERT INTO roles (name, description, permissions, restrictions) VALUES
('CEO', 'Full access to all dashboards, user management, and area administration', 
 '{"viewDashboards": true, "manageUsers": true, "manageAreas": true, "createInitiatives": true, "editInitiatives": true, "exportData": true, "viewAllAreas": true}', 
 '{}'),
('Admin', 'User and area management without strategic data access',
 '{"viewDashboards": false, "manageUsers": true, "manageAreas": true, "createInitiatives": false, "editInitiatives": false, "exportData": false, "viewAllAreas": false}',
 '{"cannotManageRoles": ["CEO", "Admin"], "cannotAccessStrategicData": true}'),
-- ... otros roles
```

### Paso 2: Middleware de Autenticación

```typescript
// middleware/auth.ts
import { hasPermission, canAccessArea } from '@/lib/role-permissions';

export function requirePermission(permission: keyof RolePermissions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // Obtener del JWT/sesión
    
    if (!hasPermission(user.role, permission)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    next();
  };
}

export function requireAreaAccess(targetArea: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!canAccessArea(user.role, user.area, targetArea)) {
      return res.status(403).json({ error: 'Acceso denegado al área' });
    }
    
    next();
  };
}
```

### Paso 3: Componentes de Frontend

```typescript
// hooks/usePermissions.ts
export function usePermissions() {
  const { user } = useAuth();
  
  return {
    canView: (permission: keyof RolePermissions) => 
      hasPermission(user.role, permission),
    canAccessArea: (area: string) => 
      canAccessArea(user.role, user.area, area)
  };
}

// Componente con control de acceso
function DashboardSection() {
  const { canView } = usePermissions();
  
  if (!canView('viewDashboards')) {
    return <AccessDenied />;
  }
  
  return <Dashboard />;
}
```

### Paso 4: Asignación de Usuarios

1. **Crear áreas organizacionales**:
   - División Iluminación
   - División Electricidad  
   - División Industria
   - Administración
   - E-commerce
   - Logística

2. **Asignar usuarios a roles y áreas**:
   ```typescript
   // Ejemplo de asignación
   const userAssignments = [
     { email: 'lucas.ferrero@fema.com', role: 'CEO', area: null },
     { email: 'jefe.iluminacion@fema.com', role: 'Manager', area: 'División Iluminación' },
     { email: 'admin@fema.com', role: 'Admin', area: null },
     { email: 'analista@fema.com', role: 'Analyst', area: null }
   ];
   ```

## Consideraciones de Seguridad

1. **Validación del lado del servidor**: Nunca confiar solo en validaciones del frontend
2. **Logs de auditoría**: Registrar todas las acciones sensibles
3. **Principio de menor privilegio**: Usuarios solo tienen permisos mínimos necesarios
4. **Revisión periódica**: Auditar permisos trimestralmente

## Casos de Uso Específicos para Fema

### Escenario 1: Manager de División
- Lucas es Manager de "División Iluminación"
- Puede crear/editar iniciativas solo de su división
- Ve dashboard filtrado por su área
- No puede ver iniciativas de otras divisiones

### Escenario 2: Analyst para Reportes
- María es Analyst 
- Ve todos los dashboards e iniciativas
- Puede exportar datos para reportes gerenciales
- No puede modificar ningún dato

### Escenario 3: Admin Operativo
- Juan es Admin
- Gestiona usuarios Manager y Analyst
- Crea/edita áreas organizacionales
- No ve datos estratégicos ni dashboards

## Troubleshooting

### Error: "Acceso denegado"
- Verificar que el usuario tenga el rol correcto
- Confirmar que el área asignada sea correcta (para Managers)
- Revisar que los permisos estén correctamente configurados

### Usuario no ve opciones esperadas
- Verificar implementación de `usePermissions` en componentes
- Confirmar que los componentes usen las validaciones correctas
- Revisar middleware de autenticación

## Próximos Pasos

1. Implementar sistema de notificaciones por rol
2. Agregar roles adicionales si es necesario (ej: "Viewer", "Auditor")
3. Configurar workflows de aprobación basados en roles
4. Implementar delegación temporal de permisos
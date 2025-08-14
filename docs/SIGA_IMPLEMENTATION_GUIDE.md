# 🚀 Guía de Implementación del Sistema de Colores SIGA

## 📋 Estado Actual

### ✅ Completamente Implementado

1. **Sistema de Variables CSS Multi-tenant**
   - Activación dinámica con `data-theme="siga"`
   - Soporte completo para modo claro/oscuro
   - Variables CSS que se aplican automáticamente

2. **Paleta de Colores Completa**
   - Verde SIGA: `#00B74A` con escala 50-950
   - Amarillo SIGA: `#FFC107` con escala 50-950
   - Gris Perla: `#F8F9FA` como secundario
   - Colores ajustados para modo oscuro

3. **Componentes Personalizados SIGA**
   - `SigaBadge` - Badge con variantes específicas
   - `SigaButton` - Botón con estilos SIGA
   - `SigaInitiativeCard` - Card personalizada
   - `SigaColorShowcase` - Demo visual completa
   - `SigaThemeProvider` - Provider automático

4. **Hook Personalizado**
   - `useSigaTheme` - Gestión del tema SIGA

## 🔧 Cómo Usar el Sistema

### 1. Activación Automática por Tenant

```tsx
// En tu layout principal (app/[lang]/layout.tsx)
import { SigaThemeProvider } from '@/components/siga/SigaThemeProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SigaThemeProvider>
          {children}
        </SigaThemeProvider>
      </body>
    </html>
  )
}
```

### 2. Activación Manual

```tsx
// Opción A: Con atributo HTML
<div data-theme="siga">
  {/* Contenido con tema SIGA */}
</div>

// Opción B: Con el hook
import { useSigaTheme } from '@/hooks/useSigaTheme'

function MyComponent() {
  const { activateTheme, isActive } = useSigaTheme()
  
  useEffect(() => {
    activateTheme()
  }, [])
  
  return <div>Tema SIGA {isActive ? 'activo' : 'inactivo'}</div>
}
```

### 3. Usar Componentes Base (Se adaptan automáticamente)

```tsx
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

// Estos componentes usarán automáticamente los colores SIGA
// cuando el tema esté activo
<Button variant="default">Verde SIGA</Button>
<Badge variant="secondary">Gris Perla</Badge>
<Card>Contenido con bordes SIGA</Card>
```

### 4. Usar Componentes Específicos SIGA

```tsx
import { SigaButton } from '@/components/ui/button-siga'
import { SigaBadge } from '@/components/ui/badge-siga'
import { SigaInitiativeCard } from '@/components/siga/SigaInitiativeCard'

// Componentes con variantes específicas SIGA
<SigaButton variant="primary">Botón Verde</SigaButton>
<SigaButton variant="accent">Botón Amarillo</SigaButton>
<SigaButton variant="outline-green">Botón Outline</SigaButton>

<SigaBadge variant="success">Éxito</SigaBadge>
<SigaBadge variant="warning">Advertencia</SigaBadge>

<SigaInitiativeCard initiative={data} />
```

### 5. Usar Clases de Tailwind Directamente

```tsx
// Colores principales
<div className="bg-siga-green-500 text-white">Verde SIGA</div>
<div className="bg-siga-yellow-500 text-gray-900">Amarillo SIGA</div>
<div className="bg-siga-gray-50">Gris Perla</div>

// Modo oscuro
<div className="bg-siga-green-dark dark:bg-siga-green-dark">
  Verde adaptativo
</div>

// Escalas
<div className="bg-siga-green-100">Verde muy claro</div>
<div className="bg-siga-green-900">Verde muy oscuro</div>

// Con opacidad
<div className="bg-siga-green/20">Verde 20% opacidad</div>
```

## 📂 Estructura de Archivos

```
components/
├── siga/
│   ├── SigaColorShowcase.tsx      # Demo visual
│   ├── SigaThemeProvider.tsx      # Provider automático
│   └── SigaInitiativeCard.tsx     # Card personalizada
├── ui/
│   ├── badge-siga.tsx             # Badge SIGA
│   └── button-siga.tsx            # Button SIGA
hooks/
└── useSigaTheme.ts                # Hook de gestión
app/
├── globals.css                     # Variables CSS
└── [lang]/
    └── siga-theme/
        └── page.tsx               # Página demo
```

## 🎨 Variables CSS Disponibles

### Modo Claro
```css
[data-theme="siga"] {
  --primary: 142 100% 36%;        /* Verde #00B74A */
  --accent: 45 100% 51%;           /* Amarillo #FFC107 */
  --secondary: 210 20% 98%;        /* Gris Perla #F8F9FA */
}
```

### Modo Oscuro
```css
.dark[data-theme="siga"] {
  --primary: 142 100% 42%;         /* Verde #00D955 */
  --accent: 45 100% 58%;           /* Amarillo #FFCA28 */
  --secondary: 0 0% 12%;           /* Gris oscuro */
}
```

## 🚦 Estados de Componentes

### Initiative Status
- **planning**: Gris perla (secondary)
- **in_progress**: Amarillo SIGA (accent)
- **completed**: Verde SIGA (primary)
- **on_hold**: Destructive/Warning

### Priority Levels
- **critical**: Destructive (rojo)
- **high**: Verde SIGA (primary)
- **medium**: Amarillo SIGA (accent)
- **low**: Gris perla (secondary)

## 📱 Responsive

Los colores se mantienen consistentes en todos los breakpoints:

```tsx
// Cambios de intensidad según pantalla
<div className="
  bg-siga-green-100 
  md:bg-siga-green-200 
  lg:bg-siga-green-300
">
  Intensidad adaptativa
</div>
```

## 🔄 Migración de Componentes Existentes

### Antes (genérico):
```tsx
<Button className="bg-green-500 hover:bg-green-600">
  Acción
</Button>
```

### Después (con SIGA):
```tsx
// Opción 1: Usar componente base (se adapta solo)
<Button variant="default">
  Acción
</Button>

// Opción 2: Usar componente SIGA
<SigaButton variant="primary">
  Acción
</SigaButton>

// Opción 3: Usar clases SIGA
<Button className="bg-siga-green-500 hover:bg-siga-green-600">
  Acción
</Button>
```

## ✅ Checklist de Implementación

- [x] Instalar colores en `tailwind.config.ts`
- [x] Configurar variables CSS en `globals.css`
- [x] Crear componentes específicos SIGA
- [x] Implementar SigaThemeProvider
- [x] Crear hook `useSigaTheme`
- [x] Documentación completa
- [x] Página de demostración
- [ ] Aplicar tema en producción
- [ ] Migrar componentes existentes
- [ ] Testing E2E con tema SIGA

## 🌐 URLs de Demostración

- **Showcase de Colores**: `/siga-theme`
- **Dashboard con Tema**: `/?theme=siga`
- **Subdomain SIGA**: `https://siga.tudominio.com`

## 🐛 Troubleshooting

### El tema no se activa
1. Verificar que `data-theme="siga"` esté en el HTML
2. Revisar que el CSS esté cargado correctamente
3. Limpiar caché del navegador

### Los colores no se ven correctos
1. Verificar modo claro/oscuro
2. Revisar que las clases estén en el safelist
3. Usar las clases con el prefijo `siga-`

### Conflictos con otros temas
1. Asegurarse de remover otros `data-theme`
2. Usar `SigaThemeProvider` con `forceTheme={true}`
3. Verificar orden de CSS

## 📞 Soporte

Para dudas o problemas con la implementación:
- Revisar `/docs/SIGA_COLOR_SYSTEM.md`
- Ver ejemplos en `/components/siga/`
- Contactar al equipo de desarrollo

---

**Última actualización**: Agosto 2025
**Versión**: 1.0.0
**Estado**: ✅ Producción Ready

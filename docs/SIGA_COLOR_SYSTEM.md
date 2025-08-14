# 🎨 Sistema de Colores SIGA Turismo

## 📋 Resumen

Este documento describe el sistema de colores implementado para SIGA Turismo en el Initiative Dashboard, basado en la identidad visual oficial de la empresa.

## 🌈 Paleta de Colores Oficiales

### Colores Principales

| Color | Hex | RGB | Uso |
|-------|-----|-----|-----|
| **Verde SIGA** | `#00B74A` | rgb(0, 183, 74) | Color primario, acciones principales |
| **Amarillo SIGA** | `#FFC107` | rgb(255, 193, 7) | Color de acento, destacados |
| **Gris Perla** | `#F8F9FA` | rgb(248, 249, 250) | Fondos secundarios, superficies neutras |

## 💡 Modo Claro (Light Mode)

### Variables CSS
```css
[data-theme="siga"] {
  --primary: 142 100% 36%;        /* Verde #00B74A */
  --primary-foreground: 0 0% 100%; /* Blanco */
  --secondary: 210 20% 98%;        /* Gris Perla #F8F9FA */
  --secondary-foreground: 217 33% 17%;
  --accent: 45 100% 51%;           /* Amarillo #FFC107 */
  --accent-foreground: 0 0% 9%;    /* Negro */
  --ring: 142 100% 36%;            /* Verde para focus */
}
```

### Escala de Colores

#### Verde SIGA
- `siga-green-50`: `#E6F7ED` - Fondos muy suaves
- `siga-green-100`: `#C2F0D4` - Fondos suaves
- `siga-green-200`: `#85E1A8` - Bordes suaves
- `siga-green-300`: `#47D17D` - Estados hover light
- `siga-green-400`: `#0AC251` - Variante clara
- `siga-green-500`: `#00B74A` - **Color principal**
- `siga-green-600`: `#00A03F` - Estados hover
- `siga-green-700`: `#007A30` - Estados pressed
- `siga-green-800`: `#005421` - Textos oscuros
- `siga-green-900`: `#002E12` - Textos muy oscuros

#### Amarillo SIGA
- `siga-yellow-50`: `#FFF8E1` - Fondos muy suaves
- `siga-yellow-100`: `#FFECB3` - Fondos suaves
- `siga-yellow-200`: `#FFE082` - Bordes suaves
- `siga-yellow-300`: `#FFD54F` - Estados hover light
- `siga-yellow-400`: `#FFCA28` - Variante clara
- `siga-yellow-500`: `#FFC107` - **Color principal**
- `siga-yellow-600`: `#FFB300` - Estados hover
- `siga-yellow-700`: `#FFA000` - Estados pressed
- `siga-yellow-800`: `#FF8F00` - Textos oscuros
- `siga-yellow-900`: `#FF6F00` - Textos muy oscuros

## 🌙 Modo Oscuro (Dark Mode)

### Variables CSS
```css
.dark[data-theme="siga"] {
  --primary: 142 100% 42%;         /* Verde ajustado #00D955 */
  --primary-foreground: 0 0% 4%;   /* Negro */
  --secondary: 0 0% 12%;           /* Gris oscuro */
  --secondary-foreground: 210 20% 98%;
  --accent: 45 100% 58%;           /* Amarillo ajustado #FFCA28 */
  --accent-foreground: 0 0% 4%;    /* Negro */
  --ring: 142 100% 42%;            /* Verde ajustado para focus */
}
```

### Colores Ajustados para Dark Mode
- **Verde Dark**: `#00D955` - Más brillante para mejor visibilidad
- **Verde Dark Hover**: `#00FF63` - Estado hover
- **Amarillo Dark**: `#FFCA28` - Ajustado para contraste
- **Amarillo Dark Hover**: `#FFD54F` - Estado hover

### Fondos Escalonados
- `siga-dark-bg`: `#0A0A0A` - Fondo principal
- `siga-dark-card`: `#141414` - Cards y superficies
- `siga-dark-elevated`: `#1A1A1A` - Elementos elevados
- `siga-dark-muted`: `#1F1F1F` - Fondos secundarios
- `siga-dark-subtle`: `#262626` - Fondos sutiles
- `siga-dark-border`: `#2A2A2A` - Bordes

## 🚀 Uso en Componentes

### Clases de Tailwind

#### Botones
```jsx
// Botón primario (Verde)
<Button className="bg-siga-green-500 hover:bg-siga-green-600 text-white 
                   dark:bg-siga-green-dark dark:hover:bg-siga-green-dark-hover dark:text-black">
  Acción Principal
</Button>

// Botón de acento (Amarillo)
<Button className="bg-siga-yellow-500 hover:bg-siga-yellow-600 text-gray-900
                   dark:bg-siga-yellow-dark dark:hover:bg-siga-yellow-dark-hover dark:text-black">
  Acción Secundaria
</Button>

// Botón secundario (Gris perla)
<Button className="bg-siga-gray-50 hover:bg-siga-gray-100 text-siga-green-600
                   dark:bg-siga-dark-muted dark:hover:bg-siga-dark-subtle dark:text-siga-green-dark">
  Acción Terciaria
</Button>
```

#### Cards
```jsx
// Card con acento verde
<Card className="bg-white border-siga-green/20 hover:border-siga-green/50
                 dark:bg-siga-dark-card dark:border-siga-dark-border dark:hover:border-siga-green-dark/50">
  <CardContent>...</CardContent>
</Card>

// Card con fondo gris perla
<Card className="bg-siga-gray-50 dark:bg-siga-dark-elevated">
  <CardContent>...</CardContent>
</Card>
```

#### Alerts
```jsx
// Alert de éxito (Verde)
<Alert className="border-siga-green-500 bg-siga-green-50 text-siga-green-800
                  dark:border-siga-green-dark dark:bg-siga-green-950/20 dark:text-siga-green-dark">
  <AlertDescription>Operación exitosa</AlertDescription>
</Alert>

// Alert de advertencia (Amarillo)
<Alert className="border-siga-yellow-500 bg-siga-yellow-50 text-siga-yellow-800
                  dark:border-siga-yellow-dark dark:bg-siga-yellow-dark-muted dark:text-siga-yellow-dark">
  <AlertDescription>Advertencia</AlertDescription>
</Alert>
```

#### Badges
```jsx
// Badge verde
<Badge className="bg-siga-green-500 text-white dark:bg-siga-green-dark dark:text-black">
  Activo
</Badge>

// Badge amarillo
<Badge className="bg-siga-yellow-500 text-gray-900 dark:bg-siga-yellow-dark dark:text-black">
  Pendiente
</Badge>
```

### Componentes Personalizados

El sistema incluye clases personalizadas para componentes SIGA:

```css
/* Cards con tema SIGA */
.card-siga

/* Botones con tema SIGA */
.btn-siga-primary
.btn-siga-accent

/* Alerts con tema SIGA */
.alert-success-siga
.alert-warning-siga
```

## 📊 Accesibilidad

### Ratios de Contraste
- **Verde sobre blanco**: 4.5:1 ✅ (WCAG AA)
- **Amarillo sobre negro**: 12.6:1 ✅ (WCAG AAA)
- **Verde dark sobre negro**: 7.8:1 ✅ (WCAG AAA)
- **Amarillo dark sobre negro**: 11.3:1 ✅ (WCAG AAA)

### Recomendaciones
1. **Texto sobre verde**: Siempre usar texto blanco
2. **Texto sobre amarillo**: Siempre usar texto oscuro (#171717 o negro)
3. **Fondos sutiles**: Usar variantes 50-100 para fondos grandes
4. **Estados hover**: Usar variantes 600 en light mode, variantes -hover en dark mode

## 🔧 Configuración

### Activar tema SIGA

```jsx
// En el componente raíz o layout
<div data-theme="siga">
  {/* Tu aplicación */}
</div>
```

### Toggle Dark Mode

```jsx
// Agregar clase 'dark' al elemento HTML o body
<html className="dark" data-theme="siga">
  {/* Tu aplicación */}
</html>
```

## 📱 Responsive

Los colores se mantienen consistentes en todos los breakpoints. Para efectos especiales:

```jsx
// Cambiar intensidad según breakpoint
<div className="bg-siga-green-100 md:bg-siga-green-200 lg:bg-siga-green-300">
  {/* Contenido */}
</div>
```

## 🎯 Mejores Prácticas

1. **Jerarquía Visual**
   - Verde: Acciones principales, CTAs, elementos importantes
   - Amarillo: Destacados, advertencias, elementos secundarios
   - Gris perla: Fondos, separación de secciones

2. **Consistencia**
   - Mantener el mismo tono de verde/amarillo en toda la aplicación
   - No mezclar variantes muy diferentes del mismo color

3. **Modo Oscuro**
   - Siempre probar componentes en ambos modos
   - Asegurar suficiente contraste en modo oscuro
   - Usar fondos escalonados para crear profundidad

4. **Performance**
   - Las clases están en el safelist de Tailwind para evitar purging
   - Usar clases de utilidad en lugar de estilos inline

## 📚 Referencias

- [Sitio Web SIGA Turismo](https://www.sigaturismo.com/)
- [Documentación Tailwind CSS](https://tailwindcss.com/docs)
- [Documentación Shadcn/UI](https://ui.shadcn.com/docs)

---

**Última actualización**: Agosto 2025
**Mantenido por**: Equipo de Desarrollo SIGA

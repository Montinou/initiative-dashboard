# Prompt para Rediseñar Dashboard

Analiza este dashboard de objetivos y rediseñalo usando shadcn/ui.

## Problemas actuales a resolver:
- Cards de diferentes alturas (necesitan altura uniforme)
- Distribución desigual del espacio
- KPIs muy grandes (reducir altura)
- Sidebar muy ancho
- Espaciado inconsistente

## Requisitos del nuevo diseño:

### Layout:
- Grid de 12 columnas
- Sidebar de 240px máximo
- Gap consistente de 1rem (16px)

### Componentes a usar:
1. **KPIs superiores**: Card compacto (h-24) con CardContent
2. **Lista de objetivos**: Card uniforme (h-[200px]) con:
   - CardHeader: título y Badge de estado
   - CardContent: Progress bar y fechas
   - CardFooter: botones de acción
3. **Filtros**: Select y Button
4. **Navegación**: Tabs para alternar vistas

### Responsive:
- Desktop (lg): 3 cards por fila
- Tablet (md): 2 cards por fila  
- Mobile (sm): 1 card por fila

Genera el código completo del componente mejorado.
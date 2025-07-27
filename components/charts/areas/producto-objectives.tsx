"use client";

import { ObjectiveTrackingChart } from '../objective-tracking';

// TODO: Replace with actual Producto objectives data from database/API
const productoObjectives = [
  {
    objective: 'Nueva funcionalidad',
    progress: 70,
    obstacles: 'Recursos limitados',
    enablers: 'Clientes aliados',
    status: '🟡' as const,
    area: 'Producto'
  },
  {
    objective: 'Reducir bugs críticos',
    progress: 40,
    obstacles: 'Errores de integración',
    enablers: 'Equipo técnico comprometido',
    status: '🔴' as const,
    area: 'Producto'
  }
];

export function ProductoObjectivesChart() {
  return (
    <ObjectiveTrackingChart
      data={productoObjectives}
      area="Producto"
      title="Objetivos Producto - Q2"
      description="Seguimiento de iniciativas de desarrollo y calidad"
    />
  );
}
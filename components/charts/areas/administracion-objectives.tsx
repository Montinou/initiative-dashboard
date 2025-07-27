"use client";

import { ObjectiveTrackingChart } from '../objective-tracking';

// TODO: Replace with actual Administración objectives data from database/API
const administracionObjectives = [
  {
    objective: 'Reducir tiempos de facturación',
    progress: 45,
    obstacles: 'Procesos manuales',
    enablers: 'Automatización parcial',
    status: '🟡' as const,
    area: 'Administración'
  },
  {
    objective: 'Control de gastos',
    progress: 30,
    obstacles: 'Demoras en reportes',
    enablers: 'Apoyo de gerencia',
    status: '🔴' as const,
    area: 'Administración'
  }
];

export function AdministracionObjectivesChart() {
  return (
    <ObjectiveTrackingChart
      data={administracionObjectives}
      area="Administración"
      title="Objetivos Administración - Q2"
      description="Seguimiento de iniciativas del área administrativa"
    />
  );
}
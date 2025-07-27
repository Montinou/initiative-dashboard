"use client";

import { ObjectiveTrackingChart } from '../objective-tracking';

// TODO: Replace with actual Comercial objectives data from database/API
const comercialObjectives = [
  {
    objective: 'Implementar CRM',
    progress: 50,
    obstacles: 'Falta de tiempo',
    enablers: 'Capacitación previa',
    status: '🟢' as const,
    area: 'Comercial'
  },
  {
    objective: 'Forecast comercial',
    progress: 60,
    obstacles: 'Datos inconsistentes',
    enablers: 'Sistema de control',
    status: '🟡' as const,
    area: 'Comercial'
  }
];

export function ComercialObjectivesChart() {
  return (
    <ObjectiveTrackingChart
      data={comercialObjectives}
      area="Comercial"
      title="Objetivos Comercial - Q2"
      description="Seguimiento de iniciativas del área comercial y ventas"
    />
  );
}
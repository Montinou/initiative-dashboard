"use client";

import { ObjectiveTrackingChart } from '../objective-tracking';
import { useAreaObjectives } from '@/hooks/useAreaObjectives';

export function AdministracionObjectivesChart() {
  const { objectives, isLoading, error } = useAreaObjectives('administracion');

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-destructive">
        Error loading objectives: {error}
      </div>
    );
  }

  return (
    <ObjectiveTrackingChart
      data={objectives || []}
      area="Administración"
      title="Objetivos Administración - Q2"
      description="Seguimiento de iniciativas del área administrativa"
    />
  );
}
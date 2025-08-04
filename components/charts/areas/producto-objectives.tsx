"use client";

import { ObjectiveTrackingChart } from '../objective-tracking';
import { useAreaObjectives } from '@/hooks/useAreaObjectives';

export function ProductoObjectivesChart() {
  const { objectives, isLoading, error } = useAreaObjectives('producto');

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading objectives: {error}
      </div>
    );
  }

  return (
    <ObjectiveTrackingChart
      data={objectives || []}
      area="Producto"
      title="Objetivos Producto - Q2"
      description="Seguimiento de iniciativas de desarrollo y calidad"
    />
  );
}
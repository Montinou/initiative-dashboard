/**
 * KPI Calculator Module
 * 
 * Provides comprehensive KPI calculation utilities for the standardized
 * initiative tracking system. Handles weighted progress calculations,
 * strategic metrics, and role-based KPI summaries.
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

import { createClient } from '@/utils/supabase/server';
import type { Initiative, ProgressMethod } from '@/types/database';

// ===================================================================================
// TYPES AND INTERFACES
// ===================================================================================

export interface KPISummary {
  totalInitiatives: number;
  completedInitiatives: number;
  averageProgress: number;
  overdueInitiatives: number;
  strategicWeight: number;
  strategicProgress: number;
  totalBudget: number;
  totalActualCost: number;
  budgetUtilization: number;
  lastUpdated: string;
}

export interface AreaKPIMetrics {
  areaId: string;
  areaName: string;
  totalInitiatives: number;
  completedInitiatives: number;
  averageProgress: number;
  weightedProgress: number;
  strategicInitiatives: number;
  overdueInitiatives: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  efficiencyRatio: number;
}

export interface StrategicMetrics {
  totalStrategic: number;
  completedStrategic: number;
  averageStrategicProgress: number;
  totalStrategicWeight: number;
  criticalStrategicInitiatives: Initiative[];
}

export interface KPIFilters {
  area_id?: string;
  status?: string;
  is_strategic?: boolean;
  kpi_category?: string;
  progress_method?: ProgressMethod;
  date_range?: {
    start: string;
    end: string;
  };
}

// ===================================================================================
// CORE KPI CALCULATION FUNCTIONS
// ===================================================================================

/**
 * Calculates weighted progress for initiatives based on their weight_factor
 */
export function calculateWeightedProgress(initiatives: Initiative[]): number {
  if (!initiatives || initiatives.length === 0) return 0;

  const totalWeight = initiatives.reduce((sum, initiative) => sum + initiative.weight_factor, 0);
  const weightedSum = initiatives.reduce((sum, initiative) => {
    return sum + (initiative.progress * initiative.weight_factor);
  }, 0);

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

/**
 * Calculates progress based on the specified progress method
 */
export function calculateProgressByMethod(
  initiative: Initiative,
  subtasks?: Array<{ completed: boolean; weight_percentage?: number }> 
): number {
  switch (initiative.progress_method) {
    case 'manual':
      return initiative.progress;
    
    case 'subtask_based':
      if (!subtasks || subtasks.length === 0) return 0;
      const completedCount = subtasks.filter(subtask => subtask.completed).length;
      return Math.round((completedCount / subtasks.length) * 100);
    
    case 'hybrid':
      if (!subtasks || subtasks.length === 0) return initiative.progress;
      
      // Use weighted subtask progress if weights are available
      const hasWeights = subtasks.some(subtask => subtask.weight_percentage && subtask.weight_percentage > 0);
      
      if (hasWeights) {
        const weightedProgress = subtasks.reduce((sum, subtask) => {
          const weight = subtask.weight_percentage || 0;
          const progress = subtask.completed ? 100 : 0;
          return sum + (progress * weight / 100);
        }, 0);
        
        // Combine with manual progress (70% subtasks, 30% manual)
        return Math.round(weightedProgress * 0.7 + initiative.progress * 0.3);
      } else {
        // Fallback to simple subtask completion
        const completedCount = subtasks.filter(subtask => subtask.completed).length;
        const subtaskProgress = Math.round((completedCount / subtasks.length) * 100);
        return Math.round(subtaskProgress * 0.7 + initiative.progress * 0.3);
      }
    
    default:
      return initiative.progress;
  }
}

/**
 * Calculates efficiency ratio (actual hours vs estimated hours)
 */
export function calculateEfficiencyRatio(estimatedHours: number, actualHours: number): number {
  if (!estimatedHours || estimatedHours === 0) return 1;
  return Math.round((estimatedHours / actualHours) * 100) / 100;
}

// ===================================================================================
// DATABASE QUERY FUNCTIONS
// ===================================================================================

/**
 * Fetches initiatives with KPI calculations based on filters and user role
 */
export async function getInitiativesWithKPIs(
  tenantId: string,
  filters: KPIFilters = {},
  userRole?: string,
  userAreaId?: string
): Promise<Initiative[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('initiatives')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  // Apply role-based filtering
  if (userRole === 'Manager' && userAreaId) {
    query = query.eq('area_id', userAreaId);
  }

  // Apply additional filters
  if (filters.area_id) {
    query = query.eq('area_id', filters.area_id);
  }
  
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters.is_strategic !== undefined) {
    query = query.eq('is_strategic', filters.is_strategic);
  }
  
  if (filters.kpi_category) {
    query = query.eq('kpi_category', filters.kpi_category);
  }
  
  if (filters.progress_method) {
    query = query.eq('progress_method', filters.progress_method);
  }

  if (filters.date_range) {
    query = query
      .gte('target_date', filters.date_range.start)
      .lte('target_date', filters.date_range.end);
  }

  const { data: initiatives, error } = await query;

  if (error) {
    console.error('Error fetching initiatives with KPIs:', error);
    throw new Error(`Failed to fetch initiatives: ${error.message}`);
  }

  // Return initiatives without complex progress calculations for now
  return (initiatives || []).map(initiative => ({
    ...initiative,
    calculatedProgress: initiative.progress || 0
  }));
}

/**
 * Calculates comprehensive KPI summary using materialized views for performance
 */
export async function calculateKPISummary(
  tenantId: string,
  filters: KPIFilters = {},
  userRole?: string,
  userAreaId?: string
): Promise<KPISummary> {
  const supabase = await createClient();
  
  // Fallback to direct calculation since materialized views may not exist
  return calculateKPISummaryFallback(tenantId, filters, userRole, userAreaId);
}

/**
 * Fallback KPI calculation method (original implementation)
 */
async function calculateKPISummaryFallback(
  tenantId: string,
  filters: KPIFilters = {},
  userRole?: string,
  userAreaId?: string
): Promise<KPISummary> {
  const initiatives = await getInitiativesWithKPIs(tenantId, filters, userRole, userAreaId);
  
  const totalInitiatives = initiatives.length;
  const completedInitiatives = initiatives.filter(i => i.status === 'completed').length;
  const averageProgress = calculateWeightedProgress(initiatives);
  
  // Calculate overdue initiatives
  const currentDate = new Date();
  const overdueInitiatives = initiatives.filter(i => 
    i.target_date && 
    new Date(i.target_date) < currentDate && 
    i.status !== 'completed'
  ).length;

  // Strategic metrics
  const strategicInitiatives = initiatives.filter(i => i.is_strategic);
  const strategicWeight = strategicInitiatives.reduce((sum, i) => sum + i.weight_factor, 0);
  const strategicProgress = strategicInitiatives.length > 0 
    ? calculateWeightedProgress(strategicInitiatives)
    : 0;

  // Budget metrics
  const totalBudget = initiatives.reduce((sum, i) => sum + (i.budget || 0), 0);
  const totalActualCost = initiatives.reduce((sum, i) => sum + (i.actual_cost || 0), 0);
  const budgetUtilization = totalBudget > 0 ? (totalActualCost / totalBudget) * 100 : 0;

  return {
    totalInitiatives,
    completedInitiatives,
    averageProgress,
    overdueInitiatives,
    strategicWeight,
    strategicProgress,
    totalBudget,
    totalActualCost,
    budgetUtilization,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Gets KPI metrics for each area in a tenant
 */
export async function getAreaKPIMetrics(
  tenantId: string,
  userRole?: string,
  userAreaId?: string
): Promise<AreaKPIMetrics[]> {
  const supabase = await createClient();
  
  let areaQuery = supabase
    .from('areas')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  // Filter by area for Managers
  if (userRole === 'Manager' && userAreaId) {
    areaQuery = areaQuery.eq('id', userAreaId);
  }

  const { data: areas, error: areasError } = await areaQuery;

  if (areasError) {
    throw new Error(`Failed to fetch areas: ${areasError.message}`);
  }

  const areaMetrics: AreaKPIMetrics[] = [];

  for (const area of areas || []) {
    const initiatives = await getInitiativesWithKPIs(tenantId, { area_id: area.id });
    
    const totalInitiatives = initiatives.length;
    const completedInitiatives = initiatives.filter(i => i.status === 'completed').length;
    const averageProgress = initiatives.length > 0 
      ? Math.round(initiatives.reduce((sum, i) => sum + i.progress, 0) / initiatives.length)
      : 0;
    const weightedProgress = calculateWeightedProgress(initiatives);
    
    const strategicInitiatives = initiatives.filter(i => i.is_strategic).length;
    const overdueInitiatives = initiatives.filter(i => 
      i.target_date && 
      new Date(i.target_date) < new Date() && 
      i.status !== 'completed'
    ).length;

    const totalEstimatedHours = initiatives.reduce((sum, i) => sum + (i.estimated_hours || 0), 0);
    const totalActualHours = initiatives.reduce((sum, i) => sum + i.actual_hours, 0);
    const efficiencyRatio = calculateEfficiencyRatio(totalEstimatedHours, totalActualHours);

    areaMetrics.push({
      areaId: area.id,
      areaName: area.name,
      totalInitiatives,
      completedInitiatives,
      averageProgress,
      weightedProgress,
      strategicInitiatives,
      overdueInitiatives,
      totalEstimatedHours,
      totalActualHours,
      efficiencyRatio
    });
  }

  return areaMetrics;
}

/**
 * Gets strategic initiatives metrics (CEO/Admin only)
 */
export async function getStrategicMetrics(tenantId: string): Promise<StrategicMetrics> {
  const supabase = await createClient();
  
  // Use direct calculation since materialized views may not exist
  return getStrategicMetricsFallback(tenantId);
}

/**
 * Fallback strategic metrics calculation
 */
async function getStrategicMetricsFallback(tenantId: string): Promise<StrategicMetrics> {
  const strategicInitiatives = await getInitiativesWithKPIs(tenantId, { is_strategic: true });
  
  const totalStrategic = strategicInitiatives.length;
  const completedStrategic = strategicInitiatives.filter(i => i.status === 'completed').length;
  const averageStrategicProgress = calculateWeightedProgress(strategicInitiatives);
  const totalStrategicWeight = strategicInitiatives.reduce((sum, i) => sum + i.weight_factor, 0);
  
  // Critical strategic initiatives (high weight, behind schedule)
  const criticalStrategicInitiatives = strategicInitiatives.filter(i => 
    i.weight_factor > 2.0 && 
    i.progress < 50 && 
    i.target_date && 
    new Date(i.target_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Within 30 days
  );

  return {
    totalStrategic,
    completedStrategic,
    averageStrategicProgress,
    totalStrategicWeight,
    criticalStrategicInitiatives
  };
}

// ===================================================================================
// UTILITY FUNCTIONS
// ===================================================================================

/**
 * Validates KPI data consistency
 */
export function validateKPIData(initiative: Initiative): string[] {
  const errors: string[] = [];

  // Check progress method consistency
  if (initiative.progress_method === 'subtask_based' && (!initiative.subtasks || initiative.subtasks.length === 0)) {
    errors.push('Subtask-based progress method requires at least one subtask');
  }

  // Check weight factor range
  if (initiative.weight_factor < 0.1 || initiative.weight_factor > 3.0) {
    errors.push('Weight factor must be between 0.1 and 3.0');
  }

  // Check strategic initiative weight
  if (initiative.is_strategic && initiative.weight_factor < 1.0) {
    errors.push('Strategic initiatives should have weight factor >= 1.0');
  }

  // Check hours consistency
  if (initiative.estimated_hours && initiative.actual_hours > initiative.estimated_hours * 2) {
    errors.push('Actual hours significantly exceed estimated hours - consider reviewing estimates');
  }

  return errors;
}

/**
 * Generates KPI insights based on data patterns
 */
export function generateKPIInsights(areaMetrics: AreaKPIMetrics[]): string[] {
  const insights: string[] = [];

  // Performance insights
  const topPerformingArea = areaMetrics.reduce((top, area) => 
    area.weightedProgress > top.weightedProgress ? area : top
  );
  
  if (topPerformingArea.weightedProgress > 80) {
    insights.push(`${topPerformingArea.areaName} is performing excellently with ${topPerformingArea.weightedProgress}% weighted progress`);
  }

  // Efficiency insights
  const efficientAreas = areaMetrics.filter(area => area.efficiencyRatio > 1.2);
  if (efficientAreas.length > 0) {
    insights.push(`${efficientAreas.length} area(s) are exceeding efficiency targets`);
  }

  // Risk insights
  const riskyAreas = areaMetrics.filter(area => area.overdueInitiatives > area.totalInitiatives * 0.3);
  if (riskyAreas.length > 0) {
    insights.push(`${riskyAreas.length} area(s) have high overdue initiative ratios - attention needed`);
  }

  return insights;
}
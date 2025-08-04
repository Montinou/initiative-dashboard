-- Migration: Enhanced KPI Standardization Schema for Initiatives
-- Priority: P0 | Complexity: M | Time: 4-6 hours
-- Description: Extend initiatives table with KPI standardization fields
-- Author: Claude Code Assistant
-- Date: 2025-08-04

-- ===================================================================================
-- PHASE 1: ADD NEW COLUMNS TO INITIATIVES TABLE
-- ===================================================================================

-- Add new columns to initiatives table for KPI standardization
ALTER TABLE public.initiatives 
ADD COLUMN IF NOT EXISTS progress_method TEXT DEFAULT 'manual' 
  CHECK (progress_method IN ('manual', 'subtask_based', 'hybrid')),
ADD COLUMN IF NOT EXISTS weight_factor DECIMAL(3,2) DEFAULT 1.0 
  CHECK (weight_factor > 0 AND weight_factor <= 3.0),
ADD COLUMN IF NOT EXISTS estimated_hours INTEGER 
  CHECK (estimated_hours > 0),
ADD COLUMN IF NOT EXISTS actual_hours INTEGER DEFAULT 0 
  CHECK (actual_hours >= 0),
ADD COLUMN IF NOT EXISTS kpi_category TEXT DEFAULT 'operational',
ADD COLUMN IF NOT EXISTS is_strategic BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS success_criteria JSONB DEFAULT '{}'::jsonb;

-- ===================================================================================
-- PHASE 2: ADD COMMENTS FOR DOCUMENTATION
-- ===================================================================================

-- Add column comments for clarity
COMMENT ON COLUMN public.initiatives.progress_method IS 'Method used to calculate progress: manual (user-set), subtask_based (calculated from activities), hybrid (combination)';
COMMENT ON COLUMN public.initiatives.weight_factor IS 'Strategic weighting factor for KPI calculations (1.0 = normal, up to 3.0 for critical initiatives)';
COMMENT ON COLUMN public.initiatives.estimated_hours IS 'Estimated effort in hours for completion';
COMMENT ON COLUMN public.initiatives.actual_hours IS 'Actual hours logged against this initiative';
COMMENT ON COLUMN public.initiatives.kpi_category IS 'Category for KPI grouping (operational, strategic, tactical, etc.)';
COMMENT ON COLUMN public.initiatives.is_strategic IS 'Flag indicating if this is a strategic initiative requiring CEO/Admin visibility';
COMMENT ON COLUMN public.initiatives.dependencies IS 'JSONB array of initiative IDs or external dependencies';
COMMENT ON COLUMN public.initiatives.success_criteria IS 'JSONB object containing success metrics and criteria';

-- ===================================================================================
-- PHASE 3: CREATE INDEXES FOR PERFORMANCE
-- ===================================================================================

-- Index for KPI queries (filtering by strategic, category, progress method)
CREATE INDEX IF NOT EXISTS idx_initiatives_kpi_filtering 
ON public.initiatives (tenant_id, area_id, is_strategic, kpi_category, progress_method);

-- Index for weight-based calculations
CREATE INDEX IF NOT EXISTS idx_initiatives_weight_calculations 
ON public.initiatives (tenant_id, weight_factor, progress, status) 
WHERE weight_factor > 1.0;

-- Index for progress method queries
CREATE INDEX IF NOT EXISTS idx_initiatives_progress_method 
ON public.initiatives (progress_method, tenant_id, area_id);

-- ===================================================================================
-- PHASE 4: CREATE VALIDATION FUNCTIONS
-- ===================================================================================

-- Function to validate progress method consistency
CREATE OR REPLACE FUNCTION validate_progress_method_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- If progress_method is 'subtask_based', ensure subtasks exist or progress is 0
    IF NEW.progress_method = 'subtask_based' AND NEW.progress > 0 THEN
        -- Check if subtasks exist for this initiative
        IF NOT EXISTS (
            SELECT 1 FROM public.activities 
            WHERE initiative_id = NEW.id AND tenant_id = NEW.tenant_id
        ) THEN
            RAISE WARNING 'Initiative % has subtask-based progress method but no subtasks exist. Consider creating subtasks or changing to manual method.', NEW.id;
        END IF;
    END IF;
    
    -- If strategic initiative, ensure weight_factor is appropriate
    IF NEW.is_strategic = true AND NEW.weight_factor < 1.5 THEN
        RAISE NOTICE 'Strategic initiative % has low weight factor (%). Consider increasing for proper KPI impact.', NEW.id, NEW.weight_factor;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS trigger_validate_progress_method ON public.initiatives;
CREATE TRIGGER trigger_validate_progress_method
    BEFORE INSERT OR UPDATE ON public.initiatives
    FOR EACH ROW EXECUTE FUNCTION validate_progress_method_consistency();

-- ===================================================================================
-- PHASE 5: CREATE HELPER FUNCTIONS FOR KPI CALCULATIONS
-- ===================================================================================

-- Function to calculate weighted progress for an area
CREATE OR REPLACE FUNCTION calculate_area_weighted_progress(
    p_tenant_id UUID,
    p_area_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    weighted_progress DECIMAL;
BEGIN
    SELECT COALESCE(
        SUM(progress * weight_factor) / NULLIF(SUM(weight_factor), 0),
        0
    ) INTO weighted_progress
    FROM public.initiatives
    WHERE tenant_id = p_tenant_id 
      AND area_id = p_area_id 
      AND status != 'completed';
    
    RETURN COALESCE(weighted_progress, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get strategic initiatives summary
CREATE OR REPLACE FUNCTION get_strategic_initiatives_summary(
    p_tenant_id UUID
) RETURNS TABLE (
    total_strategic INTEGER,
    completed_strategic INTEGER,
    avg_strategic_progress DECIMAL,
    total_strategic_weight DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_strategic,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed_strategic,
        ROUND(AVG(progress), 2) as avg_strategic_progress,
        ROUND(SUM(weight_factor), 2) as total_strategic_weight
    FROM public.initiatives
    WHERE tenant_id = p_tenant_id 
      AND is_strategic = true;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================================
-- PHASE 6: UPDATE RLS POLICIES FOR NEW COLUMNS
-- ===================================================================================

-- Ensure RLS policies cover new columns (strategic initiatives visibility)
-- CEO and Admin can see all strategic initiatives regardless of area
DROP POLICY IF EXISTS "CEO_Admin_strategic_initiatives_access" ON public.initiatives;
CREATE POLICY "CEO_Admin_strategic_initiatives_access" ON public.initiatives
    FOR SELECT USING (
        is_strategic = true AND
        tenant_id IN (
            SELECT up.tenant_id 
            FROM public.user_profiles up 
            WHERE up.user_id = auth.uid() 
              AND up.role IN ('CEO', 'Admin')
        )
    );

-- ===================================================================================
-- PHASE 7: DATA MIGRATION FOR EXISTING RECORDS
-- ===================================================================================

-- Update existing initiatives with default values based on current data
UPDATE public.initiatives 
SET 
    progress_method = CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.activities 
            WHERE activities.initiative_id = initiatives.id
        ) THEN 'hybrid'
        ELSE 'manual'
    END,
    weight_factor = CASE 
        WHEN priority = 'high' THEN 1.5
        WHEN priority = 'medium' THEN 1.0
        ELSE 0.8
    END,
    kpi_category = CASE 
        WHEN budget > 10000 THEN 'strategic'
        WHEN target_date IS NOT NULL AND target_date < CURRENT_DATE + INTERVAL '3 months' THEN 'tactical'
        ELSE 'operational'
    END,
    is_strategic = CASE 
        WHEN priority = 'high' AND budget > 10000 THEN true
        ELSE false
    END,
    success_criteria = jsonb_build_object(
        'completion_target', 100,
        'quality_threshold', 'high',
        'budget_adherence', true
    )
WHERE progress_method IS NULL;

-- ===================================================================================
-- MIGRATION VALIDATION
-- ===================================================================================

-- Validate that all initiatives have proper default values
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM public.initiatives
    WHERE progress_method IS NULL 
       OR weight_factor IS NULL 
       OR kpi_category IS NULL 
       OR is_strategic IS NULL;
    
    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % initiatives with NULL values in new KPI fields. Manual intervention may be required.', invalid_count;
    ELSE
        RAISE NOTICE 'Migration completed successfully. All initiatives have proper KPI field values.';
    END IF;
END $$;

-- ===================================================================================
-- PERFORMANCE ANALYSIS
-- ===================================================================================

-- Analyze table statistics after migration
ANALYZE public.initiatives;

-- Display migration summary
SELECT 
    'Migration Summary' as info,
    COUNT(*) as total_initiatives,
    COUNT(CASE WHEN is_strategic THEN 1 END) as strategic_initiatives,
    COUNT(CASE WHEN progress_method = 'subtask_based' THEN 1 END) as subtask_based_initiatives,
    COUNT(CASE WHEN progress_method = 'hybrid' THEN 1 END) as hybrid_initiatives,
    COUNT(CASE WHEN progress_method = 'manual' THEN 1 END) as manual_initiatives,
    ROUND(AVG(weight_factor), 2) as avg_weight_factor
FROM public.initiatives;
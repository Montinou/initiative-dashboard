-- Migration: Enhanced Weight-Based Progress Tracking for Activities
-- Priority: P0 | Complexity: M | Time: 4-6 hours  
-- Description: Add weight-based progress tracking to activities table
-- Author: Claude Code Assistant
-- Date: 2025-08-04
-- Dependencies: 20250804_enhance_initiatives_kpi.sql

-- ===================================================================================
-- PHASE 1: ADD NEW COLUMNS TO ACTIVITIES TABLE
-- ===================================================================================

-- Add new columns to activities table for weight-based progress tracking
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS weight_percentage DECIMAL(5,2) DEFAULT 10.0 
  CHECK (weight_percentage > 0 AND weight_percentage <= 100),
ADD COLUMN IF NOT EXISTS estimated_hours INTEGER 
  CHECK (estimated_hours > 0),
ADD COLUMN IF NOT EXISTS actual_hours INTEGER DEFAULT 0 
  CHECK (actual_hours >= 0),
ADD COLUMN IF NOT EXISTS completion_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subtask_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' 
  CHECK (priority IN ('low', 'medium', 'high', 'critical'));

-- ===================================================================================
-- PHASE 2: ADD COLUMN COMMENTS FOR DOCUMENTATION
-- ===================================================================================

COMMENT ON COLUMN public.activities.weight_percentage IS 'Percentage weight of this activity toward total initiative progress (0.01-100.00)';
COMMENT ON COLUMN public.activities.estimated_hours IS 'Estimated effort in hours for this activity';
COMMENT ON COLUMN public.activities.actual_hours IS 'Actual hours logged for this activity';
COMMENT ON COLUMN public.activities.completion_date IS 'Timestamp when the activity was marked as completed';
COMMENT ON COLUMN public.activities.subtask_order IS 'Display order of subtasks within an initiative';
COMMENT ON COLUMN public.activities.dependencies IS 'JSONB array of activity IDs or external dependencies';
COMMENT ON COLUMN public.activities.notes IS 'Additional notes or comments about the activity';
COMMENT ON COLUMN public.activities.priority IS 'Priority level of this specific activity';

-- ===================================================================================
-- PHASE 3: CREATE WEIGHT VALIDATION FUNCTION AND TRIGGER
-- ===================================================================================

-- Function to validate subtask weights don't exceed 100% per initiative
CREATE OR REPLACE FUNCTION validate_subtask_weights()
RETURNS TRIGGER AS $$
DECLARE
    total_weight DECIMAL(5,2);
    initiative_progress_method TEXT;
BEGIN
    -- Get the initiative's progress method
    SELECT progress_method INTO initiative_progress_method
    FROM public.initiatives 
    WHERE id = NEW.initiative_id;
    
    -- Only validate weights for subtask_based or hybrid methods
    IF initiative_progress_method IN ('subtask_based', 'hybrid') THEN
        -- Calculate total weight for this initiative (excluding the current record if it's an update)
        SELECT COALESCE(SUM(weight_percentage), 0) INTO total_weight
        FROM public.activities 
        WHERE initiative_id = NEW.initiative_id 
          AND tenant_id = NEW.tenant_id
          AND id != COALESCE(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid);
          
        -- Check if adding this weight would exceed 100%
        IF (total_weight + NEW.weight_percentage) > 100 THEN
            RAISE EXCEPTION 'Total subtask weights cannot exceed 100%% for initiative %', NEW.initiative_id;
        END IF;
        
        -- Warning if total weight is getting close to 100%
        IF (total_weight + NEW.weight_percentage) > 95 AND (total_weight + NEW.weight_percentage) <= 100 THEN
            RAISE NOTICE 'Initiative % subtask weights are at %. Consider review for optimal distribution.', 
                NEW.initiative_id, (total_weight + NEW.weight_percentage);
        END IF;
    END IF;
    
    -- Auto-set completion_date when status changes to completed
    IF NEW.status = 'Completado' AND (OLD IS NULL OR OLD.status != 'Completado') THEN
        NEW.completion_date = CURRENT_TIMESTAMP;
    END IF;
    
    -- Clear completion_date if status changes from completed to something else
    IF NEW.status != 'Completado' AND OLD IS NOT NULL AND OLD.status = 'Completado' THEN
        NEW.completion_date = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS subtask_weight_validation ON public.activities;
CREATE TRIGGER subtask_weight_validation 
    BEFORE INSERT OR UPDATE ON public.activities 
    FOR EACH ROW EXECUTE FUNCTION validate_subtask_weights();

-- ===================================================================================
-- PHASE 4: CREATE AUTOMATIC PROGRESS UPDATE FUNCTION
-- ===================================================================================

-- Function to automatically update initiative progress based on subtask completion
CREATE OR REPLACE FUNCTION update_initiative_progress_from_subtasks()
RETURNS TRIGGER AS $$
DECLARE
    initiative_progress_method TEXT;
    calculated_progress INTEGER;
    total_weight DECIMAL(5,2);
    completed_weight DECIMAL(5,2);
    total_subtasks INTEGER;
    completed_subtasks INTEGER;
BEGIN
    -- Get the initiative's progress method
    SELECT progress_method INTO initiative_progress_method
    FROM public.initiatives 
    WHERE id = COALESCE(NEW.initiative_id, OLD.initiative_id);
    
    -- Only auto-update for subtask_based initiatives
    IF initiative_progress_method = 'subtask_based' THEN
        -- Get totals for weight-based calculation
        SELECT 
            COALESCE(SUM(weight_percentage), 0),
            COALESCE(SUM(CASE WHEN status = 'Completado' THEN weight_percentage ELSE 0 END), 0),
            COUNT(*),
            COUNT(CASE WHEN status = 'Completado' THEN 1 END)
        INTO total_weight, completed_weight, total_subtasks, completed_subtasks
        FROM public.activities 
        WHERE initiative_id = COALESCE(NEW.initiative_id, OLD.initiative_id)
          AND tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id);
        
        -- Calculate progress based on available data
        IF total_weight > 0 THEN
            -- Use weight-based calculation
            calculated_progress = ROUND(completed_weight);
        ELSIF total_subtasks > 0 THEN
            -- Fallback to simple percentage
            calculated_progress = ROUND((completed_subtasks::DECIMAL / total_subtasks) * 100);
        ELSE
            calculated_progress = 0;
        END IF;
        
        -- Update the initiative progress
        UPDATE public.initiatives 
        SET 
            progress = calculated_progress,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = COALESCE(NEW.initiative_id, OLD.initiative_id);
        
        -- Log the automatic update
        INSERT INTO public.progress_history (
            initiative_id,
            previous_progress,
            new_progress,
            progress_notes,
            updated_by,
            tenant_id
        ) VALUES (
            COALESCE(NEW.initiative_id, OLD.initiative_id),
            (SELECT progress FROM public.initiatives WHERE id = COALESCE(NEW.initiative_id, OLD.initiative_id)),
            calculated_progress,
            'Automatic update from subtask completion',
            COALESCE(NEW.assigned_to, OLD.assigned_to),
            COALESCE(NEW.tenant_id, OLD.tenant_id)
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic progress updates
DROP TRIGGER IF EXISTS auto_update_initiative_progress ON public.activities;
CREATE TRIGGER auto_update_initiative_progress
    AFTER INSERT OR UPDATE OR DELETE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION update_initiative_progress_from_subtasks();

-- ===================================================================================
-- PHASE 5: CREATE PERFORMANCE INDEXES
-- ===================================================================================

-- Index for weight calculations and progress queries
CREATE INDEX IF NOT EXISTS idx_activities_weight_calculation 
ON public.activities (initiative_id, weight_percentage, status, tenant_id) 
WHERE weight_percentage > 0;

-- Index for completion tracking
CREATE INDEX IF NOT EXISTS idx_activities_completion_tracking 
ON public.activities (initiative_id, completion_date, status, tenant_id);

-- Index for priority and ordering
CREATE INDEX IF NOT EXISTS idx_activities_priority_order 
ON public.activities (initiative_id, priority, subtask_order, tenant_id);

-- Index for dependency tracking (GIN for JSONB)
CREATE INDEX IF NOT EXISTS idx_activities_dependencies 
ON public.activities USING GIN (dependencies);

-- ===================================================================================
-- PHASE 6: CREATE HELPER FUNCTIONS FOR WEIGHT MANAGEMENT
-- ===================================================================================

-- Function to redistribute weights equally among subtasks
CREATE OR REPLACE FUNCTION redistribute_subtask_weights(
    p_initiative_id UUID,
    p_tenant_id UUID
) RETURNS VOID AS $$
DECLARE
    subtask_count INTEGER;
    equal_weight DECIMAL(5,2);
BEGIN
    -- Count active subtasks for this initiative
    SELECT COUNT(*) INTO subtask_count
    FROM public.activities
    WHERE initiative_id = p_initiative_id 
      AND tenant_id = p_tenant_id;
    
    -- Calculate equal weight distribution
    IF subtask_count > 0 THEN
        equal_weight = ROUND(100.0 / subtask_count, 2);
        
        -- Update all subtasks with equal weight
        UPDATE public.activities
        SET weight_percentage = equal_weight,
            updated_at = CURRENT_TIMESTAMP
        WHERE initiative_id = p_initiative_id 
          AND tenant_id = p_tenant_id;
          
        RAISE NOTICE 'Redistributed weights equally: % subtasks at % each', subtask_count, equal_weight;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to validate and fix weight distributions
CREATE OR REPLACE FUNCTION validate_and_fix_weights(
    p_initiative_id UUID,
    p_tenant_id UUID,
    p_auto_fix BOOLEAN DEFAULT false
) RETURNS TABLE (
    total_weight DECIMAL(5,2),
    subtask_count INTEGER,
    issues TEXT[],
    fixed BOOLEAN
) AS $$
DECLARE
    weight_total DECIMAL(5,2);
    subtask_cnt INTEGER;
    issue_list TEXT[] := ARRAY[]::TEXT[];
    was_fixed BOOLEAN := false;
BEGIN
    -- Calculate current totals
    SELECT 
        COALESCE(SUM(weight_percentage), 0),
        COUNT(*)
    INTO weight_total, subtask_cnt
    FROM public.activities
    WHERE initiative_id = p_initiative_id 
      AND tenant_id = p_tenant_id;
    
    -- Check for issues
    IF weight_total != 100 AND subtask_cnt > 0 THEN
        issue_list := array_append(issue_list, 
            format('Total weight is %s%, should be 100%', weight_total));
    END IF;
    
    IF weight_total = 0 AND subtask_cnt > 0 THEN
        issue_list := array_append(issue_list, 'No weights assigned to subtasks');
    END IF;
    
    -- Auto-fix if requested and issues exist
    IF p_auto_fix AND array_length(issue_list, 1) > 0 AND subtask_cnt > 0 THEN
        PERFORM redistribute_subtask_weights(p_initiative_id, p_tenant_id);
        was_fixed := true;
        weight_total := 100.0;
    END IF;
    
    RETURN QUERY SELECT weight_total, subtask_cnt, issue_list, was_fixed;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================================
-- PHASE 7: DATA MIGRATION FOR EXISTING ACTIVITIES
-- ===================================================================================

-- Update existing activities with default weight distribution
DO $$
DECLARE
    initiative_record RECORD;
    subtask_count INTEGER;
    equal_weight DECIMAL(5,2);
BEGIN
    -- Process each initiative that has subtasks
    FOR initiative_record IN 
        SELECT DISTINCT initiative_id, tenant_id
        FROM public.activities
        WHERE weight_percentage IS NULL OR weight_percentage = 0
    LOOP
        -- Count subtasks for this initiative
        SELECT COUNT(*) INTO subtask_count
        FROM public.activities
        WHERE initiative_id = initiative_record.initiative_id 
          AND tenant_id = initiative_record.tenant_id;
        
        -- Calculate equal weight distribution
        IF subtask_count > 0 THEN
            equal_weight = ROUND(100.0 / subtask_count, 2);
            
            -- Update activities with equal weight
            UPDATE public.activities
            SET 
                weight_percentage = equal_weight,
                priority = CASE 
                    WHEN status = 'Completado' THEN 'medium'
                    WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE THEN 'high'
                    ELSE 'medium'
                END,
                subtask_order = ROW_NUMBER() OVER (
                    PARTITION BY initiative_id 
                    ORDER BY created_at
                ),
                updated_at = CURRENT_TIMESTAMP
            WHERE initiative_id = initiative_record.initiative_id 
              AND tenant_id = initiative_record.tenant_id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration completed: Updated weight distributions for existing activities';
END $$;

-- ===================================================================================
-- PHASE 8: CREATE VIEW FOR SUBTASK SUMMARY
-- ===================================================================================

-- Create view for subtask summaries with weight calculations
CREATE OR REPLACE VIEW public.initiative_subtask_summary AS
SELECT 
    i.id as initiative_id,
    i.tenant_id,
    i.title as initiative_title,
    i.progress_method,
    COUNT(a.id) as total_subtasks,
    COUNT(CASE WHEN a.status = 'Completado' THEN 1 END) as completed_subtasks,
    COALESCE(SUM(a.weight_percentage), 0) as total_weight_assigned,
    COALESCE(SUM(CASE WHEN a.status = 'Completado' THEN a.weight_percentage ELSE 0 END), 0) as completed_weight,
    COALESCE(SUM(a.estimated_hours), 0) as total_estimated_hours,
    COALESCE(SUM(a.actual_hours), 0) as total_actual_hours,
    CASE 
        WHEN COUNT(a.id) = 0 THEN 0
        WHEN SUM(a.weight_percentage) > 0 THEN 
            ROUND(SUM(CASE WHEN a.status = 'Completado' THEN a.weight_percentage ELSE 0 END))
        ELSE 
            ROUND((COUNT(CASE WHEN a.status = 'Completado' THEN 1 END)::DECIMAL / COUNT(a.id)) * 100)
    END as calculated_progress,
    CURRENT_TIMESTAMP as last_calculated
FROM public.initiatives i
LEFT JOIN public.activities a ON i.id = a.initiative_id AND i.tenant_id = a.tenant_id
WHERE true
GROUP BY i.id, i.tenant_id, i.title, i.progress_method;

-- Grant access to the view
GRANT SELECT ON public.initiative_subtask_summary TO authenticated;

-- ===================================================================================
-- MIGRATION VALIDATION AND ANALYSIS
-- ===================================================================================

-- Validate migration results
DO $$
DECLARE
    total_activities INTEGER;
    activities_with_weights INTEGER;
    initiatives_affected INTEGER;
    weight_validation_errors INTEGER;
BEGIN
    -- Count totals
    SELECT COUNT(*) INTO total_activities FROM public.activities;
    SELECT COUNT(*) INTO activities_with_weights 
    FROM public.activities WHERE weight_percentage > 0;
    SELECT COUNT(DISTINCT initiative_id) INTO initiatives_affected 
    FROM public.activities WHERE weight_percentage > 0;
    
    -- Check for weight validation errors
    SELECT COUNT(*) INTO weight_validation_errors
    FROM (
        SELECT initiative_id, tenant_id, SUM(weight_percentage) as total_weight
        FROM public.activities
        GROUP BY initiative_id, tenant_id
        HAVING SUM(weight_percentage) > 100
    ) weight_check;
    
    -- Report results
    RAISE NOTICE 'Activities Migration Summary:';
    RAISE NOTICE '- Total activities: %', total_activities;
    RAISE NOTICE '- Activities with weights: %', activities_with_weights;
    RAISE NOTICE '- Initiatives affected: %', initiatives_affected;
    RAISE NOTICE '- Weight validation errors: %', weight_validation_errors;
    
    IF weight_validation_errors > 0 THEN
        RAISE WARNING 'Found % initiatives with weight validation errors. Run validate_and_fix_weights() to resolve.', weight_validation_errors;
    ELSE
        RAISE NOTICE 'All weight distributions are valid!';
    END IF;
END $$;

-- Analyze table statistics
ANALYZE public.activities;

-- Display sample of updated activities
SELECT 
    'Sample Updated Activities' as info,
    COUNT(*) as total_count,
    ROUND(AVG(weight_percentage), 2) as avg_weight,
    COUNT(CASE WHEN completion_date IS NOT NULL THEN 1 END) as with_completion_date,
    COUNT(CASE WHEN priority != 'medium' THEN 1 END) as non_default_priority
FROM public.activities 
WHERE weight_percentage > 0;
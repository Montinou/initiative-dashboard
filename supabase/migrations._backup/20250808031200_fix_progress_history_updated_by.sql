-- Make updated_by nullable in progress_history to allow system-generated entries
ALTER TABLE public.progress_history ALTER COLUMN updated_by DROP NOT NULL;

-- Also update the auto-update trigger to handle this properly
CREATE OR REPLACE FUNCTION update_initiative_progress_from_activities()
RETURNS TRIGGER AS $$
DECLARE
    v_initiative_id uuid;
    v_total_activities integer;
    v_completed_activities integer;
    v_new_progress integer;
    v_old_progress integer;
BEGIN
    -- Get the initiative_id from the activity
    v_initiative_id := COALESCE(NEW.initiative_id, OLD.initiative_id);
    
    -- Count total and completed activities for this initiative
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_completed = true)
    INTO 
        v_total_activities,
        v_completed_activities
    FROM activities
    WHERE initiative_id = v_initiative_id;
    
    -- Calculate new progress percentage
    IF v_total_activities > 0 THEN
        v_new_progress := ROUND((v_completed_activities::numeric / v_total_activities::numeric) * 100);
    ELSE
        v_new_progress := 0;
    END IF;
    
    -- Get current progress
    SELECT progress INTO v_old_progress
    FROM initiatives
    WHERE id = v_initiative_id;
    
    -- Only update if progress changed
    IF v_old_progress IS DISTINCT FROM v_new_progress THEN
        -- Update initiative progress
        UPDATE initiatives
        SET progress = v_new_progress
        WHERE id = v_initiative_id;
        
        -- Log progress change (updated_by can be NULL for system updates)
        INSERT INTO progress_history (
            initiative_id,
            progress_value,
            previous_value,
            change_notes,
            updated_by
        ) VALUES (
            v_initiative_id,
            v_new_progress,
            v_old_progress,
            'Auto-updated from activity change',
            NULL  -- NULL for system-generated updates
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
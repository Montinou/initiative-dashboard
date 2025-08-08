-- First, delete any records with NULL updated_by
DELETE FROM public.progress_history WHERE updated_by IS NULL;

-- Revert updated_by back to NOT NULL in progress_history
ALTER TABLE public.progress_history ALTER COLUMN updated_by SET NOT NULL;

-- Revert the trigger function to its original state
CREATE OR REPLACE FUNCTION update_initiative_progress_from_activities()
RETURNS TRIGGER AS $$
DECLARE
    v_initiative_id uuid;
    v_total_activities integer;
    v_completed_activities integer;
    v_new_progress integer;
    v_old_progress integer;
    v_user_id uuid;
BEGIN
    -- Get the initiative_id from the activity
    v_initiative_id := COALESCE(NEW.initiative_id, OLD.initiative_id);
    
    -- Try to get the current user from auth context
    v_user_id := auth.uid();
    
    -- If no auth user, skip the update (this shouldn't happen in production)
    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;
    
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
        
        -- Log progress change with the actual user
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
            v_user_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
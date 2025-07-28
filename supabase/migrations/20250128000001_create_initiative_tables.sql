-- Create company_areas table
CREATE TABLE IF NOT EXISTS company_areas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create initiatives table
CREATE TABLE IF NOT EXISTS initiatives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    area_id UUID REFERENCES company_areas(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_initiatives_area_id ON initiatives(area_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_initiative_id ON subtasks(initiative_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_created_at ON initiatives(created_at);
CREATE INDEX IF NOT EXISTS idx_subtasks_completed ON subtasks(completed);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_company_areas_updated_at BEFORE UPDATE ON company_areas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_initiatives_updated_at BEFORE UPDATE ON initiatives FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON subtasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to automatically update initiative progress when subtasks change
CREATE OR REPLACE FUNCTION update_initiative_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_subtasks INTEGER;
    completed_subtasks INTEGER;
    new_progress INTEGER;
    target_initiative_id UUID;
BEGIN
    -- Determine which initiative to update
    IF TG_OP = 'DELETE' THEN
        target_initiative_id := OLD.initiative_id;
    ELSE
        target_initiative_id := NEW.initiative_id;
    END IF;

    -- Count total and completed subtasks for the initiative
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE completed = TRUE)
    INTO total_subtasks, completed_subtasks
    FROM subtasks 
    WHERE initiative_id = target_initiative_id;

    -- Calculate new progress percentage
    IF total_subtasks = 0 THEN
        new_progress := 0;
    ELSE
        new_progress := ROUND((completed_subtasks::DECIMAL / total_subtasks::DECIMAL) * 100);
    END IF;

    -- Update the initiative progress
    UPDATE initiatives 
    SET progress = new_progress
    WHERE id = target_initiative_id;

    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ language 'plpgsql';

-- Create trigger to update initiative progress when subtasks change
CREATE TRIGGER update_initiative_progress_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON subtasks
    FOR EACH ROW 
    EXECUTE PROCEDURE update_initiative_progress();
-- Enable RLS on all tables
ALTER TABLE company_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- Company Areas Policies
-- Allow authenticated users to read all company areas
CREATE POLICY "Allow authenticated users to read company areas" 
ON company_areas FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to insert company areas
CREATE POLICY "Allow authenticated users to insert company areas" 
ON company_areas FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to update company areas
CREATE POLICY "Allow authenticated users to update company areas" 
ON company_areas FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Allow authenticated users to delete company areas
CREATE POLICY "Allow authenticated users to delete company areas" 
ON company_areas FOR DELETE 
TO authenticated 
USING (true);

-- Initiatives Policies
-- Allow authenticated users to read all initiatives
CREATE POLICY "Allow authenticated users to read initiatives" 
ON initiatives FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to insert initiatives
CREATE POLICY "Allow authenticated users to insert initiatives" 
ON initiatives FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to update initiatives
CREATE POLICY "Allow authenticated users to update initiatives" 
ON initiatives FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Allow authenticated users to delete initiatives
CREATE POLICY "Allow authenticated users to delete initiatives" 
ON initiatives FOR DELETE 
TO authenticated 
USING (true);

-- Subtasks Policies
-- Allow authenticated users to read all subtasks
CREATE POLICY "Allow authenticated users to read subtasks" 
ON subtasks FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to insert subtasks
CREATE POLICY "Allow authenticated users to insert subtasks" 
ON subtasks FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to update subtasks
CREATE POLICY "Allow authenticated users to update subtasks" 
ON subtasks FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Allow authenticated users to delete subtasks
CREATE POLICY "Allow authenticated users to delete subtasks" 
ON subtasks FOR DELETE 
TO authenticated 
USING (true);
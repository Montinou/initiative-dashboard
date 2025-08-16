-- Add missing fields to organizations table for complete company profile
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS mission text,
ADD COLUMN IF NOT EXISTS vision text,
ADD COLUMN IF NOT EXISTS values jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS social_media jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS founded_year integer,
ADD COLUMN IF NOT EXISTS employee_count_range text,
ADD COLUMN IF NOT EXISTS fiscal_year_start integer CHECK (fiscal_year_start >= 1 AND fiscal_year_start <= 12),
ADD COLUMN IF NOT EXISTS fiscal_year_end integer CHECK (fiscal_year_end >= 1 AND fiscal_year_end <= 12),
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state_province text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS registration_number text,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS twitter_url text,
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS instagram_url text;

-- Add comments for documentation
COMMENT ON COLUMN public.organizations.phone IS 'Main company phone number';
COMMENT ON COLUMN public.organizations.email IS 'Main company contact email';
COMMENT ON COLUMN public.organizations.address IS 'Company headquarters address';
COMMENT ON COLUMN public.organizations.cover_image_url IS 'URL for company cover/banner image';
COMMENT ON COLUMN public.organizations.mission IS 'Company mission statement';
COMMENT ON COLUMN public.organizations.vision IS 'Company vision statement';
COMMENT ON COLUMN public.organizations.values IS 'Array of company values as JSON';
COMMENT ON COLUMN public.organizations.social_media IS 'JSON object with social media links';
COMMENT ON COLUMN public.organizations.founded_year IS 'Year the company was founded';
COMMENT ON COLUMN public.organizations.employee_count_range IS 'Employee count range (e.g., 1-10, 11-50, 51-200)';
COMMENT ON COLUMN public.organizations.fiscal_year_start IS 'Month number when fiscal year starts (1-12)';
COMMENT ON COLUMN public.organizations.fiscal_year_end IS 'Month number when fiscal year ends (1-12)';
COMMENT ON COLUMN public.organizations.country IS 'Country where company is headquartered';
COMMENT ON COLUMN public.organizations.city IS 'City where company is headquartered';
COMMENT ON COLUMN public.organizations.state_province IS 'State or province where company is headquartered';
COMMENT ON COLUMN public.organizations.postal_code IS 'Postal/ZIP code of company headquarters';
COMMENT ON COLUMN public.organizations.tax_id IS 'Company tax identification number';
COMMENT ON COLUMN public.organizations.registration_number IS 'Company registration number';
COMMENT ON COLUMN public.organizations.linkedin_url IS 'Company LinkedIn profile URL';
COMMENT ON COLUMN public.organizations.twitter_url IS 'Company Twitter/X profile URL';
COMMENT ON COLUMN public.organizations.facebook_url IS 'Company Facebook page URL';
COMMENT ON COLUMN public.organizations.instagram_url IS 'Company Instagram profile URL';

-- Create an index for better performance on country/city queries
CREATE INDEX IF NOT EXISTS idx_organizations_location ON public.organizations(country, city);

-- Create an index for social media lookups
CREATE INDEX IF NOT EXISTS idx_organizations_social ON public.organizations USING gin(social_media);
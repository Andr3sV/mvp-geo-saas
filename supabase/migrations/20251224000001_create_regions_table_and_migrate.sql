-- =============================================
-- MIGRATION: Create Regions Table and Migrate prompt_tracking.region
-- Description: Create regions table and migrate prompt_tracking.region from TEXT to UUID foreign key
-- Date: 2025-12-24
-- =============================================

-- =============================================
-- STEP 1: Create regions table
-- =============================================

CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, code)
);

-- Enable RLS
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_regions_project_id ON public.regions(project_id);
CREATE INDEX IF NOT EXISTS idx_regions_code ON public.regions(code);

-- =============================================
-- STEP 2: Helper function to get country name from code
-- =============================================

CREATE OR REPLACE FUNCTION get_country_name_from_code(country_code TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE country_code
        WHEN 'US' THEN 'United States'
        WHEN 'GB' THEN 'United Kingdom'
        WHEN 'CA' THEN 'Canada'
        WHEN 'AU' THEN 'Australia'
        WHEN 'DE' THEN 'Germany'
        WHEN 'FR' THEN 'France'
        WHEN 'ES' THEN 'Spain'
        WHEN 'IT' THEN 'Italy'
        WHEN 'NL' THEN 'Netherlands'
        WHEN 'SE' THEN 'Sweden'
        WHEN 'NO' THEN 'Norway'
        WHEN 'DK' THEN 'Denmark'
        WHEN 'FI' THEN 'Finland'
        WHEN 'PL' THEN 'Poland'
        WHEN 'BE' THEN 'Belgium'
        WHEN 'AT' THEN 'Austria'
        WHEN 'CH' THEN 'Switzerland'
        WHEN 'IE' THEN 'Ireland'
        WHEN 'PT' THEN 'Portugal'
        WHEN 'MX' THEN 'Mexico'
        WHEN 'BR' THEN 'Brazil'
        WHEN 'AR' THEN 'Argentina'
        WHEN 'CL' THEN 'Chile'
        WHEN 'CO' THEN 'Colombia'
        WHEN 'PE' THEN 'Peru'
        WHEN 'VE' THEN 'Venezuela'
        WHEN 'EC' THEN 'Ecuador'
        WHEN 'UY' THEN 'Uruguay'
        WHEN 'CR' THEN 'Costa Rica'
        WHEN 'PA' THEN 'Panama'
        WHEN 'JP' THEN 'Japan'
        WHEN 'CN' THEN 'China'
        WHEN 'IN' THEN 'India'
        WHEN 'KR' THEN 'South Korea'
        WHEN 'SG' THEN 'Singapore'
        WHEN 'HK' THEN 'Hong Kong'
        WHEN 'TW' THEN 'Taiwan'
        WHEN 'TH' THEN 'Thailand'
        WHEN 'MY' THEN 'Malaysia'
        WHEN 'ID' THEN 'Indonesia'
        WHEN 'PH' THEN 'Philippines'
        WHEN 'VN' THEN 'Vietnam'
        WHEN 'NZ' THEN 'New Zealand'
        WHEN 'ZA' THEN 'South Africa'
        WHEN 'AE' THEN 'United Arab Emirates'
        WHEN 'SA' THEN 'Saudi Arabia'
        WHEN 'IL' THEN 'Israel'
        WHEN 'TR' THEN 'Turkey'
        WHEN 'RU' THEN 'Russia'
        WHEN 'UA' THEN 'Ukraine'
        WHEN 'GR' THEN 'Greece'
        WHEN 'CZ' THEN 'Czech Republic'
        WHEN 'RO' THEN 'Romania'
        WHEN 'HU' THEN 'Hungary'
        WHEN 'BG' THEN 'Bulgaria'
        WHEN 'HR' THEN 'Croatia'
        WHEN 'RS' THEN 'Serbia'
        WHEN 'SK' THEN 'Slovakia'
        WHEN 'SI' THEN 'Slovenia'
        WHEN 'LT' THEN 'Lithuania'
        WHEN 'LV' THEN 'Latvia'
        WHEN 'EE' THEN 'Estonia'
        WHEN 'IS' THEN 'Iceland'
        WHEN 'LU' THEN 'Luxembourg'
        WHEN 'MT' THEN 'Malta'
        WHEN 'CY' THEN 'Cyprus'
        WHEN 'EG' THEN 'Egypt'
        WHEN 'NG' THEN 'Nigeria'
        WHEN 'KE' THEN 'Kenya'
        WHEN 'MA' THEN 'Morocco'
        WHEN 'DZ' THEN 'Algeria'
        WHEN 'TN' THEN 'Tunisia'
        WHEN 'GH' THEN 'Ghana'
        WHEN 'SN' THEN 'Senegal'
        WHEN 'BO' THEN 'Bolivia'
        WHEN 'PY' THEN 'Paraguay'
        WHEN 'GT' THEN 'Guatemala'
        WHEN 'HN' THEN 'Honduras'
        WHEN 'SV' THEN 'El Salvador'
        WHEN 'NI' THEN 'Nicaragua'
        WHEN 'DO' THEN 'Dominican Republic'
        WHEN 'CU' THEN 'Cuba'
        WHEN 'PR' THEN 'Puerto Rico'
        WHEN 'PK' THEN 'Pakistan'
        WHEN 'BD' THEN 'Bangladesh'
        WHEN 'LK' THEN 'Sri Lanka'
        WHEN 'NP' THEN 'Nepal'
        WHEN 'MM' THEN 'Myanmar'
        WHEN 'KH' THEN 'Cambodia'
        WHEN 'LA' THEN 'Laos'
        WHEN 'MN' THEN 'Mongolia'
        WHEN 'KZ' THEN 'Kazakhstan'
        WHEN 'UZ' THEN 'Uzbekistan'
        ELSE country_code || ' (Unknown)'
    END;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 3: Create regions from existing prompt_tracking data
-- =============================================

-- First, ensure US exists for all projects (even those without prompts)
INSERT INTO public.regions (project_id, code, name, is_active)
SELECT DISTINCT id, 'US', 'United States', true
FROM public.projects
WHERE id NOT IN (SELECT project_id FROM public.regions WHERE code = 'US')
ON CONFLICT (project_id, code) DO NOTHING;

-- Extract unique regions from prompt_tracking, convert GLOBAL to US
WITH unique_regions AS (
    SELECT DISTINCT 
        project_id,
        CASE 
            WHEN region = 'GLOBAL' OR region IS NULL THEN 'US'
            ELSE UPPER(TRIM(region))
        END AS region_code
    FROM public.prompt_tracking
    WHERE region IS NOT NULL
)
INSERT INTO public.regions (project_id, code, name, is_active)
SELECT 
    ur.project_id,
    ur.region_code,
    get_country_name_from_code(ur.region_code),
    true
FROM unique_regions ur
WHERE ur.region_code IS NOT NULL
  AND ur.region_code != ''
  AND NOT EXISTS (
      SELECT 1 FROM public.regions r 
      WHERE r.project_id = ur.project_id 
      AND r.code = ur.region_code
  );

-- =============================================
-- STEP 4: Add region_id column to prompt_tracking
-- =============================================

ALTER TABLE public.prompt_tracking 
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL;

-- =============================================
-- STEP 5: Populate region_id from existing region values
-- =============================================

-- Update prompt_tracking with region_id, converting GLOBAL to US
UPDATE public.prompt_tracking pt
SET region_id = r.id
FROM public.regions r
WHERE pt.project_id = r.project_id
  AND r.code = CASE 
      WHEN pt.region = 'GLOBAL' OR pt.region IS NULL THEN 'US'
      ELSE UPPER(TRIM(pt.region))
  END
  AND pt.region_id IS NULL;

-- For any remaining NULL region_id, assign US region for that project
UPDATE public.prompt_tracking pt
SET region_id = (
    SELECT id FROM public.regions r 
    WHERE r.project_id = pt.project_id 
    AND r.code = 'US' 
    LIMIT 1
)
WHERE pt.region_id IS NULL;

-- =============================================
-- STEP 6: Make region_id NOT NULL
-- =============================================

-- First ensure all prompts have a region_id (should already be done, but double-check)
UPDATE public.prompt_tracking pt
SET region_id = (
    SELECT id FROM public.regions r 
    WHERE r.project_id = pt.project_id 
    AND r.code = 'US' 
    LIMIT 1
)
WHERE pt.region_id IS NULL;

-- Now add NOT NULL constraint
ALTER TABLE public.prompt_tracking 
ALTER COLUMN region_id SET NOT NULL;

-- =============================================
-- STEP 7: Drop old region column and related objects
-- =============================================

-- Drop index on old region column
DROP INDEX IF EXISTS idx_prompt_tracking_region;

-- Drop constraint on old region column
ALTER TABLE public.prompt_tracking 
DROP CONSTRAINT IF EXISTS check_prompt_region_format;

-- Drop old region column
ALTER TABLE public.prompt_tracking 
DROP COLUMN IF EXISTS region;

-- =============================================
-- STEP 8: Create new index on region_id
-- =============================================

CREATE INDEX IF NOT EXISTS idx_prompt_tracking_region_id ON public.prompt_tracking(region_id);

-- =============================================
-- STEP 9: RLS Policies for regions
-- =============================================

CREATE POLICY "Users can read accessible regions"
    ON public.regions
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = regions.project_id
            )
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = regions.project_id
        )
    );

CREATE POLICY "Users can manage regions"
    ON public.regions
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = regions.project_id
            )
            AND role IN ('owner', 'admin', 'member')
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = regions.project_id
            AND role IN ('admin', 'member')
        )
    );

-- =============================================
-- STEP 10: Add trigger for updated_at
-- =============================================

CREATE TRIGGER update_regions_updated_at
    BEFORE UPDATE ON public.regions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.regions IS 'Project-specific regions (countries) for tracking. US is the default region. GLOBAL is a virtual option (not stored) that aggregates all regions.';
COMMENT ON COLUMN public.regions.code IS 'ISO 3166-1 alpha-2 country code (e.g., US, ES, GB)';
COMMENT ON COLUMN public.regions.name IS 'Full country name (e.g., United States, Spain, United Kingdom)';
COMMENT ON COLUMN public.prompt_tracking.region_id IS 'Foreign key to regions table. Replaces the old TEXT region column.';


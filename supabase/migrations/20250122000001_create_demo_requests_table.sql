-- =============================================
-- Demo Requests Table
-- Stores demo request submissions from landing page
-- =============================================

CREATE TABLE IF NOT EXISTS public.demo_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    brand_website TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company_size TEXT NOT NULL CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for quick lookups
CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON public.demo_requests(email);
CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON public.demo_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow anyone to insert (for public demo requests)
CREATE POLICY "Allow public insert on demo_requests"
    ON public.demo_requests
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- RLS Policy: Only authenticated users can read (for admin dashboard)
CREATE POLICY "Allow authenticated read on demo_requests"
    ON public.demo_requests
    FOR SELECT
    TO authenticated
    USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_demo_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_demo_requests_updated_at
    BEFORE UPDATE ON public.demo_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_demo_requests_updated_at();


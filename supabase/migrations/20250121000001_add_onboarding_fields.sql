-- Add onboarding fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS user_type TEXT CHECK (user_type IN ('agency', 'company')),
ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.users.user_type IS 'Type of user: agency or company';
COMMENT ON COLUMN public.users.referral_source IS 'How the user heard about us: social, friends, google, press, other';


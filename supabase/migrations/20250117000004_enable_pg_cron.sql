-- =============================================
-- MIGRATION: Enable pg_cron for scheduled jobs
-- Description: Enable pg_cron extension for daily sentiment analysis
-- Date: 2025-01-17
-- =============================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage on cron schema to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create the daily sentiment analysis cron job
SELECT cron.schedule(
  'daily-sentiment-analysis',           -- job name
  '0 2 * * *',                          -- at 2 AM every day (UTC)
  $$
  SELECT
    net.http_post(
      url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/daily-sentiment-analysis',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Add comment
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for daily sentiment analysis';

-- Verify the job was created
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job 
WHERE jobname = 'daily-sentiment-analysis';

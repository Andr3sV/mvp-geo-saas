#!/usr/bin/env node

/**
 * Script to run analysis for all prompts in a project
 * Usage: node scripts/run-analysis-for-project.js <project_id>
 * 
 * Example: node scripts/run-analysis-for-project.js a915d1f3-8a07-4b5b-a767-17bd2a28d684
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load .env.local if it exists
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const projectId = process.argv[2];

if (!projectId) {
  console.error('Error: Project ID is required');
  console.error('Usage: node scripts/run-analysis-for-project.js <project_id>');
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const allPlatforms = ['openai', 'gemini', 'claude', 'perplexity'];

async function runAnalysisForProject() {
  console.log(`\n🔍 Fetching prompts for project: ${projectId}\n`);

  // Get all active prompts for the project
  const { data: prompts, error: fetchError } = await supabase
    .from('prompt_tracking')
    .select('id, prompt, project_id')
    .eq('project_id', projectId)
    .eq('is_active', true);

  if (fetchError) {
    console.error('❌ Error fetching prompts:', fetchError.message);
    process.exit(1);
  }

  if (!prompts || prompts.length === 0) {
    console.log('⚠️  No active prompts found for this project');
    process.exit(0);
  }

  console.log(`📋 Found ${prompts.length} active prompts\n`);
  console.log('🚀 Starting analysis for all prompts...\n');

  let successCount = 0;
  let errorCount = 0;

  // Process prompts in batches to avoid overwhelming the system
  const batchSize = 5;
  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);
    
    console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} prompts)...`);

    const promises = batch.map(async (prompt, index) => {
      try {
        console.log(`  [${i + index + 1}/${prompts.length}] Starting analysis for: "${prompt.prompt.substring(0, 50)}..."`);

        const { data, error } = await supabase.functions.invoke('analyze-prompt', {
          body: {
            prompt_tracking_id: prompt.id,
            project_id: prompt.project_id,
            prompt_text: prompt.prompt,
            platforms: allPlatforms,
          },
        });

        if (error) {
          console.error(`  ❌ Error for prompt ${prompt.id}:`, error.message);
          errorCount++;
          return { success: false, promptId: prompt.id };
        }

        if (data && data.error) {
          console.error(`  ❌ Error in response for prompt ${prompt.id}:`, data.error);
          errorCount++;
          return { success: false, promptId: prompt.id };
        }

        console.log(`  ✅ Analysis started successfully for prompt ${prompt.id}`);
        successCount++;
        return { success: true, promptId: prompt.id };
      } catch (error) {
        console.error(`  ❌ Exception for prompt ${prompt.id}:`, error.message);
        errorCount++;
        return { success: false, promptId: prompt.id };
      }
    });

    // Wait for batch to complete before starting next batch
    await Promise.all(promises);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < prompts.length) {
      console.log('  ⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${errorCount}`);
  console.log(`  📝 Total: ${prompts.length}`);
  console.log('='.repeat(60) + '\n');

  if (errorCount > 0) {
    console.log('⚠️  Some analyses failed. Check the logs above for details.');
    process.exit(1);
  } else {
    console.log('🎉 All analyses started successfully!');
    console.log('💡 Note: Analyses run in the background and may take 30-60 seconds to complete.');
    console.log('   Check the Supabase Edge Function logs to monitor progress.\n');
  }
}

runAnalysisForProject().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🤖 Starting daily sentiment analysis at', new Date().toISOString());

    // Get all active projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, brand_name');

    if (projectsError) {
      throw new Error(`Failed to fetch projects: ${projectsError.message}`);
    }

    if (!projects || projects.length === 0) {
      console.log('No projects found to analyze');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No projects to analyze',
          projects_processed: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${projects.length} projects to process`);

    const results = [];
    let totalProcessed = 0;
    let totalFailed = 0;

    // Process each project
    for (const project of projects) {
      try {
        console.log(`\n📊 Processing project: ${project.name} (${project.id})`);

        // Check if project has unanalyzed responses
        const { data: aiResponses } = await supabase
          .from('ai_responses')
          .select('id')
          .eq('project_id', project.id)
          .eq('status', 'success')
          .limit(1);

        if (!aiResponses || aiResponses.length === 0) {
          console.log(`  ⏭️  No AI responses found for project ${project.name}`);
          results.push({
            project_id: project.id,
            project_name: project.name,
            status: 'skipped',
            reason: 'no_responses'
          });
          continue;
        }

        // Get already analyzed response IDs
        const { data: analyzedResponses } = await supabase
          .from('sentiment_analysis')
          .select('ai_response_id')
          .eq('project_id', project.id);

        const analyzedIds = new Set(
          (analyzedResponses || []).map((r: any) => r.ai_response_id)
        );

        // Count unanalyzed responses
        const { data: allResponses } = await supabase
          .from('ai_responses')
          .select('id')
          .eq('project_id', project.id)
          .eq('status', 'success');

        const unanalyzedCount = (allResponses || []).filter(
          (r: any) => !analyzedIds.has(r.id)
        ).length;

        if (unanalyzedCount === 0) {
          console.log(`  ✅ All responses already analyzed for project ${project.name}`);
          results.push({
            project_id: project.id,
            project_name: project.name,
            status: 'skipped',
            reason: 'all_analyzed'
          });
          continue;
        }

        console.log(`  🔄 Found ${unanalyzedCount} unanalyzed responses`);

        // Trigger sentiment analysis for this project
        const { data: analysisResult, error: analysisError } = await supabase.functions.invoke(
          'analyze-sentiment',
          {
            body: {
              project_id: project.id,
              force_reanalysis: false // Only analyze new responses
            }
          }
        );

        if (analysisError) {
          console.error(`  ❌ Failed to analyze project ${project.name}:`, analysisError);
          totalFailed++;
          results.push({
            project_id: project.id,
            project_name: project.name,
            status: 'failed',
            error: analysisError.message
          });
          continue;
        }

        console.log(`  ✅ Successfully analyzed project ${project.name}`);
        console.log(`     Processed: ${analysisResult?.processed_count || 0} responses`);
        
        totalProcessed++;
        results.push({
          project_id: project.id,
          project_name: project.name,
          status: 'success',
          processed_count: analysisResult?.processed_count || 0,
          unanalyzed_count: unanalyzedCount
        });

      } catch (projectError: any) {
        console.error(`  ❌ Error processing project ${project.name}:`, projectError);
        totalFailed++;
        results.push({
          project_id: project.id,
          project_name: project.name,
          status: 'error',
          error: projectError.message
        });
      }
    }

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      total_projects: projects.length,
      projects_processed: totalProcessed,
      projects_failed: totalFailed,
      projects_skipped: projects.length - totalProcessed - totalFailed,
      results
    };

    console.log('\n📈 Daily sentiment analysis completed:');
    console.log(`   Total projects: ${summary.total_projects}`);
    console.log(`   Processed: ${summary.projects_processed}`);
    console.log(`   Failed: ${summary.projects_failed}`);
    console.log(`   Skipped: ${summary.projects_skipped}`);

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Daily sentiment analysis error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

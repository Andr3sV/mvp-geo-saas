// =============================================
// BRAND ANALYSIS STORAGE
// =============================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BrandAnalysisResult,
  BrandMentionData,
  BrandSentimentAttributesData,
  PotentialCompetitorData,
} from './types';
import { logInfo, logError } from './utils';

/**
 * Save brand mentions to the brand_mentions table
 */
export async function saveBrandMentions(
  supabase: SupabaseClient,
  aiResponseId: string,
  projectId: string,
  responseText: string,
  brandName: string,
  analysis: BrandAnalysisResult,
  competitorMap: Map<string, string> // Map competitor name -> competitor_id
): Promise<number> {
  try {
    const mentions: BrandMentionData[] = [];

    // Add client brand mention if mentioned
    if (analysis.client_brand_mentioned) {
      // We'll use a simple approach: mark the entire response as context
      mentions.push({
        brand_type: 'client',
        entity_name: brandName, // Use actual brand name
        mentioned_text: responseText.substring(0, 500), // First 500 chars as context
        confidence_score: 1.0,
        metadata: {},
      });
    }

    // Add competitor mentions
    for (const competitorName of analysis.mentioned_competitors) {
      const competitorId = competitorMap.get(competitorName);
      if (competitorId) {
        mentions.push({
          brand_type: 'competitor',
          competitor_id: competitorId,
          entity_name: competitorName,
          mentioned_text: responseText.substring(0, 500), // First 500 chars as context
          confidence_score: 1.0,
          metadata: {},
        });
      }
    }

    if (mentions.length === 0) {
      logInfo('brand-storage', 'No brand mentions to save');
      return 0;
    }

    // Prepare records for insertion
    const records = mentions.map((mention) => ({
      ai_response_id: aiResponseId,
      project_id: projectId,
      brand_type: mention.brand_type,
      competitor_id: mention.competitor_id || null,
      entity_name: mention.entity_name,
      mentioned_text: mention.mentioned_text,
      start_index: mention.start_index ?? null,
      end_index: mention.end_index ?? null,
      confidence_score: mention.confidence_score,
      metadata: mention.metadata || {},
    }));

    const { data, error } = await supabase
      .from('brand_mentions')
      .insert(records)
      .select('id');

    if (error) {
      logError('brand-storage', 'Failed to save brand mentions', error);
      throw error;
    }

    logInfo('brand-storage', `Saved ${data?.length || 0} brand mentions`, {
      aiResponseId,
      mentionsCount: mentions.length,
    });

    return data?.length || 0;
  } catch (error: any) {
    logError('brand-storage', 'Error saving brand mentions', error);
    return 0;
  }
}

/**
 * Save brand sentiment and attributes to the brand_sentiment_attributes table
 */
export async function saveSentimentAttributes(
  supabase: SupabaseClient,
  aiResponseId: string,
  projectId: string,
  responseText: string,
  brandName: string,
  analysis: BrandAnalysisResult,
  competitorMap: Map<string, string> // Map competitor name -> competitor_id
): Promise<number> {
  try {
    const attributes: BrandSentimentAttributesData[] = [];

    // Add client brand sentiment/attributes if mentioned
    if (analysis.client_brand_mentioned) {
      attributes.push({
        brand_type: 'client',
        entity_name: brandName,
        sentiment: analysis.client_brand_sentiment,
        sentiment_rating: analysis.client_brand_sentiment_rating,
        sentiment_ratio: analysis.client_brand_sentiment_ratio,
        positive_attributes: analysis.client_brand_attributes.positive,
        negative_attributes: analysis.client_brand_attributes.negative,
        analyzed_text: responseText,
        metadata: {},
      });
    }

    // Add competitor sentiments/attributes
    for (const competitorSentiment of analysis.competitor_sentiments) {
      const competitorId = competitorMap.get(competitorSentiment.competitor);
      if (competitorId) {
        // Find attributes for this competitor
        const competitorAttr = analysis.competitor_attributes.find(
          (ca) => ca.competitor === competitorSentiment.competitor
        );

        attributes.push({
          brand_type: 'competitor',
          competitor_id: competitorId,
          entity_name: competitorSentiment.competitor,
          sentiment: competitorSentiment.sentiment,
          sentiment_rating: competitorSentiment.sentiment_rating,
          sentiment_ratio: competitorSentiment.sentiment_ratio,
          positive_attributes: competitorAttr?.positive || [],
          negative_attributes: competitorAttr?.negative || [],
          analyzed_text: responseText,
          metadata: {},
        });
      }
    }

    if (attributes.length === 0) {
      logInfo('brand-storage', 'No sentiment attributes to save');
      return 0;
    }

    // Prepare records for insertion
    const records = attributes.map((attr) => ({
      ai_response_id: aiResponseId,
      project_id: projectId,
      brand_type: attr.brand_type,
      competitor_id: attr.competitor_id || null,
      entity_name: attr.entity_name,
      sentiment: attr.sentiment,
      sentiment_rating: attr.sentiment_rating,
      sentiment_ratio: attr.sentiment_ratio,
      positive_attributes: attr.positive_attributes,
      negative_attributes: attr.negative_attributes,
      analyzed_text: attr.analyzed_text,
      metadata: attr.metadata || {},
    }));

    const { data, error } = await supabase
      .from('brand_sentiment_attributes')
      .insert(records)
      .select('id');

    if (error) {
      logError('brand-storage', 'Failed to save sentiment attributes', error);
      throw error;
    }

    logInfo('brand-storage', `Saved ${data?.length || 0} sentiment attributes`, {
      aiResponseId,
      attributesCount: attributes.length,
    });

    return data?.length || 0;
  } catch (error: any) {
    logError('brand-storage', 'Error saving sentiment attributes', error);
    return 0;
  }
}

/**
 * Save or update potential competitors in the potential_competitors table
 */
export async function savePotentialCompetitors(
  supabase: SupabaseClient,
  projectId: string,
  aiResponseId: string,
  responseText: string,
  otherBrands: string[]
): Promise<number> {
  try {
    if (!otherBrands || otherBrands.length === 0) {
      logInfo('brand-storage', 'No potential competitors to save');
      return 0;
    }

    let savedCount = 0;

    for (const brandName of otherBrands) {
      if (!brandName || brandName.trim().length === 0) {
        continue;
      }

      const trimmedBrandName = brandName.trim();

      // Check if this potential competitor already exists
      const { data: existing, error: selectError } = await supabase
        .from('potential_competitors')
        .select('id, mention_count')
        .eq('project_id', projectId)
        .eq('brand_name', trimmedBrandName)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        logError('brand-storage', 'Error checking existing potential competitor', selectError);
        continue;
      }

      if (existing) {
        // Update existing: increment mention count and update last_detected_at
        const { error: updateError } = await supabase
          .from('potential_competitors')
          .update({
            mention_count: (existing.mention_count || 1) + 1,
            last_detected_at: new Date().toISOString(),
            context: responseText.substring(0, 500), // Update context with latest mention
          })
          .eq('id', existing.id);

        if (updateError) {
          logError('brand-storage', 'Error updating potential competitor', updateError);
          continue;
        }

        savedCount++;
        logInfo('brand-storage', 'Updated potential competitor', {
          brandName: trimmedBrandName,
          mentionCount: (existing.mention_count || 1) + 1,
        });
      } else {
        // Insert new potential competitor
        const { error: insertError } = await supabase
          .from('potential_competitors')
          .insert({
            project_id: projectId,
            ai_response_id: aiResponseId,
            brand_name: trimmedBrandName,
            context: responseText.substring(0, 500),
            mention_count: 1,
            first_detected_at: new Date().toISOString(),
            last_detected_at: new Date().toISOString(),
            metadata: {},
          });

        if (insertError) {
          logError('brand-storage', 'Error inserting potential competitor', insertError);
          continue;
        }

        savedCount++;
        logInfo('brand-storage', 'Inserted new potential competitor', {
          brandName: trimmedBrandName,
        });
      }
    }

    logInfo('brand-storage', `Saved/updated ${savedCount} potential competitors`, {
      projectId,
      totalBrands: otherBrands.length,
    });

    return savedCount;
  } catch (error: any) {
    logError('brand-storage', 'Error saving potential competitors', error);
    return 0;
  }
}

/**
 * Get competitor map (name -> id) for a project
 */
export async function getCompetitorMap(
  supabase: SupabaseClient,
  projectId: string
): Promise<Map<string, string>> {
  const competitorMap = new Map<string, string>();

  try {
    const { data: competitors, error } = await supabase
      .from('competitors')
      .select('id, name')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (error) {
      logError('brand-storage', 'Failed to fetch competitors', error);
      return competitorMap;
    }

    if (competitors) {
      for (const competitor of competitors) {
        competitorMap.set(competitor.name.toLowerCase(), competitor.id);
        competitorMap.set(competitor.name, competitor.id); // Also add exact match
      }
    }

    logInfo('brand-storage', `Loaded ${competitorMap.size / 2} competitors for project`, {
      projectId,
    });
  } catch (error: any) {
    logError('brand-storage', 'Error building competitor map', error);
  }

  return competitorMap;
}

/**
 * Save all brand analysis results to database
 */
export async function saveBrandAnalysis(
  supabase: SupabaseClient,
  aiResponseId: string,
  projectId: string,
  brandName: string,
  responseText: string,
  analysis: BrandAnalysisResult
): Promise<{
  mentionsSaved: number;
  sentimentSaved: number;
  potentialCompetitorsSaved: number;
}> {
  try {
    // Get competitor map
    const competitorMap = await getCompetitorMap(supabase, projectId);

    // Normalize competitor names in analysis to match database (case-insensitive)
    const normalizedMentions = analysis.mentioned_competitors.map((name) => {
      // Try to find matching competitor ID by name (case-insensitive)
      for (const [key, id] of competitorMap.entries()) {
        if (key.toLowerCase() === name.toLowerCase()) {
          return { name: key, id };
        }
      }
      return { name, id: null };
    });

    // Update competitor map with normalized names from analysis
    for (const { name, id } of normalizedMentions) {
      if (id) {
        competitorMap.set(name.toLowerCase(), id);
        competitorMap.set(name, id);
      }
    }

    // Also normalize competitor sentiments and attributes
    const normalizedCompetitorSentiments = analysis.competitor_sentiments.map((cs) => {
      for (const [key, id] of competitorMap.entries()) {
        if (key.toLowerCase() === cs.competitor.toLowerCase()) {
          return { ...cs, competitor: key, competitorId: id };
        }
      }
      return { ...cs, competitorId: null };
    });

    const normalizedCompetitorAttributes = analysis.competitor_attributes.map((ca) => {
      for (const [key, id] of competitorMap.entries()) {
        if (key.toLowerCase() === ca.competitor.toLowerCase()) {
          return { ...ca, competitor: key, competitorId: id };
        }
      }
      return { ...ca, competitorId: null };
    });

    // Save brand mentions
    const mentionsSaved = await saveBrandMentions(
      supabase,
      aiResponseId,
      projectId,
      responseText,
      brandName,
      {
        ...analysis,
        mentioned_competitors: normalizedMentions.filter((m) => m.id).map((m) => m.name),
      },
      competitorMap
    );

    // Save sentiment attributes
    const sentimentSaved = await saveSentimentAttributes(
      supabase,
      aiResponseId,
      projectId,
      responseText,
      brandName,
      {
        ...analysis,
        competitor_sentiments: normalizedCompetitorSentiments
          .filter((cs) => cs.competitorId)
          .map(({ competitorId, ...rest }) => rest),
        competitor_attributes: normalizedCompetitorAttributes
          .filter((ca) => ca.competitorId)
          .map(({ competitorId, ...rest }) => rest),
      },
      competitorMap
    );

    // Save potential competitors
    const potentialCompetitorsSaved = await savePotentialCompetitors(
      supabase,
      projectId,
      aiResponseId,
      responseText,
      analysis.other_brands_detected
    );

    return {
      mentionsSaved,
      sentimentSaved,
      potentialCompetitorsSaved,
    };
  } catch (error: any) {
    logError('brand-storage', 'Error saving brand analysis', error);
    return {
      mentionsSaved: 0,
      sentimentSaved: 0,
      potentialCompetitorsSaved: 0,
    };
  }
}


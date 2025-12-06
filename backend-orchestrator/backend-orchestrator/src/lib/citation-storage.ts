// =============================================
// CITATION STORAGE
// =============================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CitationData } from './types';
import { logInfo, logError } from './utils';

/**
 * Save structured citations to the citations table
 * 
 * @param supabase - Supabase client
 * @param aiResponseId - ID of the AI response
 * @param citationsData - Array of citation data to save
 * @returns Number of citations saved
 */
export async function saveCitations(
  supabase: SupabaseClient,
  aiResponseId: string,
  citationsData: CitationData[]
): Promise<number> {
  logInfo('citation-storage', `Attempting to save citations for ai_response_id: ${aiResponseId}`, {
    totalCitations: citationsData?.length || 0
  });

  if (!citationsData || citationsData.length === 0) {
    logInfo('citation-storage', 'No citations to save');
    return 0;
  }

  try {
    // Filter citations: must have url or uri
    const validCitations = citationsData.filter(citation => {
      const hasUrlOrUri = !!(citation.url || citation.uri);
      if (!hasUrlOrUri) {
        logInfo('citation-storage', 'Skipping citation (no url/uri)', {
          citation: {
            web_search_query: citation.web_search_query,
            domain: citation.domain,
            start_index: citation.start_index,
            end_index: citation.end_index
          }
        });
      }
      return hasUrlOrUri;
    });

    logInfo('citation-storage', `Filtered citations: ${validCitations.length} valid out of ${citationsData.length} total`);

    if (validCitations.length === 0) {
      logInfo('citation-storage', 'No valid citations (missing url/uri)', {
        sampleCitation: citationsData[0]
      });
      return 0;
    }

    // Prepare records for insertion
    const records = validCitations.map(citation => ({
      ai_response_id: aiResponseId,
      web_search_query: citation.web_search_query || null,
      // If uri is missing, backfill with url to avoid nulls for OpenAI citations
      uri: citation.uri || citation.url || null,
      url: citation.url || citation.uri || null,
      domain: citation.domain || null,
      start_index: citation.start_index ?? null,
      end_index: citation.end_index ?? null,
      text: citation.text || null,
      metadata: citation.metadata || {},
    }));

    logInfo('citation-storage', `Prepared ${records.length} records for insertion`, {
      sampleRecord: records[0],
      aiResponseId
    });

    // Insert citations
    const { data, error } = await supabase
      .from('citations')
      .insert(records)
      .select('id');

    if (error) {
      logError('citation-storage', 'Failed to save citations', error);
      throw error;
    }

    logInfo('citation-storage', `Saved ${data?.length || 0} citations for ai_response_id: ${aiResponseId}`);
    return data?.length || 0;

  } catch (error) {
    logError('citation-storage', 'Error saving citations', error);
    throw error;
  }
}


// =============================================
// CITATION STORAGE
// =============================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CitationData } from './types';
import { logInfo, logError } from './utils';

// =============================================
// TYPES
// =============================================

type CitationType = 'brand' | 'competitor' | 'other';

interface CitationClassification {
  type: CitationType;
  competitorId: string | null;
}

interface CompetitorInfo {
  id: string;
  domain: string;
}

// Deduplicated citation with combined text fragments
interface DeduplicatedCitation {
  web_search_query: string | null;
  uri: string;
  url: string;
  domain: string | null;
  text_fragments: string[];
  start_indices: number[];
  end_indices: number[];
  occurrence_count: number;
  metadata: Record<string, any>;
}

// =============================================
// HELPER: NORMALIZE DOMAIN
// =============================================

/**
 * Normalize a domain or URL by removing protocol and www prefix
 * @param urlOrDomain - URL or domain to normalize
 * @returns Normalized domain (lowercase, no protocol, no www)
 */
function normalizeDomain(urlOrDomain: string | null | undefined): string | null {
  if (!urlOrDomain) return null;
  
  try {
    let domain = urlOrDomain.toLowerCase();
    
    // Remove protocol (http:// or https://)
    domain = domain.replace(/^https?:\/\//, '');
    
    // Remove www. prefix
    domain = domain.replace(/^www\./, '');
    
    // Remove trailing path
    domain = domain.split('/')[0];
    
    // Remove port if present
    domain = domain.split(':')[0];
    
    return domain || null;
  } catch {
    return null;
  }
}

// =============================================
// HELPER: NORMALIZE URI (for deduplication)
// =============================================

/**
 * Normalize a URI/URL for deduplication purposes
 * @param urlOrUri - URL or URI to normalize
 * @returns Normalized URI (lowercase, consistent format)
 */
function normalizeUri(urlOrUri: string | null | undefined): string | null {
  if (!urlOrUri) return null;
  
  try {
    let uri = urlOrUri.toLowerCase().trim();
    
    // Remove protocol
    uri = uri.replace(/^https?:\/\//, '');
    
    // Remove www. prefix
    uri = uri.replace(/^www\./, '');
    
    // Remove trailing slash
    uri = uri.replace(/\/$/, '');
    
    // Remove fragment (hash)
    uri = uri.split('#')[0];
    
    return uri || null;
  } catch {
    return null;
  }
}

// =============================================
// HELPER: DEDUPLICATE CITATIONS BY URI
// =============================================

/**
 * Deduplicate citations by URI, combining text fragments from duplicates
 * @param citations - Array of citation data
 * @returns Array of deduplicated citations with combined text
 */
function deduplicateCitations(citations: CitationData[]): DeduplicatedCitation[] {
  const uriMap = new Map<string, DeduplicatedCitation>();
  
  for (const citation of citations) {
    const normalizedUri = normalizeUri(citation.url || citation.uri);
    if (!normalizedUri) continue;
    
    if (uriMap.has(normalizedUri)) {
      // Combine with existing entry
      const existing = uriMap.get(normalizedUri)!;
      
      if (citation.text && !existing.text_fragments.includes(citation.text)) {
        existing.text_fragments.push(citation.text);
      }
      
      if (citation.start_index != null) {
        existing.start_indices.push(citation.start_index);
        existing.end_indices.push(citation.end_index ?? 0);
      }
      
      existing.occurrence_count++;
      
      // Merge metadata
      if (citation.metadata) {
        existing.metadata = { ...existing.metadata, ...citation.metadata };
      }
    } else {
      // First occurrence - create new entry
      uriMap.set(normalizedUri, {
        web_search_query: citation.web_search_query || null,
        uri: citation.uri || citation.url || '',
        url: citation.url || citation.uri || '',
        domain: citation.domain || null,
        text_fragments: citation.text ? [citation.text] : [],
        start_indices: citation.start_index != null ? [citation.start_index] : [],
        end_indices: citation.end_index != null ? [citation.end_index] : [],
        occurrence_count: 1,
        metadata: citation.metadata || {}
      });
    }
  }
  
  return Array.from(uriMap.values());
}

// =============================================
// HELPER: CLASSIFY CITATION
// =============================================

/**
 * Classify a citation based on its domain
 * @param domain - Domain of the citation
 * @param brandDomain - Normalized brand domain from project
 * @param competitors - Array of competitors with their domains
 * @returns Classification result with type and optional competitor ID
 */
function classifyCitation(
  domain: string | null,
  brandDomain: string | null,
  competitors: CompetitorInfo[]
): CitationClassification {
  // If no domain, cannot classify
  if (!domain) {
    return { type: 'other', competitorId: null };
  }
  
  const normalizedCitationDomain = normalizeDomain(domain);
  
  if (!normalizedCitationDomain) {
    return { type: 'other', competitorId: null };
  }
  
  // Check if it matches the brand domain
  if (brandDomain && normalizedCitationDomain === brandDomain) {
    return { type: 'brand', competitorId: null };
  }
  
  // Check if it matches any competitor domain
  for (const competitor of competitors) {
    const normalizedCompetitorDomain = normalizeDomain(competitor.domain);
    if (normalizedCompetitorDomain && normalizedCitationDomain === normalizedCompetitorDomain) {
      return { type: 'competitor', competitorId: competitor.id };
    }
  }
  
  // Default to 'other'
  return { type: 'other', competitorId: null };
}

// =============================================
// HELPER: GET PROJECT AND COMPETITORS INFO
// =============================================

/**
 * Fetch project's brand domain and active competitors
 */
async function getClassificationContext(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ brandDomain: string | null; competitors: CompetitorInfo[] }> {
  // Fetch project's client_url for brand domain
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('client_url')
    .eq('id', projectId)
    .single();
  
  if (projectError) {
    logError('citation-storage', 'Failed to fetch project for classification', projectError);
  }
  
  const brandDomain = normalizeDomain(project?.client_url);
  
  // Fetch active competitors and their domains
  const { data: competitors, error: competitorsError } = await supabase
    .from('competitors')
    .select('id, domain')
    .eq('project_id', projectId)
    .eq('is_active', true);
  
  if (competitorsError) {
    logError('citation-storage', 'Failed to fetch competitors for classification', competitorsError);
  }
  
  return {
    brandDomain,
    competitors: (competitors || []).filter(c => c.domain) as CompetitorInfo[]
  };
}

// =============================================
// MAIN: SAVE CITATIONS
// =============================================

/**
 * Save structured citations to the citations table with classification
 * 
 * @param supabase - Supabase client
 * @param aiResponseId - ID of the AI response
 * @param projectId - ID of the project (required for classification)
 * @param citationsData - Array of citation data to save
 * @returns Number of citations saved
 */
export async function saveCitations(
  supabase: SupabaseClient,
  aiResponseId: string,
  projectId: string,
  citationsData: CitationData[]
): Promise<number> {
  logInfo('citation-storage', `Attempting to save citations for ai_response_id: ${aiResponseId}`, {
    totalCitations: citationsData?.length || 0,
    projectId
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

    // Deduplicate citations by URI (combines text fragments from same source)
    const deduplicatedCitations = deduplicateCitations(validCitations);
    
    logInfo('citation-storage', `Deduplicated: ${validCitations.length} -> ${deduplicatedCitations.length} unique URIs`);

    // Get classification context (brand domain and competitors)
    const { brandDomain, competitors } = await getClassificationContext(supabase, projectId);
    
    logInfo('citation-storage', 'Classification context loaded', {
      brandDomain,
      competitorsCount: competitors.length
    });

    // Prepare records for insertion with classification
    const records = deduplicatedCitations.map(citation => {
      // Classify the citation based on domain
      const classification = classifyCitation(
        citation.domain || normalizeDomain(citation.url || citation.uri),
        brandDomain,
        competitors
      );
      
      // Combine text fragments with separator
      const combinedText = citation.text_fragments.length > 0
        ? citation.text_fragments.join(' [...] ')
        : null;
      
      return {
        ai_response_id: aiResponseId,
        project_id: projectId,
        web_search_query: citation.web_search_query || null,
        uri: citation.uri || null,
        url: citation.url || null,
        domain: citation.domain || null,
        // Use first indices
        start_index: citation.start_indices[0] ?? null,
        end_index: citation.end_indices[0] ?? null,
        // Combined text from all occurrences
        text: combinedText,
        // Enhanced metadata with occurrence info
        metadata: {
          ...citation.metadata,
          occurrence_count: citation.occurrence_count,
          all_text_fragments: citation.text_fragments.length > 1 ? citation.text_fragments : undefined,
          all_indices: citation.start_indices.length > 1 
            ? citation.start_indices.map((s, i) => ({ start: s, end: citation.end_indices[i] }))
            : undefined
        },
        // Classification fields
        citation_type: classification.type,
        competitor_id: classification.competitorId,
      };
    });

    // Log classification summary
    const classificationSummary = {
      brand: records.filter(r => r.citation_type === 'brand').length,
      competitor: records.filter(r => r.citation_type === 'competitor').length,
      other: records.filter(r => r.citation_type === 'other').length,
    };
    
    logInfo('citation-storage', `Prepared ${records.length} records for insertion`, {
      sampleRecord: records[0],
      aiResponseId,
      classificationSummary
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

    logInfo('citation-storage', `Saved ${data?.length || 0} citations for ai_response_id: ${aiResponseId}`, {
      classificationSummary
    });
    
    return data?.length || 0;

  } catch (error) {
    logError('citation-storage', 'Error saving citations', error);
    throw error;
  }
}

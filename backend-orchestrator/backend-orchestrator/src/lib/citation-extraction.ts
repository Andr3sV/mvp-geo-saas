// =============================================
// CITATION EXTRACTION FROM AI API RESPONSES
// =============================================

import type { CitationData } from './types';
import { logInfo, logError } from './utils';

// =============================================
// GEMINI CITATION EXTRACTION
// =============================================

/**
 * Extract structured citations from Gemini API response
 * Implements Option A: One row per fragment+source combination
 * 
 * @param geminiResponse - Raw response from Gemini API
 * @returns Array of CitationData objects
 */
export function extractGeminiCitations(geminiResponse: any): CitationData[] {
  const citations: CitationData[] = [];
  
  try {
    const candidate = geminiResponse.candidates?.[0];
    if (!candidate) {
      logInfo('citation-extraction', 'No candidates found in Gemini response');
      return citations;
    }

    const groundingMetadata = candidate.groundingMetadata;
    if (!groundingMetadata) {
      logInfo('citation-extraction', 'No groundingMetadata found in Gemini response');
      return citations;
    }

    const groundingChunks = groundingMetadata.groundingChunks || [];
    const groundingSupports = groundingMetadata.groundingSupports || [];
    const webSearchQueries = groundingMetadata.webSearchQueries || [];

    logInfo('citation-extraction', `Found ${groundingChunks.length} chunks, ${groundingSupports.length} supports, ${webSearchQueries.length} queries`);

    // Extract citations: one row per fragment+source combination (Option A)
    for (const support of groundingSupports) {
      const segment = support.segment;
      const chunkIndices = support.groundingChunkIndices || [];

      if (!segment || !chunkIndices.length) {
        continue;
      }

      const startIndex = segment.startIndex;
      const endIndex = segment.endIndex;
      const segmentText = segment.text;

      // For each source that supports this segment, create a citation
      for (const chunkIndex of chunkIndices) {
        const chunk = groundingChunks[chunkIndex];
        if (!chunk?.web) {
          continue;
        }

        const uri = chunk.web.uri;
        const title = chunk.web.title;

        // Skip if no URI or title
        if (!uri && !title) {
          logInfo('citation-extraction', 'Skipping chunk (no uri or title)', {
            chunkIndex,
            hasUri: !!uri,
            hasTitle: !!title
          });
          continue;
        }

        // Transform URI to URL if needed
        const url = transformGeminiUriToUrl(uri, title);
        
        logInfo('citation-extraction', 'Transformed Gemini URI to URL', {
          chunkIndex,
          originalUri: uri,
          originalTitle: title,
          transformedUrl: url
        });

        // Extract domain from title or URL
        const domain = extractDomainFromTitleOrUrl(title, url);

        // Use first web search query (or most relevant one)
        const webSearchQuery = webSearchQueries[0] || null;

        // Only add if we have at least url or uri
        if (!url && !uri) {
          logInfo('citation-extraction', 'Skipping citation (no url or uri after transformation)', {
            chunkIndex,
            originalUri: uri,
            originalTitle: title
          });
          continue;
        }

        const citation: CitationData = {
          web_search_query: webSearchQuery || undefined,
          uri: uri || undefined,
          url: url || undefined,
          domain: domain || undefined,
          start_index: startIndex,
          end_index: endIndex,
          text: segmentText,
          metadata: {
            chunk_index: chunkIndex,
            platform: 'gemini',
          },
        };

        logInfo('citation-extraction', 'Adding Gemini citation', {
          chunkIndex,
          hasUrl: !!citation.url,
          hasUri: !!citation.uri,
          domain: citation.domain,
          startIndex: citation.start_index,
          endIndex: citation.end_index
        });

        citations.push(citation);
      }
    }

    logInfo('citation-extraction', `Extracted ${citations.length} citations from Gemini response`);
    return citations;

  } catch (error) {
    logError('citation-extraction', 'Failed to extract Gemini citations', error);
    return citations;
  }
}

/**
 * Transform Gemini Vertex URI to real URL
 * If URI contains vertexaisearch, use title to construct URL
 */
function transformGeminiUriToUrl(uri: string | undefined, title: string | undefined): string | undefined {
  if (!uri) {
    return undefined;
  }

  // If URI is already a real URL, return it
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    // Check if it's a Vertex URI
    if (uri.includes('vertexaisearch.cloud.google.com')) {
      // Try to construct URL from title
      if (title) {
        const cleanTitle = title.trim();
        if (cleanTitle && !cleanTitle.startsWith('http')) {
          return `https://${cleanTitle}`;
        }
        return cleanTitle;
      }
      return undefined; // Can't transform without title
    }
    return uri; // Already a real URL
  }

  // If no http prefix but we have a title, construct URL
  if (title) {
    const cleanTitle = title.trim();
    if (cleanTitle && !cleanTitle.startsWith('http')) {
      return `https://${cleanTitle}`;
    }
    return cleanTitle;
  }

  return undefined;
}

/**
 * Extract domain from title or URL
 */
function extractDomainFromTitleOrUrl(title: string | undefined, url: string | undefined): string | undefined {
  // Try to extract from URL first
  if (url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      // If URL parsing fails, try to extract from string
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
      if (match && match[1]) {
        return match[1].replace('www.', '');
      }
    }
  }

  // Fallback to title
  if (title) {
    const cleanTitle = title.trim();
    // Remove http/https if present
    const withoutProtocol = cleanTitle.replace(/^https?:\/\//, '');
    // Extract domain part
    const domain = withoutProtocol.split('/')[0].replace('www.', '');
    return domain;
  }

  return undefined;
}

// =============================================
// OPENAI CITATION EXTRACTION
// =============================================

/**
 * Extract structured citations from OpenAI API response
 * Supports both Responses API and Chat Completions API with web search models
 * 
 * @param openaiResponse - Raw response from OpenAI API
 * @param responseText - The text content of the response
 * @returns Array of CitationData objects
 */
export function extractOpenAICitations(openaiResponse: any, responseText: string): CitationData[] {
  const citations: CitationData[] = [];

  try {
    // Try Responses API structure first (output items)
    const outputItems = openaiResponse.output || [];
    
    if (outputItems.length > 0) {
      // Responses API format
      logInfo('citation-extraction', 'Processing OpenAI Responses API format', {
        outputItemsCount: outputItems.length
      });

      // First, extract and sanitize web search queries from web_search_call items
      // According to OpenAI docs: web_search_call.action contains action (search, open_page, find_in_page)
      // and search actions may include query and domains
      const webSearchQueries: string[] = [];

      // Sanitizer: decode Unicode escapes, remove surrounding quotes, strip "Note:" and everything after
      const sanitizeQuery = (q?: string) => {
        if (!q || typeof q !== 'string') return undefined;
        
        // Decode Unicode escape sequences (e.g., \u00bf -> ¿, \u00e9 -> é)
        let s = q;
        try {
          // Replace Unicode escapes with actual characters
          s = s.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
            return String.fromCharCode(parseInt(code, 16));
          });
        } catch (e) {
          // If decoding fails, continue with original string
        }
        
        // Remove literal "\n\nNote:" and everything after (handles both escaped and actual newlines)
        // First check for literal string "\n\nNote:" (escaped newlines as text)
        const noteIndexEscaped = s.indexOf('\\n\\nNote:');
        if (noteIndexEscaped !== -1) {
          s = s.substring(0, noteIndexEscaped);
        } else {
          // Check for actual newlines "\n\nNote:"
          const noteIndex = s.toLowerCase().indexOf('\n\nnote:');
          if (noteIndex !== -1) {
            s = s.substring(0, noteIndex);
          } else {
            // Also check for "Note:" on same line
            const noteIndexInline = s.toLowerCase().indexOf(' note:');
            if (noteIndexInline !== -1) {
              s = s.substring(0, noteIndexInline);
            }
          }
        }
        
        s = s.trim();
        
        // Remove surrounding quotes
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
          s = s.slice(1, -1);
        }
        
        // Remove trailing notes in parentheses or brackets
        s = s.replace(/\s*[\(\[].*[\)\]]\s*$/, '').trim();
        
        return s || undefined;
      };

      for (const item of outputItems) {
        if (item.type === 'web_search_call') {
          logInfo('citation-extraction', 'Found web_search_call item', {
            itemId: item.id,
            status: item.status,
            hasAction: !!item.action,
            actionType: item.action?.action,
            actionKeys: item.action ? Object.keys(item.action) : []
          });

          // Check if action exists and is an object with query property
          if (item.action && typeof item.action === 'object') {
            // action.action can be 'search', 'open_page', or 'find_in_page'
            if (item.action.action === 'search' && item.action.query) {
              const sanitized = sanitizeQuery(item.action.query);
              if (sanitized) webSearchQueries.push(sanitized);
            }
            // Also check if query is directly in action object
            if (item.action.query && !webSearchQueries.includes(item.action.query)) {
              const sanitized = sanitizeQuery(item.action.query);
              if (sanitized && !webSearchQueries.includes(sanitized)) {
                webSearchQueries.push(sanitized);
              }
            }
          }
          // Also check if query is directly in the item (fallback)
          if (item.query && !webSearchQueries.includes(item.query)) {
            const sanitized = sanitizeQuery(item.query);
            if (sanitized && !webSearchQueries.includes(sanitized)) {
              webSearchQueries.push(sanitized);
            }
          }
        }
      }

      logInfo('citation-extraction', `Found ${webSearchQueries.length} web search queries`, {
        queries: webSearchQueries
      });

      // Extract citations from message output items
      let messageItemsFound = 0;
      let messageItemsWithAnnotations = 0;
      for (const item of outputItems) {
        if (item.type === 'message' && item.content) {
          messageItemsFound++;
          for (const content of item.content) {
            if (content.type === 'output_text') {
              if (content.annotations) {
                messageItemsWithAnnotations++;
                const annotations = content.annotations || [];
                
                logInfo('citation-extraction', `Found ${annotations.length} annotations in message`, {
                  messageId: item.id,
                  textLength: content.text?.length || 0
                });

                for (const annotation of annotations) {
                  if (annotation.type === 'url_citation') {
                    const startIndex = annotation.start_index;
                    const endIndex = annotation.end_index;
                    const url = annotation.url;
                    const title = annotation.title;

                    // Skip if no URL
                    if (!url) {
                      logInfo('citation-extraction', 'Skipping annotation (no URL)', { annotation });
                      continue;
                    }

                    // Extract text fragment using indices
                    const text = startIndex !== undefined && endIndex !== undefined 
                      ? responseText.substring(startIndex, endIndex)
                      : undefined;

                    // Extract domain from URL
                    const domain = extractDomainFromTitleOrUrl(title, url);

                    const citation: CitationData = {
                      url: url,
                      domain: domain || undefined,
                      start_index: startIndex,
                      end_index: endIndex,
                      text: text || undefined,
                      web_search_query: webSearchQueries[0] || undefined,
                      metadata: {
                        title: title || undefined,
                        platform: 'openai',
                        api_type: 'responses',
                      },
                    };

                    logInfo('citation-extraction', 'Adding OpenAI citation', {
                      url: citation.url,
                      domain: citation.domain,
                      startIndex: citation.start_index,
                      endIndex: citation.end_index
                    });

                    citations.push(citation);
                  } else {
                    logInfo('citation-extraction', 'Skipping annotation (not url_citation type)', {
                      type: annotation.type
                    });
                  }
                }
              } else {
                logInfo('citation-extraction', 'Message has output_text but no annotations', {
                  messageId: item.id,
                  textLength: content.text?.length || 0
                });
              }
            }
          }
        }
      }
      
      logInfo('citation-extraction', `OpenAI Responses API citation extraction summary`, {
        totalOutputItems: outputItems.length,
        messageItemsFound,
        messageItemsWithAnnotations,
        citationsExtracted: citations.length,
        webSearchQueriesFound: webSearchQueries.length
      });
    } else {
      // Chat Completions API format (web search models like gpt-4o-search-preview)
      // Check if message has citations in content
      const message = openaiResponse.choices?.[0]?.message;
      if (message?.content) {
        // Web search models may include citations in the content or in a separate field
        // Check for citations in message
        if (message.citations) {
          // If citations are directly in the message
          for (const citation of message.citations) {
            if (citation.url) {
              const domain = extractDomainFromTitleOrUrl(citation.title, citation.url);
              citations.push({
                url: citation.url,
                domain: domain || undefined,
                start_index: citation.start_index,
                end_index: citation.end_index,
                text: citation.text || responseText.substring(citation.start_index || 0, citation.end_index || 0),
                metadata: {
                  title: citation.title || undefined,
                  platform: 'openai',
                  api_type: 'chat_completions',
                },
              });
            }
          }
        }
        
        // Also check for annotations in message if available
        if (message.annotations) {
          for (const annotation of message.annotations) {
            if (annotation.type === 'url_citation') {
              const startIndex = annotation.start_index;
              const endIndex = annotation.end_index;
              const url = annotation.url;
              const title = annotation.title;

              if (!url) continue;

              const text = responseText.substring(startIndex || 0, endIndex || 0);
              const domain = extractDomainFromTitleOrUrl(title, url);

              citations.push({
                url: url,
                domain: domain || undefined,
                start_index: startIndex,
                end_index: endIndex,
                text: text || undefined,
                metadata: {
                  title: title || undefined,
                  platform: 'openai',
                  api_type: 'chat_completions',
                },
              });
            }
          }
        }
      }
    }

    logInfo('citation-extraction', `Extracted ${citations.length} citations from OpenAI response`, {
      responseType: outputItems.length > 0 ? 'responses_api' : 'chat_completions',
      hasOutput: !!openaiResponse.output,
      hasChoices: !!openaiResponse.choices
    });
    return citations;

  } catch (error) {
    logError('citation-extraction', 'Failed to extract OpenAI citations', error);
    return citations;
  }
}


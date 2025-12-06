// =============================================
// RATE LIMITER FOR AI PLATFORMS
// =============================================

import type { AIProvider } from './types';
import { logInfo, logError } from './utils';

// Rate limits per platform (requests per minute)
// Based on official API documentation shared by user
export const RATE_LIMITS: Record<AIProvider, { rpm: number; tpm?: number }> = {
  openai: { 
    rpm: 5000, // OpenAI models: 5,000 RPM (from rate limits page)
    tpm: 450000 // Token limit varies by model
  },
  gemini: { 
    rpm: 10, // Gemini 2.0 Flash Exp: 10 RPM (Free tier) - matches error message
    tpm: 250000
  },
  claude: { 
    rpm: 50, // Claude Tier 1: 50 RPM
    tpm: 30000
  },
  perplexity: { 
    rpm: 50, // Perplexity Tier 0: 50 RPM for most models
    tpm: undefined
  },
};

// Track request timestamps per platform (in-memory)
// Note: This works per instance. For distributed systems, use Redis/DB
const requestTimestamps: Record<AIProvider, number[]> = {
  openai: [],
  gemini: [],
  claude: [],
  perplexity: [],
};

// Clean up old timestamps (older than 1 minute)
function cleanupOldTimestamps(platform: AIProvider) {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  requestTimestamps[platform] = requestTimestamps[platform].filter(
    timestamp => timestamp > oneMinuteAgo
  );
}

/**
 * Wait if necessary to respect rate limits
 * Returns the delay in milliseconds that was applied (if any)
 */
export async function waitForRateLimit(platform: AIProvider): Promise<number> {
  cleanupOldTimestamps(platform);
  
  const limits = RATE_LIMITS[platform];
  const currentRequests = requestTimestamps[platform].length;
  
  // If we're under the limit, add this request and proceed
  if (currentRequests < limits.rpm) {
    requestTimestamps[platform].push(Date.now());
    return 0;
  }
  
  // We're at the limit, calculate how long to wait
  const oldestRequest = Math.min(...requestTimestamps[platform]);
  const timeSinceOldest = Date.now() - oldestRequest;
  const waitTime = Math.max(0, 60000 - timeSinceOldest + 1000); // Add 1 second buffer
  
  if (waitTime > 0) {
    logInfo('rate-limiter', `Rate limit reached for ${platform}. Waiting ${Math.round(waitTime / 1000)}s`, {
      platform,
      currentRequests,
      limit: limits.rpm,
      waitTimeMs: waitTime
    });
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Clean up and add this request after waiting
    cleanupOldTimestamps(platform);
    requestTimestamps[platform].push(Date.now());
    
    return waitTime;
  }
  
  // Shouldn't reach here, but just in case
  requestTimestamps[platform].push(Date.now());
  return 0;
}

/**
 * Get current request count for a platform in the last minute
 */
export function getCurrentRequestCount(platform: AIProvider): number {
  cleanupOldTimestamps(platform);
  return requestTimestamps[platform].length;
}

/**
 * Get remaining requests available for a platform in the current window
 */
export function getRemainingRequests(platform: AIProvider): number {
  const limits = RATE_LIMITS[platform];
  const current = getCurrentRequestCount(platform);
  return Math.max(0, limits.rpm - current);
}


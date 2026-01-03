import { createSupabaseClient, logInfo, logError } from './utils';

export interface SentimentTheme {
  id: string;
  project_id: string;
  name: string;
  type: 'positive' | 'negative';
  created_at: string;
  updated_at: string;
}

/**
 * Validate theme name according to rules:
 * - Maximum 2 words (to align with "less than 3 words" requirement)
 * - No repeated consecutive words
 * - No brand names
 * - Valid characters only (letters, numbers, spaces, hyphens, ampersands)
 * - Maximum 100 characters
 */
export function validateThemeName(
  themeName: string,
  entityName?: string,
  maxWords: number = 4
): { valid: boolean; cleaned?: string; error?: string } {
  // Trim and normalize whitespace
  let cleaned = themeName.trim().replace(/\s+/g, ' ');

  // Check if empty
  if (!cleaned || cleaned.length === 0) {
    return { valid: false, error: 'Theme name is empty' };
  }

  // Check maximum length (chars)
  if (cleaned.length > 100) {
    return { valid: false, error: 'Theme name exceeds maximum length (100 characters)' };
  }

  // Split into words
  const words = cleaned.split(/\s+/);

  // Check maximum word count
  if (words.length > maxWords) {
    return { valid: false, error: `Theme name exceeds maximum word count (${maxWords} words)` };
  }

  // Check for repeated consecutive words (e.g., "Beer Beer Beer")
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i].toLowerCase() === words[i + 1].toLowerCase()) {
      return { valid: false, error: 'Theme name contains repeated words' };
    }
  }

  // Check for brand name (if entity name provided)
  if (entityName) {
    const entityWords = entityName.toLowerCase().split(/\s+/);
    const themeLower = cleaned.toLowerCase();

    // Check if any significant word from entity name appears in theme
    for (const entityWord of entityWords) {
      if (entityWord.length > 4 && themeLower.includes(entityWord)) {
        return { valid: false, error: 'Theme name contains brand name' };
      }
    }
  }

  // Check for invalid characters (allow letters, numbers, spaces, hyphens, ampersands)
  if (!/^[a-zA-Z0-9\s\-&]+$/.test(cleaned)) {
    return { valid: false, error: 'Theme name contains invalid characters' };
  }

  return { valid: true, cleaned };
}

/**
 * Get themes for a project, optionally filtered by type
 */
export async function getThemesByProject(
  projectId: string,
  type?: 'positive' | 'negative'
): Promise<SentimentTheme[]> {
  const supabase = createSupabaseClient();

  let query = supabase
    .from('sentiment_themes')
    .select('*')
    .eq('project_id', projectId)
    .order('name', { ascending: true });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    logError('getThemesByProject', `Failed to fetch themes for project ${projectId}`, error);
    return [];
  }

  return (data || []) as SentimentTheme[];
}

/**
 * Create a new theme with uniqueness check
 */
export async function createTheme(
  projectId: string,
  name: string,
  type: 'positive' | 'negative'
): Promise<SentimentTheme | null> {
  const supabase = createSupabaseClient();

  // Normalize theme name: trim, lowercase for comparison, but store original
  const normalizedName = name.trim();

  const { data, error } = await supabase
    .from('sentiment_themes')
    .insert({
      project_id: projectId,
      name: normalizedName,
      type,
    })
    .select()
    .single();

  if (error) {
    // If it's a unique constraint violation, the theme already exists
    if (error.code === '23505') {
      logInfo('createTheme', `Theme "${normalizedName}" already exists for project ${projectId}, fetching existing`);
      return await getThemeByName(projectId, normalizedName, type);
    }
    logError('createTheme', `Failed to create theme "${normalizedName}" for project ${projectId}`, error);
    return null;
  }

  return data as SentimentTheme;
}

/**
 * Get a theme by name (case-insensitive, exact match)
 */
async function getThemeByName(
  projectId: string,
  name: string,
  type: 'positive' | 'negative'
): Promise<SentimentTheme | null> {
  const supabase = createSupabaseClient();
  const normalizedName = name.trim();

  // Fetch all themes for the project and type, then match case-insensitively
  const { data, error } = await supabase
    .from('sentiment_themes')
    .select('*')
    .eq('project_id', projectId)
    .eq('type', type);

  if (error) {
    logError('getThemeByName', `Failed to fetch themes for project ${projectId}`, error);
    return null;
  }

  // Case-insensitive exact match
  const matched = (data || []).find(
    (theme) => theme.name.trim().toLowerCase() === normalizedName.toLowerCase()
  );

  return matched ? (matched as SentimentTheme) : null;
}

/**
 * Get existing theme or create new one (handles race conditions)
 * Uses case-insensitive matching for theme names
 * Validates theme name before creating to reject invalid themes
 */
export async function getOrCreateTheme(
  projectId: string,
  name: string,
  type: 'positive' | 'negative',
  entityName?: string
): Promise<SentimentTheme | null> {
  const normalizedName = name.trim();

  // Validate theme name before processing
  const validation = validateThemeName(normalizedName, entityName, 2);
  if (!validation.valid) {
    logError('getOrCreateTheme', `Invalid theme name rejected: "${normalizedName}"`, {
      projectId,
      error: validation.error,
      type,
      entityName,
    });
    return null; // Reject invalid theme
  }

  // Use cleaned name from validation
  const cleanedName = validation.cleaned || normalizedName;

  // First, try to find existing theme (case-insensitive)
  const existing = await getThemeByName(projectId, cleanedName, type);
  if (existing) {
    return existing;
  }

  // If not found, create new theme
  // Handle race condition: if another process creates it between check and insert,
  // the insert will fail with unique constraint, so we fetch it
  const created = await createTheme(projectId, cleanedName, type);
  if (created) {
    return created;
  }

  // If creation failed (not due to uniqueness), try fetching one more time
  return await getThemeByName(projectId, cleanedName, type);
}


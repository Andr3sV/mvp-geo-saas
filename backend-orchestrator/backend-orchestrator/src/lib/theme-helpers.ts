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
 */
export async function getOrCreateTheme(
  projectId: string,
  name: string,
  type: 'positive' | 'negative'
): Promise<SentimentTheme | null> {
  const normalizedName = name.trim();

  // First, try to find existing theme (case-insensitive)
  const existing = await getThemeByName(projectId, normalizedName, type);
  if (existing) {
    return existing;
  }

  // If not found, create new theme
  // Handle race condition: if another process creates it between check and insert,
  // the insert will fail with unique constraint, so we fetch it
  const created = await createTheme(projectId, normalizedName, type);
  if (created) {
    return created;
  }

  // If creation failed (not due to uniqueness), try fetching one more time
  return await getThemeByName(projectId, normalizedName, type);
}


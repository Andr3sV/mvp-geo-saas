// Types for Ateneai MVP

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  workspace_id: string;
  client_url?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  created_at: string;
}

export interface Citation {
  id: string;
  project_id: string;
  platform: 'chatgpt' | 'gemini' | 'anthropic' | 'perplexity';
  query: string;
  brand_mention: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
  context: string;
  detected_at: string;
  created_at: string;
}

export interface PromptTracking {
  id: string;
  project_id: string;
  prompt: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Dashboard Analytics Types
export interface CitationStats {
  total_citations: number;
  trend: number; // percentage change
  by_platform: {
    chatgpt: number;
    gemini: number;
    anthropic: number;
    perplexity: number;
  };
}

export interface ShareOfVoice {
  brand_name: string;
  percentage: number;
  total_mentions: number;
  competitors: Array<{
    name: string;
    percentage: number;
    mentions: number;
  }>;
}

export interface SentimentAnalysis {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}


-- =============================================
-- MIGRATION: Create Citations Table
-- Description: Table for storing all web search citations from AI responses
-- Date: 2025-12-06
-- =============================================

-- =============================================
-- TABLE: citations
-- Description: Stores all citations from web search, capturing complete metadata
-- from Gemini (groundingMetadata) and OpenAI (annotations) APIs
-- =============================================
CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_response_id UUID NOT NULL REFERENCES ai_responses(id) ON DELETE CASCADE,
  
  -- Web search query usado
  web_search_query TEXT,
  
  -- URLs y URIs
  uri TEXT, -- URI original de Vertex (Gemini) o similar
  url TEXT, -- URL real después de transformar URI si es necesario
  domain TEXT, -- Dominio extraído del title (Gemini) o URL
  
  -- Posición en el texto
  start_index INTEGER, -- Índice de inicio del fragmento citado
  end_index INTEGER,   -- Índice de fin del fragmento citado
  text TEXT,           -- Fragmento de texto citado (opcional)
  
  -- Metadatos adicionales
  metadata JSONB DEFAULT '{}'::jsonb, -- Para datos adicionales específicos de la plataforma
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_citations_ai_response ON citations(ai_response_id);
CREATE INDEX idx_citations_domain ON citations(domain);
CREATE INDEX idx_citations_url ON citations(url);
CREATE INDEX idx_citations_created_at ON citations(created_at DESC);

-- =============================================
-- TRIGGER: Update updated_at timestamp
-- =============================================

CREATE OR REPLACE FUNCTION update_citations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_citations_updated_at
  BEFORE UPDATE ON citations
  FOR EACH ROW
  EXECUTE FUNCTION update_citations_updated_at();

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE citations ENABLE ROW LEVEL SECURITY;

-- Policy: Project members can view citations
DROP POLICY IF EXISTS "Project members can view citations" ON citations;
CREATE POLICY "Project members can view citations"
ON citations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    INNER JOIN ai_responses ar ON ar.project_id = pm.project_id
    WHERE pm.user_id = auth.uid()
    AND ar.id = citations.ai_response_id
  )
);

-- Policy: Service role can insert citations
DROP POLICY IF EXISTS "Service role can insert citations" ON citations;
CREATE POLICY "Service role can insert citations"
ON citations
FOR INSERT
WITH CHECK (true); -- Service role bypasses RLS

-- Policy: Service role can update citations
DROP POLICY IF EXISTS "Service role can update citations" ON citations;
CREATE POLICY "Service role can update citations"
ON citations
FOR UPDATE
USING (true)
WITH CHECK (true);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE citations IS 'Stores all web search citations from AI responses with complete metadata';
COMMENT ON COLUMN citations.uri IS 'Original URI from Vertex (Gemini) or similar source';
COMMENT ON COLUMN citations.url IS 'Real URL after transforming URI if needed';
COMMENT ON COLUMN citations.domain IS 'Domain extracted from title (Gemini) or URL';
COMMENT ON COLUMN citations.start_index IS 'Start index of cited text fragment in response';
COMMENT ON COLUMN citations.end_index IS 'End index of cited text fragment in response';
COMMENT ON COLUMN citations.text IS 'Text fragment that was cited (optional)';
COMMENT ON COLUMN citations.web_search_query IS 'Web search query used to find this citation';


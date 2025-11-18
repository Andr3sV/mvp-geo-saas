# 🔗 Citation Tracking System - Technical Documentation

## Overview

This MVP implements **real citation tracking** with URLs from AI platforms that support web search. This provides **accurate GEO (Generative Engine Optimization)** metrics based on actual sources cited by AI models.

---

## 📊 **Platform Support Matrix**

| Platform | Web Search | Citations with URLs | Status | Use Case |
|----------|-----------|---------------------|--------|----------|
| **Perplexity** | ✅ Native | ✅ Yes | 🟢 **RECOMMENDED** | **Citation Tracking** |
| **Gemini** | ✅ Google Search | ✅ Yes | 🟢 **RECOMMENDED** | **Citation Tracking** |
| **OpenAI** | ❌ No* | ❌ No | 🟡 Planned | Share of Voice only |
| **Claude** | ❌ No | ❌ No | 🔵 Active | Share of Voice only |

\* *OpenAI web search is in beta and not yet implemented*

---

## 🎯 **How It Works**

### 1. **AI Models with Web Search**

#### Perplexity (`sonar-pro`)
- **Native web search** built into the model
- Returns `citations` array with URLs in API response
- Best for: Real-time web citations

**API Configuration:**
```typescript
{
  model: "sonar-pro",
  return_citations: true,
  search_domain_filter: [] // Search all domains
}
```

#### Gemini (`gemini-2.0-flash-exp`)
- **Google Search Grounding** via `googleSearchRetrieval` tool
- Returns URLs in `groundingMetadata.groundingChunks`
- Best for: High-authority Google-indexed sources

**API Configuration:**
```typescript
{
  model: "gemini-2.0-flash-exp",
  tools: [
    {
      googleSearchRetrieval: {
        dynamicRetrievalConfig: {
          mode: "MODE_DYNAMIC",
          dynamicThreshold: 0.3
        }
      }
    }
  ]
}
```

### 2. **Citation Extraction Process**

```
┌─────────────────────────────────────────────────────────┐
│ 1. User Runs Analysis                                   │
│    → Prompt sent to Perplexity & Gemini               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. AI Response with URLs                                │
│    {                                                    │
│      text: "Nike is a leading brand...",               │
│      citations: [                                       │
│        "https://nike.com/about",                       │
│        "https://forbes.com/nike-analysis"              │
│      ]                                                  │
│    }                                                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Citation Processing (Edge Function)                  │
│    → Extract brand mentions from response text         │
│    → Associate URLs with mentions (round-robin)        │
│    → Extract domain from URL                           │
│    → Analyze sentiment                                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Save to Database                                     │
│    INSERT INTO citations_detail (                       │
│      citation_text,                                     │
│      cited_url,          ← URL from web search         │
│      cited_domain,       ← Domain extracted from URL   │
│      sentiment,                                         │
│      ...                                                │
│    )                                                    │
└─────────────────────────────────────────────────────────┘
```

### 3. **Database Schema**

```sql
-- citations_detail table
CREATE TABLE citations_detail (
  id UUID PRIMARY KEY,
  ai_response_id UUID REFERENCES ai_responses(id),
  project_id UUID REFERENCES projects(id),
  
  -- Citation details
  citation_text TEXT NOT NULL,
  context_before TEXT,
  context_after TEXT,
  position_in_response INTEGER,
  
  -- 🔗 NEW: URL tracking (only for models with web search)
  cited_url TEXT,        -- URL from web search (e.g., "https://nike.com/about")
  cited_domain TEXT,     -- Domain extracted (e.g., "nike.com")
  
  -- Analysis
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  is_direct_mention BOOLEAN,
  confidence_score DECIMAL(3, 2),
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4. **Citation Tracking Page Filters**

**Important:** Citation Tracking page **only shows citations with URLs** (`cited_url IS NOT NULL`).

```typescript
// ❌ OLD (shows all mentions, even without URLs)
supabase
  .from("citations_detail")
  .select("*")
  .eq("project_id", projectId);

// ✅ NEW (only real citations with URLs)
supabase
  .from("citations_detail")
  .select("*")
  .eq("project_id", projectId)
  .not("cited_url", "is", null); // Filter for web search citations only
```

---

## 📈 **Dashboard Metrics**

### **Citation Tracking Page**
Shows **only** citations from models with web search (Perplexity, Gemini).

**Metrics:**
- ✅ Total Citation Pages (AI responses with URLs)
- ✅ My Pages Cited (Total citations with URLs)
- ✅ Domains Mentioning Me (Platforms citing with URLs)
- ✅ Your Domain Rating (Sentiment-based authority)

**Charts:**
- ✅ Citations Over Time (citations with URLs)
- ✅ Citation DR Breakdown (by platform with web search)
- ✅ Most Cited Domains (platforms providing citations)
- ✅ Top Performing Pages (prompts generating citations)
- ✅ Competitive Topic Analysis (citations by category)

### **Share of Voice Page**
Shows **all** brand mentions across **all** platforms (including Claude and OpenAI).

**Metrics:**
- ✅ Your Share % (Brand vs. Competitors)
- ✅ Market Position (Ranking)
- ✅ Competitors Tracked

---

## 🚀 **API Keys Required**

To enable citation tracking, you need API keys for platforms with web search:

```bash
# .env.local (Next.js frontend)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Supabase Edge Functions (set in dashboard)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PERPLEXITY_API_KEY=your_perplexity_key  # ✅ Required for citations
GEMINI_API_KEY=your_gemini_key          # ✅ Required for citations
OPENAI_API_KEY=your_openai_key          # Optional (no web search yet)
CLAUDE_API_KEY=your_claude_key          # Optional (no web search)
```

---

## 🔧 **Testing the System**

### Step 1: Create a Project
1. Go to Dashboard
2. Create Project → Enter client name and URL
3. Add Competitors (optional)

### Step 2: Add Prompts
1. Go to Prompt Management
2. Click "Add Prompt"
3. Enter a prompt like: *"What are the best athletic shoe brands?"*
4. Select category and region

### Step 3: Run Analysis
1. Click "Run Analysis" on prompt
2. Select **Perplexity** and **Gemini** (platforms with web search)
3. Wait for analysis to complete (~30 seconds)

### Step 4: View Results
1. Go to **Citation Tracking** → See real citations with URLs
2. Go to **Share of Voice** → See all mentions (with/without URLs)

### Expected Results:
- **Citation Tracking**: Only shows data from Perplexity & Gemini
- **Share of Voice**: Shows data from all platforms
- **URLs**: Visible in database (`citations_detail.cited_url`)

---

## 📝 **Future Enhancements**

### Phase 1 (Current MVP)
- ✅ Perplexity web search + citations
- ✅ Gemini Google Search grounding + citations
- ✅ Citation Tracking page (URL-based)
- ✅ Share of Voice (all mentions)

### Phase 2 (Next Iteration)
- ⏳ OpenAI web search (when available)
- ⏳ Advanced URL-to-mention matching (parse markdown links)
- ⏳ Citation quality scoring
- ⏳ Backlink-style citation tracking

### Phase 3 (Advanced)
- ⏳ Real-time citation monitoring
- ⏳ Citation alerts & notifications
- ⏳ Domain authority integration (Ahrefs/SEMrush)
- ⏳ Citation velocity tracking

---

## 🐛 **Troubleshooting**

### "No citations showing in Citation Tracking"
**Cause:** Only Perplexity and Gemini provide URLs. If you only ran analysis with OpenAI or Claude, no citations will appear.

**Fix:** Run analysis again with Perplexity and/or Gemini selected.

### "Share of Voice shows data, but Citation Tracking is empty"
**Expected:** Share of Voice counts **all mentions** (with/without URLs). Citation Tracking only shows **citations with URLs**.

**Action:** This is correct behavior. To see citation data, run analysis with Perplexity or Gemini.

### "Gemini returning no citations"
**Cause:** Gemini's grounding may not find relevant sources for the prompt.

**Fix:** 
- Try more specific prompts
- Lower `dynamicThreshold` in API config
- Check if prompt is too broad or niche

---

## 📚 **Key Files**

| File | Purpose |
|------|---------|
| `supabase/functions/shared/ai-clients.ts` | AI API integrations with web search |
| `supabase/functions/analyze-prompt/index.ts` | Citation extraction and URL processing |
| `src/lib/queries/citations-real.ts` | Database queries (filtered by `cited_url`) |
| `src/app/(dashboard)/dashboard/citations/page.tsx` | Citation Tracking UI |
| `src/lib/queries/share-of-voice.ts` | Share of Voice metrics (all mentions) |

---

## 🎓 **Best Practices**

1. **Use Perplexity for real-time citations** - It's the fastest and most reliable.
2. **Use Gemini for high-authority sources** - Google Search grounding provides quality links.
3. **Run both for comprehensive coverage** - Different sources = better insights.
4. **Don't rely on OpenAI/Claude for citations** - They don't support web search yet.
5. **Monitor "Share of Voice" for brand awareness** - Even without URLs, mentions matter.

---

**Built with:**
- Next.js 14+
- Supabase (Postgres + Edge Functions)
- Perplexity AI API
- Google Gemini API

---

**Questions?** Check the inline comments in the code or ask your team! 🚀


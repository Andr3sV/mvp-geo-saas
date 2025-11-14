# Ateneai - Generative Engine Optimization Platform

A modern SaaS platform for tracking and optimizing brand presence in AI-generated responses across ChatGPT, Gemini, Claude, and Perplexity.

## 🚀 Tech Stack

- **Frontend**: Next.js 14+ (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend/BaaS**: Supabase (Auth, Database, Storage)
- **AI Integration**: OpenAI API
- **Deployment**: Vercel
- **Development**: Local development on port 3055

## 📦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mvp-geo-saas
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Then update `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3055](http://localhost:3055) in your browser.

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Dashboard routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components
│   └── features/          # Feature-specific components
├── lib/                   # Utilities and configurations
│   ├── supabase/          # Supabase clients (client, server, middleware)
│   ├── actions/           # Server actions
│   ├── auth.ts            # Auth helpers
│   └── utils.ts           # Helper functions
├── types/                 # TypeScript type definitions
├── config/                # App configuration
└── hooks/                 # Custom React hooks
```

## 🎯 Core Features

- **Citation Tracking**: Monitor brand mentions in AI responses
- **Share of Voice**: Compare against competitors
- **Platform Breakdown**: Track across ChatGPT, Gemini, Claude, Perplexity
- **Sentiment Analysis**: Understand mention context
- **Query Patterns**: Discover citation-generating questions
- **Trending Queries**: Real-time query trend analysis

## 🔐 Architecture

### Multi-tenancy Model

- **Workspace**: Top-level organization
- **Projects**: Multiple projects per workspace
- **Users**: Role-based access at workspace and project levels

### User Roles

- **Workspace**: Owner, Admin, Member
- **Project**: Admin, Member, Viewer

## 📝 Development Roadmap

- [x] Phase 0: Initial Setup
- [x] Phase 1: Database & Authentication
- [x] Phase 2: Onboarding Flow
- [x] Phase 3: Dashboard Layout
- [x] Phase 4: Project & User Management
- [ ] Phase 5: Core Features (Part 1)
- [ ] Phase 6: Core Features (Part 2)
- [ ] Phase 7: AI Integration
- [ ] Phase 8: Deployment & Optimization

## 🤝 Contributing

This is an MVP project. Development follows a phased approach with approval gates between phases.

## 📄 License

Proprietary - All rights reserved

---

Built with ❤️ for the future of Generative Engine Optimization

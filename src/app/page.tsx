import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-semibold">
            Ateneai
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl">
            Optimize Your Brand for
            <span className="block text-primary">AI-Generated Responses</span>
          </h1>
          <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
            Track citations, analyze sentiment, and dominate share of voice across ChatGPT, Gemini, Claude, and Perplexity.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Citation Tracking"
            description="Monitor how often your brand appears in AI responses"
          />
          <FeatureCard
            title="Share of Voice"
            description="Compare your mentions vs competitors"
          />
          <FeatureCard
            title="Platform Breakdown"
            description="Track performance across all major AI platforms"
          />
          <FeatureCard
            title="Sentiment Analysis"
            description="Understand the context of your brand mentions"
          />
          <FeatureCard
            title="Query Patterns"
            description="Discover what questions generate citations"
          />
          <FeatureCard
            title="Trending Queries"
            description="Stay ahead with real-time query trends"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 Ateneai. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border p-6">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

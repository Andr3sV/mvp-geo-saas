import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Layers, Heart, Search, Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="bg-black border-b border-gray-800">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/ateneai-log.png"
              alt="Ateneai"
              width={128}
              height={34}
              className="h-[34px] w-auto"
            />
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:bg-gray-800 hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-white text-black hover:bg-gray-200">
                Sign Up
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-20">
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
          </div>
        </div>

        {/* Features Grid */}
        <div className="mx-auto mt-20 mb-32 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Citation Tracking"
            description="Monitor how often your brand appears in AI responses"
            icon={BarChart3}
          />
          <FeatureCard
            title="Share of Voice"
            description="Compare your mentions vs competitors"
            icon={TrendingUp}
          />
          <FeatureCard
            title="Platform Breakdown"
            description="Track performance across all major AI platforms"
            icon={Layers}
          />
          <FeatureCard
            title="Sentiment Analysis"
            description="Understand the context of your brand mentions"
            icon={Heart}
          />
          <FeatureCard
            title="Query Patterns"
            description="Discover what questions generate citations"
            icon={Search}
          />
          <FeatureCard
            title="Trending Queries"
            description="Stay ahead with real-time query trends"
            icon={Activity}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="text-sm text-muted-foreground">
              © 2025 Ateneai. All rights reserved.
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Política de privacidad
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Condiciones de uso
              </Link>
              <Link href="/cookies" className="hover:text-foreground transition-colors">
                Política de cookies
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  title, 
  description, 
  icon: Icon 
}: { 
  title: string; 
  description: string; 
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border p-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

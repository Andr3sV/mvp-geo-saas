import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  BarChart3, 
  TrendingUp, 
  Layers, 
  Heart, 
  Search, 
  Activity,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Zap,
  Shield,
  Globe
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative h-8 w-8">
              <Image
                src="/ateneaiicon.svg"
                alt="Ateneai"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xl font-semibold">Ateneai</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Sign In
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
          <div className="flex items-center gap-4 md:hidden">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        {/* Background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#C2C2E1]/20 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(194,194,225,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(194,194,225,0.2),transparent_50%)]" />
        
        <div className="container relative mx-auto px-4 pt-24 pb-32 md:pt-32 md:pb-40">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <Badge variant="secondary" className="mb-6 gap-2 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Powered by AI</span>
            </Badge>

            {/* Main Heading */}
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Dominate AI-Generated
              <span className="block bg-gradient-to-r from-[#C2C2E1] to-[#8B8BC4] bg-clip-text text-transparent">
                Responses
              </span>
            </h1>

            <p className="mb-8 text-lg text-muted-foreground sm:text-xl md:mx-auto md:max-w-2xl">
              Track citations, analyze sentiment, and optimize your brand presence across 
              ChatGPT, Gemini, Claude, and Perplexity.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="group w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">
              Features
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Everything you need to
              <span className="block text-[#C2C2E1]">optimize your brand</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Comprehensive tools to track, analyze, and improve your presence in AI responses
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Citation Tracking"
              description="Monitor how often your brand appears in AI responses across all major platforms"
              icon={BarChart3}
              gradient="from-blue-500/10 to-purple-500/10"
            />
            <FeatureCard
              title="Share of Voice"
              description="Compare your mentions against competitors to understand market position"
              icon={TrendingUp}
              gradient="from-purple-500/10 to-pink-500/10"
            />
            <FeatureCard
              title="Platform Breakdown"
              description="Track performance metrics across ChatGPT, Gemini, Claude, and Perplexity"
              icon={Layers}
              gradient="from-pink-500/10 to-orange-500/10"
            />
            <FeatureCard
              title="Sentiment Analysis"
              description="AI-powered sentiment analysis to understand brand perception and context"
              icon={Heart}
              gradient="from-orange-500/10 to-red-500/10"
            />
            <FeatureCard
              title="Query Patterns"
              description="Discover what questions generate citations and optimize your content strategy"
              icon={Search}
              gradient="from-red-500/10 to-rose-500/10"
            />
            <FeatureCard
              title="Trending Queries"
              description="Stay ahead with real-time query trends and emerging opportunities"
              icon={Activity}
              gradient="from-rose-500/10 to-pink-500/10"
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="border-y bg-gradient-to-b from-[#C2C2E1]/10 to-transparent py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-12 md:grid-cols-3">
              <BenefitCard
                icon={Zap}
                title="Lightning Fast"
                description="Real-time tracking and instant notifications when your brand is mentioned"
              />
              <BenefitCard
                icon={Shield}
                title="Secure & Private"
                description="Enterprise-grade security to protect your data and brand information"
              />
              <BenefitCard
                icon={Globe}
                title="Multi-Platform"
                description="Track across all major AI platforms from a single unified dashboard"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <Card className="border-2 bg-gradient-to-br from-[#C2C2E1]/20 via-background to-background">
            <CardContent className="px-6 py-16 text-center md:px-12">
              <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Ready to get started?
              </h2>
              <p className="mb-8 mx-auto max-w-2xl text-lg text-muted-foreground">
                Join leading brands optimizing their presence in AI-generated responses
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/register">
                  <Button size="lg" className="group w-full sm:w-auto">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="relative h-6 w-6">
                  <Image
                    src="/ateneaiicon.svg"
                    alt="Ateneai"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="font-semibold">Ateneai</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Optimize your brand for AI-generated responses
              </p>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#features" className="hover:text-foreground transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-foreground transition-colors">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/contact" className="hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="hover:text-foreground transition-colors">
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Ateneai. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon: Icon,
  gradient,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}) {
  return (
    <Card className="group relative overflow-hidden border transition-all hover:shadow-lg">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity group-hover:opacity-100`} />
      <CardContent className="relative p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#C2C2E1]/20">
        <Icon className="h-7 w-7 text-[#C2C2E1]" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

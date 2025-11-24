"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Zap,
  Shield,
  Globe
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import LogoLoop from "@/components/LogoLoop";
import GradualBlur from "@/components/GradualBlur";
import MagicBento from "@/components/MagicBento";

// Client logos data - only PNG files
const clientLogos = [
  {
    node: (
      <div className="flex items-center justify-center h-16 px-6 transition-all hover:opacity-80">
        <Image
          src="/logos-reputation/berruslogo.png"
          alt="Berrus"
          width={150}
          height={64}
          className="h-16 w-auto object-contain"
          quality={100}
          unoptimized
        />
      </div>
    ),
    title: "Berrus",
  },
  {
    node: (
      <div className="flex items-center justify-center h-16 px-6 transition-all hover:opacity-80">
        <Image
          src="/logos-reputation/cimslogo.png"
          alt="CIMS"
          width={200}
          height={64}
          className="h-16 w-auto object-contain"
          quality={100}
          unoptimized
        />
      </div>
    ),
    title: "CIMS",
  },
  {
    node: (
      <div className="flex items-center justify-center h-16 px-6 transition-all hover:opacity-80">
        <Image
          src="/logos-reputation/expofastlogo.png"
          alt="ExpoFast"
          width={200}
          height={64}
          className="h-16 w-auto object-contain"
          quality={100}
          unoptimized
        />
      </div>
    ),
    title: "ExpoFast",
  },
  {
    node: (
      <div className="flex items-center justify-center h-16 px-6 transition-all hover:opacity-80">
        <Image
          src="/logos-reputation/primeplayerslogo.png"
          alt="Prime Players"
          width={150}
          height={32}
          className="h-8 w-auto object-contain block"
          quality={100}
          unoptimized
        />
      </div>
    ),
    title: "Prime Players",
  },
  {
    node: (
      <div className="flex items-center justify-center h-16 px-6 transition-all hover:opacity-80">
        <Image
          src="/logos-reputation/ralogo.png"
          alt="RA"
          width={200}
          height={64}
          className="h-16 w-auto object-contain"
          quality={100}
          unoptimized
        />
      </div>
    ),
    title: "RA",
  },
  {
    node: (
      <div className="flex items-center justify-center h-16 px-6 transition-all hover:opacity-80">
        <Image
          src="/logos-reputation/simbiosialogo.png"
          alt="Simbiosia"
          width={200}
          height={32}
          className="h-8 w-auto object-contain block"
          quality={100}
          unoptimized
        />
      </div>
    ),
    title: "Simbiosia",
  },
];

export default function Home() {
  const brands = ["Gemini", "OpenAI", "Claude", "Perplexity"];
  const [currentBrandIndex, setCurrentBrandIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBrandIndex((prevIndex) => (prevIndex + 1) % brands.length);
    }, 1800); // Change every 1.8 seconds (faster)

    return () => clearInterval(interval);
  }, [brands.length]);

  return (
    <div className="flex min-h-screen flex-col relative">
      {/* Background gradients - applied to entire page */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#C2C2E1]/20 via-background to-background" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(194,194,225,0.3),transparent_50%)]" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_70%_80%,rgba(194,194,225,0.2),transparent_50%)]" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur border-b border-gray-200/50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative h-8 w-8">
        <Image
                src="/ateneaiiconblack.png"
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
      <section className="relative overflow-hidden">
        <div className="container relative mx-auto px-4 pt-24 pb-16 md:pt-32 md:pb-20">
          <div className="mx-auto max-w-4xl text-center">
            {/* Main Heading */}
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Become the brand everyone is talking about on
              <br />
              <span className="inline-block relative overflow-hidden h-[1.2em] align-middle">
                {" "}
                <AnimatePresence mode="wait">
                  <motion.span
                    key={brands[currentBrandIndex]}
                    initial={{ 
                      opacity: 0, 
                      filter: "blur(8px)"
                    }}
                    animate={{ 
                      opacity: 1, 
                      filter: "blur(0px)"
                    }}
                    exit={{ 
                      opacity: 0, 
                      filter: "blur(8px)"
                    }}
                    transition={{ 
                      duration: 0.5,
                      ease: "easeInOut"
                    }}
                    className="inline-block bg-gradient-to-r from-[#C2C2E1] via-[#A5A5D6] to-[#8B8BC4] bg-clip-text text-transparent"
                  >
                    {brands[currentBrandIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
          </h1>

            <p className="mb-8 text-lg text-muted-foreground sm:text-xl md:mx-auto md:max-w-2xl">
              Put your products in front of the millions who rely on AI to decide what to buy next
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

            {/* Logos Marquee with LogoLoop - Just below CTAs like Supabase */}
            <div className="mt-16 md:mt-20">
              <div style={{ minHeight: '100px', position: 'relative', overflow: 'visible', paddingTop: '10px', paddingBottom: '10px' }} className="flex items-center justify-center mb-4">
                {/* Overflow container to clip only horizontally, not vertically */}
                <div className="relative overflow-hidden mx-auto w-[70%] h-20">
                  <LogoLoop
                    logos={clientLogos}
                    speed={60}
                    direction="left"
                    logoHeight={64}
                    gap={48}
                    hoverSpeed={20}
                    scaleOnHover
                    fadeOut={false}
                    ariaLabel="Trusted by fast-growing companies worldwide"
                    width="100%"
                  />
                </div>
              </div>
              
              {/* Text below logos */}
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Trusted by fast-growing companies worldwide
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Magic Bento Section */}
      <section className="py-12 md:py-16 relative">
        <div className="container mx-auto px-4 max-w-[70rem]">
          <div className="mx-auto max-w-2xl text-center mb-16">
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
          <div className="flex flex-col items-center justify-center w-full">
            <MagicBento 
              textAutoHide={true}
              enableStars={true}
              enableSpotlight={true}
              enableBorderGlow={true}
              enableTilt={true}
              enableMagnetism={true}
              clickEffect={true}
              spotlightRadius={300}
              particleCount={12}
              glowColor="194, 194, 225"
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 md:py-16 relative">
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
      <section className="py-12 md:py-16">
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
      <footer className="relative py-12" style={{ overflow: 'visible' }}>
        {/* Gradual Blur at bottom of page */}
        <GradualBlur
          position="bottom"
          height="8rem"
          strength={2.5}
          divCount={6}
          curve="bezier"
          exponential={true}
          opacity={1}
          target="page"
        />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="relative h-6 w-6">
                  <Image
                    src="/ateneaiiconblack.png"
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

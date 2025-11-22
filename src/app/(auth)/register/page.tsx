"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Github } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        // Check if email confirmation is required
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          // User is authenticated, redirect to onboarding
          router.push("/onboarding");
          router.refresh();
        } else {
          // Email confirmation is required
          setError(
            "Please check your email to confirm your account. Click the confirmation link to continue."
          );
          setLoading(false);
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header with Logo */}
      <header className="absolute top-0 left-0 right-0 z-50 flex h-16 items-center px-6 lg:px-8">
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
      </header>

      <div className="flex min-h-screen">
        {/* Left Side - Registration Form */}
        <div className="flex w-full flex-col lg:w-1/2">
          {/* Form Container */}
          <div className="flex flex-1 items-center justify-center p-6 lg:p-12 pt-24">
            <div className="w-full max-w-md space-y-8">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
                <p className="text-muted-foreground">
                  Enter your information to get started with Ateneai
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                {error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters long
                  </p>
                </div>

                <Button type="submit" className="w-full h-11" size="lg" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>

              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                {/* Social Auth Buttons (Placeholder for future implementation) */}
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-11" disabled>
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </Button>
                  <Button variant="outline" className="h-11" disabled>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </Button>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-foreground hover:underline">
                  Sign in
                </Link>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By continuing, you agree to Ateneai's{" "}
                <Link href="/terms" className="underline hover:text-foreground">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline hover:text-foreground">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Marketing Section */}
        <div className="hidden lg:flex lg:w-1/2 lg:flex-col relative overflow-hidden bg-gradient-to-br from-[#C2C2E1]/20 via-[#C2C2E1]/10 to-background">
          {/* Background gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(194,194,225,0.3),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(194,194,225,0.2),transparent_50%)]" />
          
          <div className="relative z-10 flex flex-1 flex-col justify-center px-12 py-16">
            <div className="max-w-md space-y-8">
              {/* Testimonial */}
              <div className="space-y-6">
                <div className="text-8xl font-light text-muted-foreground/40 leading-none -mb-4">"</div>
                <blockquote className="text-xl font-medium leading-relaxed text-foreground">
                  We've seen a 40% increase in brand visibility across AI platforms since using Ateneai. The sentiment analysis feature alone has been game-changing for our marketing team.
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#C2C2E1] to-[#8B8BC4] flex items-center justify-center text-white font-semibold">
                    M
                  </div>
                  <div>
                    <p className="font-medium">Marcus Rodriguez</p>
                    <p className="text-sm text-muted-foreground">CMO @ GrowthLabs</p>
                  </div>
                </div>
              </div>

              {/* Simple CTA */}
              <div className="pt-6 border-t">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Join leading brands</h3>
                  <p className="text-sm text-muted-foreground">
                    Track citations, analyze sentiment, and optimize your presence across ChatGPT, Gemini, Claude, and Perplexity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

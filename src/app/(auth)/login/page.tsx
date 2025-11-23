"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        // If there's a redirect parameter, use it
        if (redirect) {
          router.push(redirect);
          router.refresh();
          return;
        }

        // Check if user has a workspace, if not redirect to onboarding
        const { data: workspaces } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", data.user.id)
          .limit(1);

        if (workspaces && workspaces.length > 0) {
          router.push("/dashboard");
        } else {
          router.push("/onboarding");
        }
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const redirectTo = redirect 
        ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
        : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // Note: User will be redirected to Google, so we don't need to handle success here
    } catch (err) {
      setError("An unexpected error occurred");
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
        {/* Left Side - Login Form */}
        <div className="flex w-full flex-col lg:w-1/2">
          {/* Form Container */}
          <div className="flex flex-1 items-center justify-center p-6 lg:p-12 pt-24">
            <div className="w-full max-w-md space-y-8">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
                <p className="text-muted-foreground">
                  Sign in to your account to continue
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                  </div>
                )}

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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <Button type="submit" className="w-full h-11" size="lg" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
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

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
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

              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/register" className="font-medium text-foreground hover:underline">
                  Sign up
                </Link>
              </div>
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
                  Ateneai has transformed how we track our brand in AI responses. The real-time insights helped us improve our SEO strategy and dominate search results across ChatGPT, Gemini, and Claude.
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#C2C2E1] to-[#8B8BC4] flex items-center justify-center text-white font-semibold">
                    S
                  </div>
                  <div>
                    <p className="font-medium">Sarah Chen</p>
                    <p className="text-sm text-muted-foreground">Head of Marketing @ TechCorp</p>
                  </div>
                </div>
              </div>

              {/* Simple CTA */}
              <div className="pt-6 border-t">
                <Link href="/register">
                  <Button size="lg" variant="outline" className="group w-full">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <p className="mt-3 text-xs text-center text-muted-foreground">
                  14-day free trial · No credit card required
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="text-center">
            <div className="mb-4 text-2xl font-bold">Sign in to Ateneai</div>
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

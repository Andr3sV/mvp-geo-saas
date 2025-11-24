"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function ThankYouPage() {
  return (
    <div className="flex min-h-screen flex-col relative">
      {/* Background gradients - same as home page */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#C2C2E1]/20 via-background to-background" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(194,194,225,0.3),transparent_50%)]" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_70%_80%,rgba(194,194,225,0.2),transparent_50%)]" />
      
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

      <div className="flex min-h-screen items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Thank You!</h1>
            <p className="text-lg text-muted-foreground">
              We've received your demo request. We'll get in touch with you shortly to coordinate a meeting.
            </p>
          </div>

          <div className="pt-4">
            <Link href="/" className="block mb-6">
              <Button size="lg" className="w-full">
                Return to Home
              </Button>
            </Link>
            <Link href="/register" className="block">
              <Button size="lg" variant="outline" className="w-full">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


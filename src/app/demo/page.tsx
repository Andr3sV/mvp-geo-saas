"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";

// List of common free email providers to block
const FREE_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'protonmail.com',
  'yandex.com',
  'zoho.com',
  'gmx.com',
  'live.com',
  'msn.com',
  'rediffmail.com',
  'mail.ru',
  'qq.com',
  '163.com',
  'sina.com',
  'naver.com',
  'daum.net'
];

function isCorporateEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  // Check if it's a free email provider
  if (FREE_EMAIL_DOMAINS.includes(domain)) {
    return false;
  }
  
  // Additional check: if it's a common TLD without a subdomain, it might be suspicious
  // But we'll allow it and let the business logic handle edge cases
  
  return true;
}

export default function DemoRequestPage() {
  const [name, setName] = useState("");
  const [brandWebsite, setBrandWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companySize, setCompanySize] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate corporate email
    if (!isCorporateEmail(email)) {
      setError("Please use a corporate email address. Free email providers (Gmail, Yahoo, etc.) are not allowed.");
      setLoading(false);
      return;
    }

    // Validate website URL format
    try {
      new URL(brandWebsite.startsWith('http') ? brandWebsite : `https://${brandWebsite}`);
    } catch {
      setError("Please enter a valid website URL (e.g., example.com or https://example.com)");
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from("demo_requests")
        .insert({
          name,
          brand_website: brandWebsite.startsWith('http') ? brandWebsite : `https://${brandWebsite}`,
          email,
          phone: phone || null,
          company_size: companySize,
        });

      if (insertError) {
        setError(insertError.message || "Failed to submit demo request. Please try again.");
        return;
      }

      // Redirect to thank you page
      router.push("/demo/thank-you");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
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
        {/* Left Side - Demo Request Form */}
        <div className="flex w-full flex-col lg:w-1/2">
          {/* Form Container */}
          <div className="flex flex-1 items-center justify-center p-6 lg:p-12 pt-24">
            <div className="w-full max-w-md space-y-8">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Request a Demo</h1>
                <p className="text-muted-foreground">
                  Fill out the form below and we'll get in touch shortly to coordinate a meeting.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
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
                  <Label htmlFor="brandWebsite">Brand Website *</Label>
                  <Input
                    id="brandWebsite"
                    type="text"
                    placeholder="example.com"
                    value={brandWebsite}
                    onChange={(e) => setBrandWebsite(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your brand's website URL (e.g., example.com)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Corporate Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Please use your corporate email address
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size *</Label>
                  <Select
                    value={companySize}
                    onValueChange={setCompanySize}
                    required
                    disabled={loading}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="501-1000">501-1000 employees</SelectItem>
                      <SelectItem value="1000+">1000+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full h-11" size="lg" disabled={loading}>
                  {loading ? "Submitting..." : "Request Demo"}
                </Button>
              </form>
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
                  See how Ateneai can transform your brand's presence across AI platforms. Our demo shows you exactly how to track citations, analyze sentiment, and optimize your visibility.
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#C2C2E1] to-[#8B8BC4] flex items-center justify-center text-white font-semibold">
                    M
                  </div>
                  <div>
                    <p className="font-medium">Marketing Team</p>
                    <p className="text-sm text-muted-foreground">Leading Brands Worldwide</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
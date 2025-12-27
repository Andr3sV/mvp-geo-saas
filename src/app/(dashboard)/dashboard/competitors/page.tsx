"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { CompetitorsManager } from "@/components/competitors/competitors-manager";
import { WelcomeTip } from "@/components/dashboard/welcome-tip";

export default function CompetitorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Competitor Management"
        description="Track and compare your brand against competitors across regions"
      />

      {/* Welcome Tip */}
      <WelcomeTip id="competitors">
        Manage the competitors you want to track across AI platforms. 
        Add competitors by region, assign custom colors for charts, and keep your competitive landscape organized. 
        The competitors you add here will appear in all comparison views throughout the dashboard.
      </WelcomeTip>

      <CompetitorsManager />
    </div>
  );
}

